import { SlashCommandBuilder } from "@discordjs/builders";
import { Interface } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import fetch from "node-fetch";

import abi from "../contracts/KeeperAccessControl.json";
import { checkStatus } from "../utils.js";

const getTransactions = async (
  address = "0x711A339c002386f9db409cA55b6A35a604aB6cF6",
  startBlock = 0
) => {
  const endpoint = "https://api.etherscan.io/api";
  const token = process.env.ETHERSCAN_TOKEN;
  const response = await fetch(
    `${endpoint}?module=account&action=txlist&sort=desc&address=${address}&startblock=${startBlock}&apikey=${token}`
  );

  try {
    checkStatus(response);
  } catch (error) {
    console.error(error);
    const errorBody = await error.response.text();
    console.error(`Error body: ${errorBody}`);
  }

  const data = await response.json();
  return data.result;
};

const getLastHarvestTimes = (
  txs,
  keeperAcl = "0x711A339c002386f9db409cA55b6A35a604aB6cF6"
) => {
  const iface = new Interface(abi);
  const times = {};
  for (const { to, input, timeStamp } of txs) {
    if (!to || !input || getAddress(to) != getAddress(keeperAcl)) {
      continue;
    }
    const { args, name } = iface.parseTransaction({ data: input });
    if (
      ["harvest", "harvestNoReturn"].includes(name) &&
      !(args.strategy in times)
    ) {
      times[args.strategy] = +timeStamp;
    }
  }
  return times;
};

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input to echo back")
      .setRequired(false)
  );

export const execute = async (interaction) => {
  const txs = await getTransactions();
  const times = getLastHarvestTimes(txs);
  console.log(times);
  await interaction.reply(interaction.options.getString("input") || "Pong!");
};
