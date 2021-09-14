import { codeBlock, bold, italic } from "@discordjs/builders";
import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { EtherscanProvider } from "@ethersproject/providers";
import AsciiTable from "ascii-table";

import { HARVEST_FNS, KEEPER_ACL } from "./constants.js";
import { formatMs, getStrategyMetadata, getTransactions } from "./utils.js";

import keeperAccessControlAbi from "./contracts/KeeperAccessControl.json";
import strategyMetadata from "./data/strategy-metadata.json";

const provider = new EtherscanProvider(null, process.env.ETHERSCAN_TOKEN);
const keeperAclContract = new Contract(
  KEEPER_ACL,
  keeperAccessControlAbi,
  provider
);

const getLatestHarvests = async (txs, contract) => {
  const strategyHarvests = [];
  const seen = new Set();
  for (const { to, input, timeStamp } of txs) {
    if (!to || !input || getAddress(to) != contract.address) {
      continue;
    }
    const { args, name } = contract.interface.parseTransaction({
      data: input,
    });
    if (HARVEST_FNS.includes(name) && !seen.has(args.strategy)) {
      seen.add(args.strategy);
      const now = new Date().getTime();
      if (!(args.strategy in strategyMetadata)) {
        strategyMetadata[args.strategy] = await getStrategyMetadata(
          args.strategy,
          provider
        );
      }
      strategyHarvests.push({
        vaultName: strategyMetadata[args.strategy].vaultName,
        strategy: args.strategy,
        timeSinceHarvest: formatMs(now - +timeStamp * 1000),
      });
    }
  }
  return strategyHarvests;
};

const toTable = (rows) => {
  const table = new AsciiTable();
  table.setHeading("Vault", "Strategy Address", "Last Harvest");
  for (const { vaultName, strategy, timeSinceHarvest } of rows) {
    table.addRow(vaultName, strategy, timeSinceHarvest);
  }
  return table.toString();
};

export const getHarvestTable = async () => {
  const txs = await getTransactions(keeperAclContract.address);
  const strategyHarvests = await getLatestHarvests(txs, keeperAclContract);
  const table = toTable(strategyHarvests);
  return (
    codeBlock(table) +
    `\n${bold(italic("Last Update:"))} ${italic(new Date().toUTCString())}\n`
  );
};
