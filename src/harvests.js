import { codeBlock, bold, italic } from "@discordjs/builders";
import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import AsciiTable from "ascii-table";

import { CHAIN_CONFIG, HARVEST_FNS } from "./constants.js";
import { InfuraProvider } from "./providers.js";
import { formatMs, getStrategyMetadata, getTransactions } from "./utils.js";

import keeperAccessControlAbi from "./contracts/KeeperAccessControl.json";
import STRATEGY_METADATA from "./data/strategy-metadata.json";

const getLatestHarvests = async (
  txs,
  keeperAcl,
  provider,
  blacklistedStrategies,
  strategyMetadata = {}
) => {
  const strategyHarvests = [];
  const seen = new Set(blacklistedStrategies);
  const contract = new Contract(keeperAcl, keeperAccessControlAbi, provider);

  for (const { to, input, timeStamp } of txs) {
    if (!to || !input || getAddress(to) != getAddress(contract.address)) {
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
        timeSinceHarvest: formatMs(now - +timeStamp * 1000),
      });
    }
  }
  return strategyHarvests;
};

const toTable = (title, rows) => {
  const table = new AsciiTable(title);
  table.setHeading("Vault", "Last Harvest");
  for (const { vaultName, timeSinceHarvest } of rows) {
    table.addRow(vaultName, timeSinceHarvest);
  }
  return table.toString();
};

export const getHarvestTables = async (chainIds) => {
  const tables = await Promise.all(
    chainIds.map(async (chainId) => {
      const chainConfig = CHAIN_CONFIG[chainId];
      const provider = new InfuraProvider(
        {
          name: chainConfig.name,
          chainId,
        },
        process.env.INFURA_PROJECT_ID
      );

      const txs = await getTransactions(chainConfig.keeperAcl, chainId);
      const strategyHarvests = await getLatestHarvests(
        txs,
        chainConfig.keeperAcl,
        provider,
        chainConfig.blacklistedStrategies || [],
        STRATEGY_METADATA[chainId]
      );
      return codeBlock(toTable(chainConfig.displayName, strategyHarvests));
    })
  );
  return (
    tables.join("\n") +
    `\n${bold(italic("Last Update:"))} ${italic(new Date().toUTCString())}\n`
  );
};
