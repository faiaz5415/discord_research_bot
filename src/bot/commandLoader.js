const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");
const { warn } = require("../utils/logger");

function loadCommands() {
  const commands = new Collection();
  const commandsDir = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsDir).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const command = require(path.join(commandsDir, file));

    if (!command?.data?.name || typeof command.execute !== "function") {
      warn(`Skipping invalid command module: ${file}`);
      continue;
    }

    commands.set(command.data.name, command);
  }

  return commands;
}

module.exports = {
  loadCommands,
};