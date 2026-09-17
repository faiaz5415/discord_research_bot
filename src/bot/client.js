const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { loadCommands } = require("./commandLoader");
const { registerEvents } = require("./eventLoader");

function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = new Collection();

  for (const [name, command] of loadCommands()) {
    client.commands.set(name, command);
  }

  registerEvents(client);

  return client;
}

module.exports = {
  createBot,
};