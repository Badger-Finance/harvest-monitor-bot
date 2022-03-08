// Exchange interfaces
// TODO: Maybe load dynamically
import curvePoolAbi from "./contracts/CurvePool.json" assert { type: "json" };
import solidlyV1PairAbi from "./contracts/SolidlyV1Pair.json" assert { type: "json" };
import uniswapV2PairAbi from "./contracts/UniswapV2Pair.json" assert { type: "json" };
import uniswapV3PoolAbi from "./contracts/UniswapV3Pool.json" assert { type: "json" };

// Discord variables
export const CLIENT_ID = "885785028058034246";
export const GUILD_ID = "785315893960900629";
export const CHANNEL_ID = "890654519938134057";

export const HARVEST_FNS = ["harvest", "harvestNoReturn"];

// Ideally enum
export const CHAIN_IDS = {
  ETHEREUM: 1,
  ARBITRUM: 42161,
  FANTOM: 250,
};

export const CHAIN_CONFIG = {
  [CHAIN_IDS.ETHEREUM]: {
    chainId: CHAIN_IDS.ETHEREUM,
    name: "ethereum",
    displayName: "Ethereum",
    api: "https://api.etherscan.io/api",
    apiToken: process.env.ETHERSCAN_TOKEN,
    keeperAcl: "0x711A339c002386f9db409cA55b6A35a604aB6cF6",
    blacklistedStrategies: ["0x05eC4356e1acd89CC2d16adC7415c8c95E736AC1"],
  },
  [CHAIN_IDS.ARBITRUM]: {
    chainId: CHAIN_IDS.ARBITRUM,
    name: "arbitrum",
    displayName: "Arbitrum",
    api: "https://api.arbiscan.io/api",
    apiToken: process.env.ETHERSCAN_TOKEN, // No arbiscan token yet
    keeperAcl: "0x265820f3779f652f2a9857133fdeaf115b87db4b",
  },
  [CHAIN_IDS.FANTOM]: {
    chainId: CHAIN_IDS.FANTOM,
    name: "fantom",
    displayName: "Fantom",
    api: "https://api.ftmscan.com/api",
    apiToken: process.env.FTMSCAN_TOKEN, // No arbiscan token yet
    keeperAcl: "0x0680b32b52C5ca8C731490c0C576337058f39337",
  },
};

// Ideally enum
export const EXCHANGE_TYPES = {
  UNISWAP_V2: "UniswapV2",
  CURVE: "Curve",
  UNISWAP_V3: "UniswapV3",
  SOLIDLY: "Solidly",
};

export const EXCHANGE_CONFIGS = {
  [EXCHANGE_TYPES.CURVE]: {
    abi: curvePoolAbi,
    swapEvent: "TokenExchange",
  },
  [EXCHANGE_TYPES.UNISWAP_V2]: {
    abi: uniswapV2PairAbi,
    swapEvent: "Swap",
  },
  [EXCHANGE_TYPES.UNISWAP_V3]: {
    abi: uniswapV3PoolAbi,
    swapEvent: "Swap",
  },
  [EXCHANGE_TYPES.SOLIDLY]: {
    abi: solidlyV1PairAbi,
    swapEvent: "Swap",
  },
};
