import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { EtherscanProvider } from "@ethersproject/providers";

import { HARVEST_FNS, KEEPER_ACL } from "../constants.js";
import { getTransactions, writeJson } from "../utils.js";

import baseStrategyAbi from "../contracts/BaseStrategy.json";
import controllerAbi from "../contracts/Controller.json";
import keeperAccessControlAbi from "../contracts/KeeperAccessControl.json";
import settV4Abi from "../contracts/SettV4.json";

const STRATEGY_METADATA_FILE = "./src/data/strategy-metadata.json";

const provider = new EtherscanProvider(null, process.env.ETHERSCAN_TOKEN);
const keeperAclContract = new Contract(
  KEEPER_ACL,
  keeperAccessControlAbi,
  provider
);

const getStrategyMetadata = async (txs, contract) => {
  const strategyMetadata = {};
  const seen = new Set();
  for (const { to, input } of txs) {
    if (!to || !input || getAddress(to) != contract.address) {
      continue;
    }
    const { args, name } = contract.interface.parseTransaction({
      data: input,
    });
    if (HARVEST_FNS.includes(name) && !seen.has(args.strategy)) {
      seen.add(args.strategy);
      const strategyContract = new Contract(
        args.strategy,
        baseStrategyAbi,
        provider
      );
      const controllerContract = new Contract(
        await strategyContract.controller(),
        controllerAbi,
        provider
      );
      const want = await strategyContract.want();
      const vaultContract = new Contract(
        await controllerContract.vaults(want),
        settV4Abi,
        provider
      );
      strategyMetadata[args.strategy] = {
        name: await strategyContract.getName(),
        vault: await vaultContract.name(),
        want,
      };
    }
  }
  return strategyMetadata;
};

const txs = await getTransactions(keeperAclContract.address);
const metadata = await getStrategyMetadata(txs, keeperAclContract);
writeJson(STRATEGY_METADATA_FILE, metadata);
