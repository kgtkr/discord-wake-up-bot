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
  guildIds: string[];
  castHost: string;
  contentUrl: string;
  commandName: string;
  commandDescription: string;
  replyContent: string;
  acceptUserIds: string[];
  rejectContent: string;
  volume?: number;
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
    for (const guildId of config.guildIds) {
      await rest.put(Routes.applicationGuildCommands(config.appId, guildId), {
        body: commands,
      });
    }
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === config.commandName) {
      if (config.acceptUserIds.includes(interaction.user.id)) {
        console.log("started");
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
        await promisify((cb) =>
          client.setVolume({ level: config.volume ?? 1 }, cb)
        )();
        await promisify((cb) =>
          player.load({ contentId: config.contentUrl }, { autoplay: true }, cb)
        )();
      } else {
        await interaction.reply({
          content: config.rejectContent,
        });
      }
    } else {
      console.log(`Unknown command: ${interaction.commandName}`);
    }
  } else {
    console.log(`Unknown interaction: ${interaction.type}`);
  }
});

client.login(config.token);
