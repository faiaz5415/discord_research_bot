const { handleMentionMessage } = require("../messageRouter");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    await handleMentionMessage(client, message);
  },
};