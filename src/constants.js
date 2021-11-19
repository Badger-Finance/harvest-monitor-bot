// Exchange interfaces
// TODO: Maybe load dynamically
import curvePoolAbi from "./contracts/CurvePool.json";
import uniswapV2PairAbi from "./contracts/UniswapV2Pair.json";
import uniswapV3PoolAbi from "./contracts/UniswapV3Pool.json";

// Discord variables
export const CLIENT_ID = "885785028058034246";
export const GUILD_ID = "785315893960900629";
export const CHANNEL_ID = "890654519938134057";

export const HARVEST_FNS = ["harvest", "harvestNoReturn"];

// Ideally enum
export const CHAIN_IDS = {
  MAINNET: 1,
  ARBITRUM: 42161,
};

export const CHAIN_CONFIG = {
  [CHAIN_IDS.MAINNET]: {
    chainId: CHAIN_IDS.MAINNET,
    name: "mainnet",
    displayName: "Ethereum",
    api: "https://api.etherscan.io/api",
    apiToken: process.env.ETHERSCAN_TOKEN,
    coingeckoId: "ethereum",
    keeperAcl: "0x711A339c002386f9db409cA55b6A35a604aB6cF6",
    lookbackBlocks: 64_000, // 10ish days
  },
  [CHAIN_IDS.ARBITRUM]: {
    chainId: CHAIN_IDS.ARBITRUM,
    name: "arbitrum",
    displayName: "Arbitrum",
    api: "https://api.arbiscan.io/api",
    apiToken: process.env.ETHERSCAN_TOKEN, // No arbiscan token yet
    coingeckoId: "arbitrum-one",
    keeperAcl: "0x265820f3779f652f2a9857133fdeaf115b87db4b",
  },
};

// Ideally enum
export const EXCHANGE_TYPES = {
  UNISWAP_V2: "UniswapV2",
  CURVE: "Curve",
  UNISWAP_V3: "UniswapV3",
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
};
