const { REST, Routes } = require("discord.js");
const { env } = require("../config/env");
const { info, warn } = require("../utils/logger");

async function registerCommands(client) {
  const commands = [...client.commands.values()].map((command) => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const applicationId = env.DISCORD_CLIENT_ID || client.application?.id;

  if (!applicationId) {
    warn("Skipping slash command registration because the application id is unavailable.");
    return;
  }

  let targetGuildId = env.DISCORD_GUILD_ID;

  if (!targetGuildId && client.guilds.cache.size === 1) {
    targetGuildId = client.guilds.cache.first().id;
  }

  const route = targetGuildId
    ? Routes.applicationGuildCommands(applicationId, targetGuildId)
    : Routes.applicationCommands(applicationId);

  await rest.put(route, { body: commands });

  info(`Registered ${commands.length} slash commands${targetGuildId ? ` for guild ${targetGuildId}` : " globally"}.`);
}

module.exports = {
  registerCommands,
};