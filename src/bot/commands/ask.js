const { SlashCommandBuilder } = require("discord.js");
const { answerChat, answerResearch, isResearchFollowUp, shouldUseWebSearch } = require("../../ai/assistant");
const { appendConversationTurn, getConversation } = require("../../memory/conversationMemory");
const { splitDiscordMessage } = require("../../utils/discord");
const { takeCooldown } = require("../../utils/rateLimit");
const { toUserMessage } = require("../../utils/errors");
const { error: logError } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the assistant a question.")
    .addStringOption((option) =>
      option.setName("question").setDescription("Your question").setRequired(true),
    ),
  async execute(interaction) {
    const question = interaction.options.getString("question", true);
    const scope = {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    };

    const cooldown = takeCooldown(interaction.user.id);

    if (!cooldown.allowed) {
      await interaction.reply({ content: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const conversation = getConversation(scope);
      const result = shouldUseWebSearch(question) || isResearchFollowUp(question, conversation)
        ? await answerResearch({ query: question, history: conversation, forceWebSearch: true })
        : await answerChat({ question, history: conversation });

      appendConversationTurn(scope, "user", question);
      appendConversationTurn(scope, "assistant", result.text);

      const chunks = splitDiscordMessage(result.text);
      await interaction.editReply(chunks.shift() || "No response generated.");

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } catch (commandError) {
      logError("Ask command failed", { code: commandError.code, status: commandError.status, message: commandError.message });
      await interaction.editReply(toUserMessage(commandError, "Failed to answer the question."));
    }
  },
};