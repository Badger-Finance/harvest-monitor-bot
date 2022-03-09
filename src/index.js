import { Client, Intents } from "discord.js";

import { GUILD_ID, CHANNEL_ID, CHAIN_CONFIG, CHAIN_IDS } from "./constants.js";
import { getHarvestTables } from "./harvests.js";
import { editMessages } from "./utils.js";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once("ready", async () => {
  console.log("Running...");
  const guild = client.guilds.cache.get(GUILD_ID);
  const channel = guild.channels.cache.get(CHANNEL_ID);
  const payloads = await getHarvestTables(Object.values(CHAIN_IDS));
  // TODO: Don't actually need pinned messages
  const pinnedMessages = await channel.messages.fetchPinned();
  const messages = await pinnedMessages.last(6);
  if (messages.length === 0) {
    for (const chainMessage of payloads.harvests) {
      await channel.send(chainMessage.table);
    }
    for (const chainMessage of payloads.pools) {
      await channel.send(chainMessage.table);
    }
  } else {
    await editMessages(payloads.harvests, messages.slice(0, 3));
    await editMessages(payloads.pools, messages.slice(3));
  }
  console.log("Done!");
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
