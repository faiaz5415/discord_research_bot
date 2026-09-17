function safeTitle(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(value);

    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function buildSource(url, title = "") {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return null;
  }

  const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, "");

  return {
    title: String(title || "").trim() || safeTitle(normalizedUrl),
    url: normalizedUrl,
    source: hostname,
    date: null,
  };
}

function collectResponseSources(response) {
  const citedSources = new Map();
  const searchSources = new Map();

  function addSource(collection, url, title) {
    const source = buildSource(url, title);

    if (!source) {
      return;
    }

    const existing = collection.get(source.url);

    if (!existing || (title && existing.title === safeTitle(source.url))) {
      collection.set(source.url, source);
    }
  }

  for (const item of response?.output || []) {
    if (item?.type === "web_search_call" && Array.isArray(item.action?.sources)) {
      for (const source of item.action.sources) {
        addSource(searchSources, source?.url, source?.title);
      }
    }

    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const content of item.content) {
        for (const annotation of content.annotations || []) {
          if (annotation?.type === "url_citation") {
            addSource(citedSources, annotation.url, annotation.title);
          }
        }
      }
    }
  }

  return [...(citedSources.size ? citedSources : searchSources).values()];
}

function formatResponseTextWithCitations(response, sources) {
  const sourceNumbers = new Map(sources.map((source, index) => [source.url, index + 1]));
  const outputParts = [];

  for (const item of response?.output || []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (content?.type !== "output_text" || typeof content.text !== "string") {
        continue;
      }

      let text = content.text;
      const insertions = (content.annotations || [])
        .filter((annotation) => annotation?.type === "url_citation" && sourceNumbers.has(normalizeUrl(annotation.url)))
        .map((annotation) => ({
          index: annotation.end_index,
          marker: ` [${sourceNumbers.get(normalizeUrl(annotation.url))}](${normalizeUrl(annotation.url)})`,
        }))
        .filter((citation) => Number.isInteger(citation.index) && citation.index >= 0 && citation.index <= text.length)
        .sort((left, right) => right.index - left.index);

      for (const insertion of insertions) {
        const nearbyText = text.slice(Math.max(0, insertion.index - 250), insertion.index + 250);
        const markerUrl = insertion.marker.match(/\((https?:\/\/[^)]+)\)/)?.[1];

        if (!nearbyText.includes(insertion.marker) && (!markerUrl || !nearbyText.includes(markerUrl))) {
          text = `${text.slice(0, insertion.index)}${insertion.marker}${text.slice(insertion.index)}`;
        }
      }

      outputParts.push(text);
    }
  }

  return outputParts.length ? outputParts.join("\n") : String(response?.output_text || "");
}

module.exports = {
  collectResponseSources,
  formatResponseTextWithCitations,
};