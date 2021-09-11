import { Client, Collection, Intents } from "discord.js";

import { loadCommands } from "./utils.js";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const setCommands = async () => {
  const commands = await loadCommands();
  client.commands = new Collection();
  commands.forEach((command) => {
    client.commands.set(command.data.name, command);
  });
};

await setCommands();

client.once("ready", () => {
  console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    return interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.login(process.env.BOT_TOKEN);
