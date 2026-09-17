const CURRENT_INFORMATION_PATTERN = /\b(latest|current|currently|recent|recently|today|tonight|yesterday|news|newest|new|emerging|202[4-9]|this (?:week|month|year)|up[ -]to[ -]date|what happened|available now|market (?:data|information|share|trends?)|regulations?|statistics?|developments?|studies|findings)\b/i;
const EXPLICIT_RESEARCH_PATTERN = /\b(research|investigate|look up|search (?:the )?web|web search|find (?:me )?(?:sources|evidence|papers|studies)|with sources|cite (?:sources|evidence)|citations?|sources?|references?)\b/i;
const RESEARCH_DOMAIN_PATTERN = /\b(wastewater|sewage|water treatment|membrane bioreactors?|activated sludge|microplastics?|antibiotic-resistant|peer-reviewed)\b/i;

function shouldUseWebSearch(query) {
  const value = String(query || "").trim();

  return Boolean(value) && (
    CURRENT_INFORMATION_PATTERN.test(value)
    || EXPLICIT_RESEARCH_PATTERN.test(value)
    || RESEARCH_DOMAIN_PATTERN.test(value)
  );
}

function isResearchFollowUp(query, history) {
  const refersToPriorAnswer = /\b(these|those|which (?:one|ones|of)|the above|them|they|their|follow[ -]?up)\b/i.test(String(query || ""));
  const hasResearchAnswer = Array.isArray(history) && history.some((turn) => (
    turn?.role === "assistant" && /(?:^|\n)## Sources\b/i.test(String(turn.content || ""))
  ));

  return refersToPriorAnswer && hasResearchAnswer;
}

function buildResearchPrompt({ query, historyText = "", attachmentText = "", context = "" }) {
  return [
    context,
    historyText,
    attachmentText,
    [
      `Research question:\n${query}`,
      "Use web evidence returned by the search tool. Prefer recent, primary, authoritative sources when relevant.",
      "For scientific topics, prioritize peer-reviewed, government, university, and recognized research sources without excluding other relevant evidence.",
      "Return readable Discord Markdown using these sections:",
      "## Research Summary",
      "## Key Findings",
      "## Detailed Analysis",
      "## Important Considerations",
      "Do not write a Sources section; verified sources will be added programmatically.",
      "Clearly distinguish source findings from your synthesis, identify uncertainty or disagreement, and do not invent evidence, authors, dates, papers, DOI values, or URLs.",
    ].join("\n"),
  ].filter(Boolean).join("\n\n");
}

module.exports = {
  buildResearchPrompt,
  isResearchFollowUp,
  shouldUseWebSearch,
};