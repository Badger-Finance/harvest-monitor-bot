import { Client, Intents } from "discord.js";

import { GUILD_ID, CHANNEL_ID, CHAIN_IDS } from "./constants.js";
import { getHarvestTables } from "./harvests.js";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once("ready", async () => {
  console.log("Running...");
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    const channel = guild.channels.cache.get(CHANNEL_ID);
    const payloads = await getHarvestTables(Object.values(CHAIN_IDS));
    // TOOD: Don't actually need pinned messages
    const pinnedMessages = await channel.messages.fetchPinned();
    const messages = await pinnedMessages.last(2);
    if (messages.length === 0) {
      await channel.send(payloads.pools);
      await channel.send(payloads.harvests);
    } else if (messages.length === 1) {
      await messages[0].edit(payloads.pools);
      await channel.send(payloads.harvests);
    } else {
      await messages[1].edit(payloads.pools);
      await messages[0].edit(payloads.harvests);
    }
  } catch (error) {
    console.error(error);
  }
  console.log("Done!");
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
