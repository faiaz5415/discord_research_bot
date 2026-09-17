const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show how to use the assistant."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Discord AI Research Assistant")
      .setDescription("A Discord-first assistant for chat, research, document review, and library workflows.")
      .addFields(
        { name: "AI Chat", value: "Mention the bot: `@bot explain Flutter MVVM`" },
        { name: "Research", value: "Use `/research query: latest AI agent frameworks`" },
        { name: "Files", value: "Upload a PDF or document and ask a question" },
        { name: "Comparison", value: "Use `/compare` with up to three files" },
        { name: "Library", value: "Use `/library add`, `/library search`, `/library ask`" },
        { name: "Status", value: "Use `/status` to check configuration" },
      )
      .setColor(0x2b6cb0);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};