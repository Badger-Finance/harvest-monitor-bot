import { Contract } from "@ethersproject/contracts";
import fs from "fs";
import fetch from "node-fetch";
import { basename, extname } from "path";

import {
  CHAIN_CONFIG,
  CHAIN_IDS,
  EXCHANGE_CONFIGS,
  EXCHANGE_TYPES,
} from "./constants.js";
import { HTTPResponseError, PriceNotFoundError } from "./errors.js";
import baseStrategyAbi from "./contracts/BaseStrategy.json" assert { type: "json" };
import controllerAbi from "./contracts/Controller.json" assert { type: "json" };
import erc20Abi from "./contracts/ERC20.json" assert { type: "json" };
import settV4Abi from "./contracts/SettV4.json" assert { type: "json" };
import vaultV1_5Abi from "./contracts/VaultV1_5.json" assert { type: "json" };
import strategyV1_5Abi from "./contracts/StrategyV1_5.json" assert { type: "json" };

export const getFileName = (fpath) => basename(fpath, extname(fpath));

const isObject = (obj) =>
  typeof obj === "object" && !Array.isArray(obj) && obj !== null;

export const sortObject = (obj) => {
  if (!isObject(obj)) {
    return obj;
  } else {
    return Object.keys(obj)
      .sort()
      .reduce((res, key) => {
        res[key] = sortObject(obj[key]);
        return res;
      }, {});
  }
};

export const writeJson = (fpath, obj, sort = true) => {
  if (sort) {
    obj = sortObject(obj);
  }
  fs.writeFile(fpath, JSON.stringify(obj, null, 2), (err) => {
    if (err) throw err;
  });
};

const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new HTTPResponseError(response);
  }

  return await response.json();
};

export const getTransactions = async (address, chainId, startBlock = 0) => {
  const endpoint = CHAIN_CONFIG[chainId].api;
  const token = CHAIN_CONFIG[chainId].apiToken;
  const query = `${endpoint}?module=account&action=txlist&sort=desc&address=${address}&startblock=${startBlock}&apikey=${token}`;

  try {
    const data = await fetchJson(query);
    return data.result;
  } catch (error) {
    if (error instanceof HTTPResponseError) {
      console.error(error);
      const errorBody = await error.response.text();
      console.error(`Error body: ${errorBody}`);
    } else {
      throw error;
    }
  }
};

export const getTokenPrice = async (address, chainId, currency = "usd") => {
  const endpoint = "https://api.badger.com/v2/prices";
  const query = `${endpoint}?chain=${CHAIN_CONFIG[chainId].name}&currency=${currency}`;

  try {
    const data = await fetchJson(query);
    return data[address];
  } catch (error) {
    if (error instanceof HTTPResponseError) {
      console.error(error);
      const errorBody = await error.response.text();
      console.error(`Error body: ${errorBody}`);
    }
    throw new PriceNotFoundError(query);
  }
};

export const isActiveStrategy = async (address, provider) => {
  const strategyContract = new Contract(address, baseStrategyAbi, provider);
  const baseVersion = await strategyContract.baseStrategyVersion();
  if (baseVersion == "1.5") {
    const strategyContractV1_5 = new Contract(
      address,
      strategyV1_5Abi,
      provider
    );
    const vaultAddress = strategyContractV1_5.vault();
    const vaultStrategyContract = new Contract(
      vaultAddress,
      vaultV1_5Abi,
      provider
    );
    const vaultStrategyAddress = await vaultStrategyContract.strategy();
    return address === vaultStrategyAddress;
  } else {
    const controllerContract = new Contract(
      await strategyContract.controller(),
      controllerAbi,
      provider
    );
    const want = await strategyContract.want();
    const controllerStrategy = await controllerContract.strategies(want);
    return address === controllerStrategy;
  }
};

export const getStrategyMetadata = async (address, provider) => {
  try {
    const strategyContract = new Contract(address, baseStrategyAbi, provider);
    return await getStrategyMetadataV1(provider, strategyContract);
  } catch (error) {
    const strategyContractV1_5 = new Contract(
      address,
      strategyV1_5Abi,
      provider
    );
    return await getStrategyMetadataV1_5(provider, strategyContractV1_5);
  }
};

export const getStrategyMetadataV1 = async (provider, strategyContract) => {
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
  const nameFull = await strategyContract.getName();
  const vaultNameFull = await vaultContract.name();
  return {
    name: nameFull.replace("Strategy", ""),
    nameFull,
    vaultName: vaultNameFull.replace("Badger Sett ", ""),
    vaultNameFull,
    vault: vaultContract.address,
    want,
  };
};

