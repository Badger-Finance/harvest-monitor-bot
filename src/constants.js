// Discord variables
export const CLIENT_ID = "885785028058034246";
export const GUILD_ID = "785315893960900629";
export const CHANNEL_ID = "890654519938134057";

export const HARVEST_FNS = ["harvest", "harvestNoReturn"];

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
    keeperAcl: "0x711A339c002386f9db409cA55b6A35a604aB6cF6",
    blacklistedStrategies: [
      "0x05eC4356e1acd89CC2d16adC7415c8c95E736AC1", // tricrypto1
    ],
  },
  [CHAIN_IDS.ARBITRUM]: {
    chainId: CHAIN_IDS.ARBITRUM,
    name: "arbitrum",
    displayName: "Arbitrum",
    api: "https://api.arbiscan.io/api",
    apiToken: process.env.ETHERSCAN_TOKEN, // No arbiscan token yet
    keeperAcl: "0x265820f3779f652f2a9857133fdeaf115b87db4b",
  },
};
