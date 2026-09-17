const fs = require("fs");
const path = require("path");
const { warn } = require("../utils/logger");

function registerEvents(client) {
  const eventsDir = path.join(__dirname, "events");
  const files = fs.readdirSync(eventsDir).filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const event = require(path.join(eventsDir, file));

    if (!event?.name || typeof event.execute !== "function") {
      warn(`Skipping invalid event module: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
      continue;
    }

    client.on(event.name, (...args) => event.execute(client, ...args));
  }
}

module.exports = {
  registerEvents,
};