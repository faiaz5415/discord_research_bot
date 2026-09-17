const { env } = require("../config/env");

const lastRequestAt = new Map();

function takeCooldown(userId) {
  const now = Date.now();
  const lastAt = lastRequestAt.get(userId) || 0;
  const elapsed = now - lastAt;

  if (elapsed < env.AI_REQUEST_COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfterMs: env.AI_REQUEST_COOLDOWN_MS - elapsed,
    };
  }

  lastRequestAt.set(userId, now);

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

module.exports = {
  takeCooldown,
};