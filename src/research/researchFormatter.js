function formatSources(sources) {
  if (!sources.length) {
    return "No sources were returned.";
  }

  return sources
    .map((source, index) => `${index + 1}. ${source.title} — ${source.url}`)
    .join("\n");
}

function appendSources(text, sources) {
  const body = String(text || "").trim();

  if (!sources.length || /\n## Sources\b/i.test(body)) {
    return body;
  }

  return `${body}\n\n## Sources\n\n${formatSources(sources)}`;
}

module.exports = {
  appendSources,
  formatSources,
};