import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export const checkStatus = (response) => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response;
  } else {
    throw new HTTPResponseError(response);
  }
};
