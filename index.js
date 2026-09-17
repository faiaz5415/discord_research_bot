const { env } = require("./src/config/env");
const { createBot } = require("./src/bot/client");
const { error } = require("./src/utils/logger");

async function main() {
  const client = createBot();

  process.on("unhandledRejection", (reason) => {
    error("Unhandled rejection", reason instanceof Error ? reason.message : reason);
  });

  process.on("uncaughtException", (err) => {
    error("Uncaught exception", err.message);
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  error("Bot startup failed", err.message);
  process.exit(1);
});