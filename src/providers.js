import { Logger } from "@ethersproject/logger";
import { InfuraProvider as BaseInfuraProvider } from "@ethersproject/providers";
import { Web3Provider as EthersWeb3Provider } from "@ethersproject/providers";
import { Web3HttpProvider } from "web3-providers-http";

const logger = new Logger("providers/5.4.5");

export class InfuraProvider extends BaseInfuraProvider {
  static getUrl(network, apiKey) {
    network.name = network.name === "ethereum" ? "homestead" : network.name;
    try {
      return BaseInfuraProvider.getUrl(network, apiKey);
    } catch (error) {
      let host = null;
      switch (network ? network.name : "unknown") {
        case "arbitrum":
          host = "arbitrum-mainnet.infura.io";
          break;
        default:
          logger.throwError(
            "unsupported network",
            Logger.errors.INVALID_ARGUMENT,
            {
              argument: "network",
              value: network,
            }
          );
      }

      const connection = {
        allowGzip: true,
        url: "https:/" + "/" + host + "/v3/" + apiKey.projectId,
        throttleCallback: (attempt, url) => {
          if (apiKey.projectId === defaultProjectId) {
            showThrottleMessage();
          }
          return Promise.resolve(true);
        },
      };

      if (apiKey.projectSecret != null) {
        connection.user = "";
        connection.password = apiKey.projectSecret;
      }

      return connection;
    }
  }
}

export const FtmProvider = new EthersWeb3Provider(
  new Web3HttpProvider("https://rpc.ftm.tools/")
);
