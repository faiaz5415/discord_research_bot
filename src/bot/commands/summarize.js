const { SlashCommandBuilder } = require("discord.js");
const { answerDocument } = require("../../ai/assistant");
const { processAttachment } = require("../../files/fileHandler");
const { splitDiscordMessage } = require("../../utils/discord");
const { takeCooldown } = require("../../utils/rateLimit");
const { toUserMessage } = require("../../utils/errors");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("summarize")
    .setDescription("Summarize text or a file.")
    .addStringOption((option) =>
      option.setName("text").setDescription("Text to summarize").setRequired(false),
    )
    .addAttachmentOption((option) =>
      option.setName("file").setDescription("Optional file to summarize").setRequired(false),
    ),
  async execute(interaction) {
    const text = interaction.options.getString("text");
    const file = interaction.options.getAttachment("file");

    if (!text && !file) {
      await interaction.reply({ content: "Provide text or attach a file to summarize.", ephemeral: true });
      return;
    }

    const cooldown = takeCooldown(interaction.user.id);

    if (!cooldown.allowed) {
      await interaction.reply({ content: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const attachments = file ? [await processAttachment(file)] : [];
      const result = await answerDocument({
        prompt: text || `Summarize the attached file named ${file.filename}.`,
        attachments,
      });

      const chunks = splitDiscordMessage(result.text);
      await interaction.editReply(chunks.shift() || "No summary generated.");

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } catch (error) {
      await interaction.editReply(toUserMessage(error, "Failed to summarize the input."));
    }
  },
};