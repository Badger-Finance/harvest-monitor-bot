import { codeBlock, bold, italic } from "@discordjs/builders";
import { getAddress } from "@ethersproject/address";
import { Contract } from "@ethersproject/contracts";
import { Interface } from "@ethersproject/abi";

import AsciiTable from "ascii-table";

import {
  CHAIN_CONFIG,
  CHAIN_IDS,
  EXCHANGE_CONFIGS,
  HARVEST_FNS,
} from "./constants.js";
import { PriceNotFoundError } from "./errors.js";
import { InfuraProvider, FtmProvider } from "./providers.js";
import {
  formatCurrency,
  formatMs,
  getPoolName,
  getPoolTVL,
  getStrategyMetadata,
  getTransactions,
  isActiveStrategy,
} from "./utils.js";

import keeperAccessControlAbi from "./contracts/KeeperAccessControl.json" assert { type: "json" };
import STRATEGY_METADATA from "./data/strategy-metadata.json" assert { type: "json" };

const filterLatestHarvestTxs = async (
  txs,
  keeperAcl,
  provider,
  blacklistedStrategies
) => {
  const filteredTxs = [];
  const seen = new Set(blacklistedStrategies);
  const contract = new Contract(keeperAcl, keeperAccessControlAbi, provider);

  for (const tx of txs) {
    if (
      !tx.to ||
      !tx.input ||
      getAddress(tx.to) != getAddress(contract.address)
    ) {
      continue;
    }
    const { args, name } = contract.interface.parseTransaction({
      data: tx.input,
    });
    if (HARVEST_FNS.includes(name) && !seen.has(args.strategy)) {
      seen.add(args.strategy);
      if (await isActiveStrategy(args.strategy, provider)) {
        filteredTxs.push(tx);
      }
    }
  }
  return filteredTxs;
};

const getHarvestSwapPools = async (txs, provider, chainId) => {
  // Empty set for each exchange type
  const poolSets = Object.fromEntries(
    Object.keys(EXCHANGE_CONFIGS).map((exchangeType) => [
      exchangeType,
      new Set(),
    ])
  );

  for (const { blockHash, hash } of txs) {
    for (const exchangeType in poolSets) {
      const exchangeConfig = EXCHANGE_CONFIGS[exchangeType];
      const iface = new Interface(exchangeConfig.abi);
      const filter = {
        topics: iface.encodeFilterTopics(exchangeConfig.swapEvent, []),
        blockHash,
      };

      const events = await provider.getLogs(filter);
      const filteredEvents = events.filter((e) => e.transactionHash === hash);
      for (const { address } of filteredEvents) {
        poolSets[exchangeType].add(address);
      }
    }
  }
  const pools = [];
  for (const exchangeType in poolSets) {
    for (const pool of poolSets[exchangeType]) {
      try {
        const name = await getPoolName(pool, exchangeType, provider);
        const tvl = await getPoolTVL(pool, exchangeType, provider, chainId);
        pools.push({
          address: pool,
          name,
          tvl,
          tvlFormatted: formatCurrency(tvl),
        });
      } catch (e) {
        if (e instanceof PriceNotFoundError) {
          console.error(e);
        } else {
          throw e;
        }
      }
    }
  }
  return pools.sort((p1, p2) => p1.tvl - p2.tvl);
};

const getHarvestData = async (
  txs,
  keeperAcl,
  provider,
  strategyMetadata = {}
) => {
  const strategyHarvests = [];
  const contract = new Contract(keeperAcl, keeperAccessControlAbi, provider);

  for (const { input, timeStamp } of txs) {
    const { args } = contract.interface.parseTransaction({
      data: input,
    });
    const now = new Date().getTime();
    if (!(args.strategy in strategyMetadata)) {
      strategyMetadata[args.strategy] = await getStrategyMetadata(
        args.strategy,
        provider
      );
    }
    strategyHarvests.push({
      vaultName: strategyMetadata[args.strategy].vaultName,
      timeSinceHarvest: formatMs(now - +timeStamp * 1000),
      strategyAddress: args.strategy,
    });
  }
  return strategyHarvests;
};

const toTable = (title, columnNames, rows) => {
  const table = new AsciiTable(title);
  table.setHeading(...columnNames);
  for (const row of rows) {
    table.addRow(...row);
  }
  return table.toString();
};

// TODO: Move pools to a different script
export const getHarvestTables = async (chainIds) => {
  const chainTables = await Promise.all(
    chainIds.map(async (chainId) => {
      const chainConfig = CHAIN_CONFIG[chainId];
      const provider =
        chainId === CHAIN_IDS.FANTOM
          ? FtmProvider
          : new InfuraProvider(
              {
                name: chainConfig.name,
                chainId,
              },
              process.env.INFURA_PROJECT_ID
            );

      // TODO: This is temporary till all strats emit a Harvest event
      //       Use an event filter when the event is added
      // const strategyContract = new Contract(
      //   args.strategy,
      //   baseStrategyAbi,
      //   provider
      // );
      // const eventFilter = strategyContract.filters.Harvest();
      // const currentBlock = await provider.getBlockNumber();
      // const events = await strategyContract.queryFilter(
      //   eventFilter,
      //   currentBlock - 90000
      // );

      const startBlock = Number.isFinite(chainConfig.lookbackBlocks)
        ? (await provider.getBlockNumber()) - chainConfig.lookbackBlocks
        : 0;
      const txs = await getTransactions(
        chainConfig.keeperAcl,
        chainId,
        startBlock
      );
      const filteredTxs = await filterLatestHarvestTxs(
        txs,
        chainConfig.keeperAcl,
        provider,
        chainConfig.blacklistedStrategies || []
      );
      const pools = await getHarvestSwapPools(filteredTxs, provider, chainId);
      const strategyHarvests = await getHarvestData(
        filteredTxs,
        chainConfig.keeperAcl,
        provider,
        STRATEGY_METADATA[chainId]
      );

      const poolsTable = toTable(
        chainConfig.displayName,
        ["Pool", "TVL"],
        pools.map(({ name, tvlFormatted }) => [name, tvlFormatted])
      );
      const harvestTable = toTable(
        chainConfig.displayName,
        ["Vault", "Last Harvest"],
        strategyHarvests.map((harvest) => [
          harvest.vaultName,
          harvest.timeSinceHarvest,
        ])
      );
      return {
        harvests: codeBlock(harvestTable),
        pools: codeBlock(poolsTable),
        name: chainConfig.displayName,
      };
    })
  );
  const lastUpdated = `\n${bold(italic("Last Update:"))} ${italic(
    new Date().toUTCString()
  )}\n`;
  return {
    harvests: chainTables.map((tables) => ({
      name: tables.name,
      table: tables.harvests + "\n" + lastUpdated,
    })),
    pools: chainTables.map((tables) => ({
      name: tables.name,
      table: tables.pools + "\n" + lastUpdated,
    })),
  };
};
