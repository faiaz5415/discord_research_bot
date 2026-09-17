const path = require("path");
const dotenv = require("dotenv");

const dotenvResult = dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing or empty. Check the .env file in the project root.`);
  }

  return value;
}

function integer(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const env = {
  DISCORD_TOKEN: required("DISCORD_TOKEN"),
  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol",
  AI_REQUEST_COOLDOWN_MS: integer("AI_REQUEST_COOLDOWN_MS", 3000),
  MAX_ATTACHMENT_SIZE_MB: integer("MAX_ATTACHMENT_SIZE_MB", 20),
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID?.trim() || "",
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID?.trim() || "",
  NODE_ENV: process.env.NODE_ENV?.trim() || "development",
};

module.exports = {
  env,
  dotenvResult,
};