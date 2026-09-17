const test = require("node:test");
const assert = require("node:assert/strict");

const { isBotMentioned, stripBotMention, splitDiscordMessage } = require("../src/utils/discord");
const { shouldUseWebSearch } = require("../src/ai/assistant");
const { collectResponseSources, formatResponseTextWithCitations } = require("../src/research/citations");
const { appendSources, formatSources } = require("../src/research/researchFormatter");
const { researchWithWeb } = require("../src/research/webResearch");

test("detects both Discord mention formats", () => {
  assert.equal(isBotMentioned("<@123> explain MVVM", "123"), true);
  assert.equal(isBotMentioned("<@!123> explain MVVM", "123"), true);
  assert.equal(isBotMentioned("hello world", "123"), false);
});

test("strips the bot mention from the prompt", () => {
  assert.equal(stripBotMention("<@123> explain Flutter", "123"), "explain Flutter");
  assert.equal(stripBotMention("<@!123>   ", "123"), "");
});

test("splits long responses without exceeding the Discord limit", () => {
  const chunks = splitDiscordMessage("a".repeat(5000), 1900);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 1900));
});

test("preserves fenced code blocks across Discord chunks", () => {
  const chunks = splitDiscordMessage(`Before\n\n\`\`\`js\n${"const value = 1;\n".repeat(200)}\`\`\`\n\nAfter`, 500);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 500));
  assert.ok(chunks.every((chunk) => (chunk.match(/```/g) || []).length % 2 === 0));
});

test("uses web search for current research queries", () => {
  assert.equal(shouldUseWebSearch("latest Flutter architecture trends"), true);
  assert.equal(shouldUseWebSearch("Compare membrane bioreactors and activated sludge"), true);
  assert.equal(shouldUseWebSearch("Explain this with sources"), true);
  assert.equal(shouldUseWebSearch("What is MVVM?"), false);
  assert.equal(shouldUseWebSearch("Rewrite this paragraph"), false);
});

test("appends a sources section when missing", () => {
  const output = appendSources("## Research Summary\n\nExample", [
    { title: "Example Source", url: "https://example.com" },
  ]);

  assert.match(output, /## Sources/);
  assert.match(output, /Example Source — https:\/\/example.com/);
});

test("extracts and numbers only returned URL citations", () => {
  const response = {
    output: [
      {
        type: "web_search_call",
        status: "completed",
        action: { type: "search", sources: [{ type: "url", url: "https://epa.gov/water" }] },
      },
      {
        type: "message",
        content: [{
          type: "output_text",
          text: "EPA evidence supports this finding.",
          annotations: [{
            type: "url_citation",
            start_index: 0,
            end_index: 12,
            title: "Water Research",
            url: "https://epa.gov/water",
          }],
        }],
      },
    ],
  };
  const sources = collectResponseSources(response);

  assert.deepEqual(sources, [{
    title: "Water Research",
    url: "https://epa.gov/water",
    source: "epa.gov",
    date: null,
  }]);
  assert.match(formatResponseTextWithCitations(response, sources), /\[1\]\(https:\/\/epa\.gov\/water\)/);
});

test("formats traceable research sources", () => {
  assert.equal(formatSources([{
    title: "EPA Water Research",
    url: "https://epa.gov/water",
    source: "epa.gov",
    date: null,
  }]), "1. EPA Water Research — https://epa.gov/water");
});

test("research service uses official web search and returns verified sources", async () => {
  let request;
  const result = await researchWithWeb({
    instructions: "Research carefully.",
    prompt: "A current question",
    createResponseFn: async (params) => {
      request = params;
      return {
        id: "resp_test",
        output: [
          {
            type: "web_search_call",
            status: "completed",
            action: { type: "search", sources: [{ type: "url", url: "https://example.com/study" }] },
          },
          {
            type: "message",
            content: [{ type: "output_text", text: "A supported finding.", annotations: [] }],
          },
        ],
      };
    },
  });

  assert.equal(request.tools[0].type, "web_search");
  assert.deepEqual(request.include, ["web_search_call.action.sources"]);
  assert.equal(result.webSearchPerformed, true);
  assert.match(result.text, /https:\/\/example.com\/study/);
});

test("research service rejects failed searches and missing source metadata", async () => {
  await assert.rejects(
    () => researchWithWeb({
      instructions: "Research carefully.",
      prompt: "A current question",
      createResponseFn: async () => ({
        id: "resp_empty",
        output_text: "An unsupported answer.",
        output: [{ type: "web_search_call", status: "failed", action: { type: "search", sources: [] } }],
      }),
    }),
    (error) => error.code === "INCOMPLETE_WEB_RESEARCH" && /couldn't complete the web research/.test(error.message),
  );
});