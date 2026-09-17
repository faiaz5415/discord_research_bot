const { SlashCommandBuilder } = require("discord.js");
const { answerChat, answerResearch } = require("../../ai/assistant");
const { appendConversationTurn, getConversation } = require("../../memory/conversationMemory");
const { buildSessionContext, startSession, endSession, addSessionResult, listSessionSources } = require("../../memory/researchMemory");
const { splitDiscordMessage } = require("../../utils/discord");
const { takeCooldown } = require("../../utils/rateLimit");
const { toUserMessage } = require("../../utils/errors");
const { error: logError } = require("../../utils/logger");

function buildResearchCommand() {
  return new SlashCommandBuilder()
    .setName("research")
    .setDescription("Run research with optional session tracking.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("query")
        .setDescription("Run a one-off research query.")
        .addStringOption((option) =>
          option.setName("query").setDescription("What should be researched?").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a research session.")
        .addStringOption((option) =>
          option.setName("topic").setDescription("Research topic").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ask")
        .setDescription("Ask a follow-up in the active research session.")
        .addStringOption((option) =>
          option.setName("question").setDescription("Follow-up question").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("summary").setDescription("Summarize the active research session."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("sources").setDescription("List known sources for the active research session."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("end").setDescription("End the active research session."),
    );
}

module.exports = {
  data: buildResearchCommand(),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const scope = {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
    };

    if (subcommand === "start") {
      const topic = interaction.options.getString("topic", true);
      startSession(scope, topic);
      await interaction.reply({ content: `Research session started for: ${topic}`, ephemeral: true });
      return;
    }

    if (subcommand === "end") {
      endSession(scope);
      await interaction.reply({ content: "Research session ended.", ephemeral: true });
      return;
    }

    if (subcommand === "sources") {
      const sources = listSessionSources(scope);
      const body = sources.length
        ? sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`).join("\n")
        : "No sources are stored for the active session.";
      await interaction.reply({ content: body, ephemeral: true });
      return;
    }

    const cooldown = takeCooldown(interaction.user.id);

    if (!cooldown.allowed) {
      await interaction.reply({ content: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`, ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const conversation = getConversation(scope);
      const query = subcommand === "query"
        ? interaction.options.getString("query", true)
        : subcommand === "ask"
          ? interaction.options.getString("question", true)
          : "Summarize the active research session, including its main findings, evidence, and unresolved questions.";
      const result = subcommand === "summary"
        ? await answerChat({
          question: query,
          history: conversation,
          context: buildSessionContext(scope),
        })
        : await answerResearch({
          query,
          history: conversation,
          context: buildSessionContext(scope),
          forceWebSearch: true,
        });

      appendConversationTurn(scope, "user", query);
      appendConversationTurn(scope, "assistant", result.text);
      addSessionResult(scope, { query, answer: result.text, sources: result.sources });

      const chunks = splitDiscordMessage(result.text);
      await interaction.editReply(chunks.shift() || "No research result generated.");

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } catch (commandError) {
      logError("Research command failed", { code: commandError.code, status: commandError.status, message: commandError.message });
      await interaction.editReply(toUserMessage(commandError, "Research failed."));
    }
  },
};