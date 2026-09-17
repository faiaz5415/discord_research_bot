const { SlashCommandBuilder } = require("discord.js");
const { answerComparison } = require("../../ai/assistant");
const { processAttachment } = require("../../files/fileHandler");
const { splitDiscordMessage } = require("../../utils/discord");
const { takeCooldown } = require("../../utils/rateLimit");
const { toUserMessage } = require("../../utils/errors");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("compare")
    .setDescription("Compare up to three files or pieces of text.")
    .addStringOption((option) => option.setName("question").setDescription("Comparison goal").setRequired(false))
    .addAttachmentOption((option) => option.setName("file1").setDescription("First file").setRequired(false))
    .addAttachmentOption((option) => option.setName("file2").setDescription("Second file").setRequired(false))
    .addAttachmentOption((option) => option.setName("file3").setDescription("Third file").setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString("question") || "Compare these documents.";
    const attachments = [
      interaction.options.getAttachment("file1"),
      interaction.options.getAttachment("file2"),
      interaction.options.getAttachment("file3"),
    ].filter(Boolean);

    if (!attachments.length) {
      await interaction.reply({ content: "Attach at least one file to compare.", ephemeral: true });
      return;
    }

    const cooldown = takeCooldown(interaction.user.id);

    if (!cooldown.allowed) {
      await interaction.reply({ content: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const processed = [];

      for (const attachment of attachments) {
        processed.push(await processAttachment(attachment));
      }

      const result = await answerComparison({
        prompt: question,
        attachments: processed,
      });

      const chunks = splitDiscordMessage(result.text);
      await interaction.editReply(chunks.shift() || "No comparison generated.");

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } catch (error) {
      await interaction.editReply(toUserMessage(error, "Failed to compare the inputs."));
    }
  },
};