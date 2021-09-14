import fs from "fs";
import fetch from "node-fetch";
import path, { basename, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getFileName = (fpath) => basename(fpath, extname(fpath));

export const writeJson = (fpath, obj) => {
  fs.writeFile(fpath, JSON.stringify(obj, null, 2), (err) => {
    if (err) throw err;
  });
};

export const loadCommands = async () => {
  const commandFiles = fs
    .readdirSync(path.resolve(__dirname, "commands"))
    .filter((file) => file.endsWith(".js"));
  return Promise.all(
    commandFiles.map(async (file) => await import(`./commands/${file}`))
  );
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

export const getTransactions = async (address, startBlock = 0) => {
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

export const formatMs = (ms) => {
  const s = 1000;
  const m = s * 60;
  const h = m * 60;
  const msAbs = Math.abs(ms);
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
