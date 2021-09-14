import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { EtherscanProvider } from "@ethersproject/providers";

import { HARVEST_FNS, KEEPER_ACL } from "../constants.js";
import { getStrategyMetadata, getTransactions, writeJson } from "../utils.js";

import keeperAccessControlAbi from "../contracts/KeeperAccessControl.json";

const STRATEGY_METADATA_FILE = "./src/data/strategy-metadata.json";

const provider = new EtherscanProvider(null, process.env.ETHERSCAN_TOKEN);
const keeperAclContract = new Contract(
  KEEPER_ACL,
  keeperAccessControlAbi,
  provider
);

const fetchStrategyMetadata = async (txs, contract) => {
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
      strategyMetadata[args.strategy] = await getStrategyMetadata(
        args.strategy,
        provider
      );
    }
  }
  return strategyMetadata;
};

const txs = await getTransactions(keeperAclContract.address);
const metadata = await fetchStrategyMetadata(txs, keeperAclContract);
writeJson(STRATEGY_METADATA_FILE, metadata);
