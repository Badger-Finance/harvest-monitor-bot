import { Client, Intents } from "discord.js";

import { GUILD_ID, CHANNEL_ID } from "./constants.js";
import { getHarvestTable } from "./harvests.js";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once("ready", async () => {
  console.log("Running...");
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    const channel = guild.channels.cache.get(CHANNEL_ID);
    const payload = await getHarvestTable();
    const pinnedMessages = await channel.messages.fetchPinned();
    const message = await pinnedMessages.last();
    if (message) {
      await message.edit(payload);
    } else {
      await channel.send(payload);
    }
  } catch (error) {
    console.error(error);
  }
  console.log("Done!");
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