export const getStrategyMetadataV1_5 = async (provider, strategyContract) => {
  const want = await strategyContract.want();
  const vaultContract = new Contract(
    await strategyContract.vault(),
    vaultV1_5Abi,
    provider
  );
  const nameFull = await strategyContract.getName();
  const vaultNameFull = await vaultContract.name();
  return {
    name: nameFull.replace("Strategy", ""),
    nameFull,
    vaultName: vaultNameFull.replace("Badger Sett ", ""),
    vaultNameFull,
    vault: vaultContract.address,
    want,
  };
};

export const formatMs = (ms) => {
  const s = 1000;
  const m = s * 60;
  const h = m * 60;
  const d = h * 24;
  const msAbs = Math.abs(ms);
  if (msAbs >= 3 * d) {
    // Show days if more than 3 days
    return Math.round(ms / d) + "d";
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + "h";
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + "m";
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + "s";
  }
  return ms + "ms";
};

export const formatCurrency = (amount) => {
  if (Math.abs(amount) < 1e3) {
    return `$${amount.toFixed(2)}`;
  } else if (Math.abs(amount) >= 1e3 && Math.abs(amount) < 1e6) {
    return `$${(amount / 1e3).toFixed(2)}k`;
  } else if (Math.abs(amount) >= 1e5 && Math.abs(amount) < 1e9) {
    return `$${(amount / 1e6).toFixed(2)}m`;
  } else {
    return `$${(amount / 1e9).toFixed(2)}b`;
  }
};

// TODO: Cache contract calls to local json
//       Maybe use classes for this (not sure how that works in js)
export const getPoolName = async (address, exchangeType, provider) => {
  const poolContract = new Contract(
    address,
    EXCHANGE_CONFIGS[exchangeType].abi,
    provider
  );

  if (exchangeType === EXCHANGE_TYPES.CURVE_LIKE) {
    try {
      const lpToken = await poolContract.lp_token();
      const lpTokenContract = new Contract(lpToken, erc20Abi, provider);
      return await lpTokenContract.symbol();
    } catch (error) {
      return await poolContract.symbol();
    }
  } else if (
    exchangeType === EXCHANGE_TYPES.UNISWAP_V2_LIKE ||
    exchangeType === EXCHANGE_TYPES.UNISWAP_V3_LIKE
  ) {
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();

    const token0Contract = new Contract(token0, erc20Abi, provider);
    const token0Symbol = await token0Contract.symbol();

    const token1Contract = new Contract(token1, erc20Abi, provider);
    const token1Symbol = await token1Contract.symbol();

    return `${token0Symbol}-${token1Symbol}`;
  } else {
    throw new Error(`Unsupported exchange type: ${exchangeType}`);
  }
};

// Uses spot price
// TODO: Cache contract calls to local json
//       Maybe use classes for this (not sure how that works in js)
export const getPoolTVL = async (address, exchangeType, provider, chainId) => {
  const poolContract = new Contract(
    address,
    EXCHANGE_CONFIGS[exchangeType].abi,
    provider
  );
  const tokens = [];

  if (exchangeType === EXCHANGE_TYPES.CURVE_LIKE) {
    for (let i = 0; ; i++) {
      let tokenAddress;
      try {
        tokenAddress = await poolContract.coins(i);
      } catch (error) {
        break;
      }

      const tokenContract = new Contract(tokenAddress, erc20Abi, provider);
      tokens.push({
        address: tokenAddress,
        balance: await poolContract.balances(i),
        decimals: await tokenContract.decimals(),
        price: await getTokenPrice(tokenAddress, chainId),
      });
    }
  } else if (
    exchangeType === EXCHANGE_TYPES.UNISWAP_V2_LIKE ||
    exchangeType === EXCHANGE_TYPES.UNISWAP_V3_LIKE
  ) {
    const tokenAddresses = [
      await poolContract.token0(),
      await poolContract.token1(),
    ];

    for (const tokenAddress of tokenAddresses) {
      const tokenContract = new Contract(tokenAddress, erc20Abi, provider);

      tokens.push({
        address: tokenAddress,
        balance: await tokenContract.balanceOf(address),
        decimals: await tokenContract.decimals(),
        price: await getTokenPrice(tokenAddress, chainId),
      });
    }
  } else {
    throw new Error(`Unsupported exchange type: ${exchangeType}`);
  }

  return tokens.reduce((acc, token) => {
    return acc + (token.balance * token.price) / 10 ** token.decimals;
  }, 0);
};

export const editMessages = async (tablePayloads, messages) => {
  for (const chainMessage of tablePayloads) {
    switch (chainMessage.name) {
      case CHAIN_CONFIG[CHAIN_IDS.ETHEREUM].displayName:
        await messages[0].edit(chainMessage.table);
      case CHAIN_CONFIG[CHAIN_IDS.ARBITRUM].displayName:
        await messages[1].edit(chainMessage.table);
      case CHAIN_CONFIG[CHAIN_IDS.FANTOM].displayName:
        await messages[2].edit(chainMessage.table);
    }
  }
};
