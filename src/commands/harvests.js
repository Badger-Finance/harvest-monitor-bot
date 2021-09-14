import { codeBlock, SlashCommandBuilder } from "@discordjs/builders";
import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { EtherscanProvider } from "@ethersproject/providers";
import AsciiTable from "ascii-table";
import { fileURLToPath } from "url";

import { HARVEST_FNS, KEEPER_ACL } from "../constants.js";
import {
  formatMs,
  getFileName,
  getStrategyMetadata,
  getTransactions,
} from "../utils.js";

import keeperAccessControlAbi from "../contracts/KeeperAccessControl.json";
import strategyMetadata from "../data/strategy-metadata.json";

const __filename = fileURLToPath(import.meta.url);

const provider = new EtherscanProvider(null, process.env.ETHERSCAN_TOKEN);
const keeperAclContract = new Contract(
  KEEPER_ACL,
  keeperAccessControlAbi,
  provider
);

const getLatestHarvests = async (txs, contract) => {
  const strategies = [];
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
      strategies.push({
        vault: strategyMetadata[args.strategy].vault,
        timeSinceHarvest: formatMs(now - +timeStamp * 1000),
      });
    }
  }
  return strategies;
};

const toTable = (rows) => {
  const table = new AsciiTable();
  table.setHeading("Vault", "Time since Harvest");
  for (const { vault, timeSinceHarvest } of rows) {
    table.addRow(vault, timeSinceHarvest);
  }
  return table.toString();
};

export const execute = async (interaction) => {
  await interaction.deferReply();
  const txs = await getTransactions(keeperAclContract.address);
  const strategies = await getLatestHarvests(txs, keeperAclContract);
  const table = toTable(strategies);
  // console.log(table);
  await interaction.editReply(codeBlock(table));
};

export const data = new SlashCommandBuilder()
  .setName(getFileName(__filename))
  .setDescription("Fetch the last harvest times of Badger strategies");
// .addStringOption((option) =>
//   option
//     .setName("input")
//     .setDescription("The input to echo back")
//     .setRequired(false)
// );
