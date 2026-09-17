function formatMeta(meta) {
  if (meta === undefined || meta === null) {
    return "";
  }

  if (typeof meta === "string") {
    return meta;
  }

  if (meta instanceof Error) {
    return `${meta.name}: ${meta.message}`;
  }

  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function log(level, message, meta) {
  const suffix = formatMeta(meta);
  const line = suffix ? `[${level}] ${message} ${suffix}` : `[${level}] ${message}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  console.log(line);
}

module.exports = {
  debug(message, meta) {
    log("DEBUG", message, meta);
  },
  info(message, meta) {
    log("INFO", message, meta);
  },
  warn(message, meta) {
    log("WARN", message, meta);
  },
  error(message, meta) {
    log("ERROR", message, meta);
  },
};