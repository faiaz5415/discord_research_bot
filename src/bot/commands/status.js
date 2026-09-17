const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { env } = require("../../config/env");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show bot and configuration status."),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle("Bot Status")
      .addFields(
        { name: "Bot", value: client.user ? `Online as ${client.user.tag}` : "Offline" },
        { name: "Model", value: env.OPENAI_MODEL, inline: true },
        { name: "Discord", value: "Connected", inline: true },
        { name: "OpenAI", value: env.OPENAI_API_KEY ? "Configured" : "Missing", inline: true },
        { name: "Uptime", value: `${Math.floor(process.uptime())}s`, inline: true },
      )
      .setColor(0x16a34a);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};