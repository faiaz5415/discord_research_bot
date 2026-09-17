const { info } = require("../../utils/logger");
const { registerCommands } = require("../registerCommands");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    info(`Bot is online as ${client.user.tag}`);

    try {
      await registerCommands(client);
    } catch (error) {
      info("Slash command registration failed", error.message);
    }
  },
};