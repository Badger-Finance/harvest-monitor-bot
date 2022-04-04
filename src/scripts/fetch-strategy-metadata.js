import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { JsonRpcProvider } from "@ethersproject/providers";

import { CHAIN_CONFIG, CHAIN_IDS, HARVEST_FNS } from "../constants.js";
import {
  getStrategyMetadata,
  getTransactions,
  isActiveStrategy,
  writeJson,
} from "../utils.js";

import keeperAccessControlAbi from "../contracts/KeeperAccessControl.json" assert { type: "json" };

const STRATEGY_METADATA_FILE = "./src/data/strategy-metadata.json";

const fetchStrategyMetadataForChain = async (txs, keeperAcl, provider) => {
  const strategyMetadata = {};
  const seen = new Set();
  const contract = new Contract(keeperAcl, keeperAccessControlAbi, provider);
  for (const { to, input } of txs) {
    if (!to || !input || getAddress(to) != getAddress(contract.address)) {
      continue;
    }
    const { args, name } = contract.interface.parseTransaction({
      data: input,
    });
    if (HARVEST_FNS.includes(name) && !seen.has(args.strategy)) {
      seen.add(args.strategy);
      if (await isActiveStrategy(args.strategy, provider)) {
        strategyMetadata[args.strategy] = await getStrategyMetadata(
          args.strategy,
          provider
        );
      }
    }
  }
  return strategyMetadata;
};

const fetchStrategyMetadataForChains = async (chainIds) => {
  const strategyMetadata = {};
  for (const chainId of chainIds) {
    const chainConfig = CHAIN_CONFIG[chainId];
    const provider = new JsonRpcProvider(chainConfig.rpc);

    const startBlock = Number.isFinite(chainConfig.lookbackBlocks)
      ? (await provider.getBlockNumber()) - chainConfig.lookbackBlocks
      : 0;
    const txs = await getTransactions(
      chainConfig.keeperAcl,
      chainId,
      startBlock
    );
    strategyMetadata[chainId] = await fetchStrategyMetadataForChain(
      txs,
      chainConfig.keeperAcl,
      provider
    );
  }
  return strategyMetadata;
};

const metadata = await fetchStrategyMetadataForChains(
  Object.values(CHAIN_IDS) // [CHAIN_IDS.ARBITRUM]
);
writeJson(STRATEGY_METADATA_FILE, metadata);
