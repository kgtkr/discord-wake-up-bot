import * as Discord from "discord.js";
import * as fs from "fs";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, DefaultMediaReceiver } from "castv2-client";
import { promisify } from "util";

const config: {
  token: string;
  appId: string;
  guildId: string;
  castHost: string;
  contentUrl: string;
  commandName: string;
  commandDescription: string;
  replyContent: string;
} = JSON.parse(fs.readFileSync("config.json", { encoding: "utf8" }));

const rest = new REST({ version: "9" }).setToken(config.token);
const client = new Discord.Client({
  intents: [],
});

const commands = [
  new SlashCommandBuilder()
    .setName(config.commandName)
    .setDescription(config.commandDescription),
].map((command) => command.toJSON());

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.appId, config.guildId),
      {
        body: commands,
      }
    );
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === config.commandName) {
      await interaction.reply({
        content: config.replyContent,
      });
      const client = new Client();
      client.on("error", (err: any) => {
        console.error(err);
        client.close();
      });
      await promisify((cb) => client.connect(config.castHost, cb))();
      const player: any = await promisify((cb) =>
        client.launch(DefaultMediaReceiver, cb)
      )();
      await promisify((cb) => client.setVolume({ level: 1 }, cb))();
      await promisify((cb) =>
        player.load({ contentId: config.contentUrl }, { autoplay: true }, cb)
      )();
    }
  }
});

client.login(config.token);
