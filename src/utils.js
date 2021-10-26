import { Contract } from "@ethersproject/contracts";
import fs from "fs";
import fetch from "node-fetch";
import { basename, extname } from "path";

import { CHAIN_CONFIG } from "./constants.js";
import baseStrategyAbi from "./contracts/BaseStrategy.json";
import controllerAbi from "./contracts/Controller.json";
import erc20Abi from "./contracts/ERC20.json";
import settV4Abi from "./contracts/SettV4.json";
import uniswapV2PairAbi from "./contracts/UniswapV2Pair.json";

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

class HTTPResponseError extends Error {
  constructor(response, ...args) {
    super(
      `HTTP Error Response: ${response.status} ${response.statusText}`,
      ...args
    );
    this.response = response;
  }
}

const checkStatus = (response) => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response;
  } else {
    throw new HTTPResponseError(response);
  }
};

export const getTransactions = async (address, chainId, startBlock = 0) => {
  const endpoint = CHAIN_CONFIG[chainId].api;
  const token = CHAIN_CONFIG[chainId].apiToken;
  const query = `${endpoint}?module=account&action=txlist&sort=desc&address=${address}&startblock=${startBlock}&apikey=${token}`;

  const response = await fetch(query);

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

export const getStrategyMetadata = async (address, provider) => {
  const strategyContract = new Contract(address, baseStrategyAbi, provider);
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

export const getTokenPriceFromCoingecko = async (address, chainId) => {
  const endpoint = "https://api.coingecko.com/api/v3/simple/token_price";
  const chain = CHAIN_CONFIG[chainId].coingeckoId;
  const query = `${endpoint}/${chain}?contract_addresses=${address}&vs_currencies=usd`;

  const response = await fetch(query);

  try {
    checkStatus(response);
  } catch (error) {
    console.error(error);
    const errorBody = await error.response.text();
    console.error(`Error body: ${errorBody}`);
  }

  const data = await response.json();
  return data[address.toLowerCase()].usd;
};

// TODO: Cache constract calls to local json
export const getPoolName = async (address, provider) => {
  const pairContract = new Contract(address, uniswapV2PairAbi, provider);

  const token0 = await pairContract.token0();
  const token1 = await pairContract.token1();

  const token0Contract = new Contract(token0, erc20Abi, provider);
  const token0Symbol = await token0Contract.symbol();

  const token1Contract = new Contract(token1, erc20Abi, provider);
  const token1Symbol = await token1Contract.symbol();

  return `${token0Symbol}-${token1Symbol}`;
};

// TODO: Cache contract calls to local json
export const getPoolTVL = async (address, provider, chainId) => {
  const pairContract = new Contract(address, uniswapV2PairAbi, provider);

  const token0 = await pairContract.token0();
  const token1 = await pairContract.token1();

  const token0Contract = new Contract(token0, erc20Abi, provider);
  const token0Balance = await token0Contract.balanceOf(address);
  const token0Decimals = await token0Contract.decimals();
  const token0Price = await getTokenPriceFromCoingecko(token0, chainId);

  const token1Contract = new Contract(token1, erc20Abi, provider);
  const token1Balance = await token1Contract.balanceOf(address);
  const token1Decimals = await token1Contract.decimals();
  const token1Price = await getTokenPriceFromCoingecko(token1, chainId);

  return (
    (token0Price * token0Balance) / 10 ** token0Decimals +
    (token1Price * token1Balance) / 10 ** token1Decimals
  );
};
