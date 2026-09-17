const { SlashCommandBuilder } = require("discord.js");
const { answerLibraryQuestion } = require("../../ai/assistant");
const { processAttachment } = require("../../files/fileHandler");
const {
  addLibraryDocument,
  listLibraryDocuments,
  searchLibraryDocuments,
  removeLibraryDocument,
} = require("../../memory/researchLibrary");
const { splitDiscordMessage } = require("../../utils/discord");
const { takeCooldown } = require("../../utils/rateLimit");
const { toUserMessage } = require("../../utils/errors");

function buildLibraryCommand() {
  return new SlashCommandBuilder()
    .setName("library").setDescription("Manage the local research library.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a document to the local library.")
        .addAttachmentOption((option) => option.setName("file").setDescription("File to store").setRequired(true))
        .addStringOption((option) => option.setName("title").setDescription("Optional title").setRequired(false)),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List stored documents."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("search")
        .setDescription("Search stored documents.")
        .addStringOption((option) => option.setName("query").setDescription("Search terms").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a stored document.")
        .addStringOption((option) => option.setName("id").setDescription("Document id").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ask")
        .setDescription("Ask a question using library matches.")
        .addStringOption((option) => option.setName("question").setDescription("Question to answer").setRequired(true)),
    );
}

module.exports = {
  data: buildLibraryCommand(),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const documents = listLibraryDocuments();
      const body = documents.length
        ? documents.map((document) => `${document.id} | ${document.title} | ${document.filename}`).join("\n")
        : "The library is empty.";
      await interaction.reply({ content: body, ephemeral: true });
      return;
    }

    if (subcommand === "search") {
      const query = interaction.options.getString("query", true);
      const matches = searchLibraryDocuments(query);
      const body = matches.length
        ? matches.map((document) => `${document.id} | ${document.title} | ${document.filename}`).join("\n")
        : "No documents matched that search.";
      await interaction.reply({ content: body, ephemeral: true });
      return;
    }

    if (subcommand === "remove") {
      const id = interaction.options.getString("id", true);
      const removed = removeLibraryDocument(id);
      await interaction.reply({ content: removed ? `Removed ${removed.title}.` : "No document matched that id.", ephemeral: true });
      return;
    }

    if (subcommand === "add") {
      const file = interaction.options.getAttachment("file");
      const title = interaction.options.getString("title") || file.filename;

      await interaction.deferReply({ ephemeral: true });

      try {
        const processed = await processAttachment(file);
        const document = addLibraryDocument({
          title,
          filename: file.filename,
          text: processed.text,
          userId: interaction.user.id,
        });

        await interaction.editReply(`Stored ${document.title} with id ${document.id}.`);
      } catch (error) {
        await interaction.editReply(toUserMessage(error, "Failed to store the document."));
      }

      return;
    }

    if (subcommand === "ask") {
      const cooldown = takeCooldown(interaction.user.id);

      if (!cooldown.allowed) {
        await interaction.reply({ content: `Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`, ephemeral: true });
        return;
      }

      const question = interaction.options.getString("question", true);
      const matches = searchLibraryDocuments(question).slice(0, 5);
      const libraryContext = matches.length
        ? ["Library matches:", ...matches.map((document, index) => `${index + 1}. ${document.title} (${document.filename})\n${document.text.slice(0, 4000)}`)].join("\n\n")
        : "Library matches: none";

      await interaction.deferReply();

      try {
        const result = await answerLibraryQuestion({
          prompt: question,
          libraryContext,
        });

        const chunks = splitDiscordMessage(result.text);
        await interaction.editReply(chunks.shift() || "No answer generated.");

        for (const chunk of chunks) {
          await interaction.followUp(chunk);
        }
      } catch (error) {
        await interaction.editReply(toUserMessage(error, "Failed to answer from the library."));
      }
    }
  },
};