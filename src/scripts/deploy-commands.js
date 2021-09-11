import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

import { loadCommands } from "../utils.js";

const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN);

const getCommands = async () => {
  const commands = await loadCommands();
  return commands.map((command) => command.data.toJSON());
};

const commands = await getCommands();

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
