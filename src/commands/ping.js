import { SlashCommandBuilder } from "@discordjs/builders";
import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { EtherscanProvider } from "@ethersproject/providers";
import fetch from "node-fetch";

import BaseStrategyAbi from "../contracts/BaseStrategy.json";
import ControllerAbi from "../contracts/Controller.json";
import KeeperAccessControlAbi from "../contracts/KeeperAccessControl.json";
import SettV4Abi from "../contracts/SettV4.json";
import { checkStatus } from "../utils.js";

const KEEPER_ACL = "0x711A339c002386f9db409cA55b6A35a604aB6cF6";

const provider = new EtherscanProvider(null, process.env.ETHERSCAN_TOKEN);
const keeperAclContract = new Contract(
  KEEPER_ACL,
  KeeperAccessControlAbi,
  provider
);

const getTransactions = async (startBlock = 0) => {
  const endpoint = "https://api.etherscan.io/api";
  const token = process.env.ETHERSCAN_TOKEN;
  const response = await fetch(
    `${endpoint}?module=account&action=txlist&sort=desc&address=${keeperAclContract.address}&startblock=${startBlock}&apikey=${token}`
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

const getLatestHarvests = async (txs) => {
  const strategies = [];
  const seen = new Set();
  for (const { to, input, timeStamp } of txs) {
    if (!to || !input || getAddress(to) != keeperAclContract.address) {
      continue;
    }
    const { args, name } = keeperAclContract.interface.parseTransaction({
      data: input,
    });
    if (
      ["harvest", "harvestNoReturn"].includes(name) &&
      !seen.has(args.strategy)
    ) {
      seen.add(args.strategy);
      const strategyContract = new Contract(
        args.strategy,
        BaseStrategyAbi,
        provider
      );
      const controllerContract = new Contract(
        await strategyContract.controller(),
        ControllerAbi,
        provider
      );
      const vaultContract = new Contract(
        await controllerContract.vaults(await strategyContract.want()),
        SettV4Abi,
        provider
      );
      strategies.push({
        name: await strategyContract.getName(),
        vault: await vaultContract.name(),
        address: args.strategy,
        time: +timeStamp,
      });
    }
  }
  return strategies;
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
  await interaction.deferReply();
  const txs = await getTransactions();
  const strategies = await getLatestHarvests(txs);
  console.log(strategies);
  await interaction.editReply(
    interaction.options.getString("input") || "Pong!"
  );
};
