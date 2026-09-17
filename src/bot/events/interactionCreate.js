const { toUserMessage } = require("../../utils/errors");
const { error } = require("../../utils/logger");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (commandError) {
      error(`Command failed: ${interaction.commandName}`, commandError.message);

      const message = toUserMessage(commandError, "Command execution failed.");

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
        return;
      }

      await interaction.reply({ content: message, ephemeral: true });
    }
  },
};