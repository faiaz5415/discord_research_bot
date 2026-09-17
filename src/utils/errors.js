class AppError extends Error {
  constructor(message, code = "APP_ERROR", status = 500, details = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toUserMessage(error, fallback = "Something went wrong while processing that request.") {
  if (!error) {
    return fallback;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  const message = error.message || "";

  if (/rate limit/i.test(message)) {
    return "That request was rate limited. Please try again in a few seconds.";
  }

  if (/invalid token/i.test(message)) {
    return "Discord authentication failed. Check the bot token in .env.";
  }

  if (/api key/i.test(message)) {
    return "OpenAI configuration is missing or invalid. Check OPENAI_API_KEY.";
  }

  return fallback;
}

module.exports = {
  AppError,
  toUserMessage,
};