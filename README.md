# Discord AI Research Assistant

Production-oriented Discord bot scaffold for AI chat, research, file analysis, and slash commands.

## What it does

- Mention-based AI chat in Discord
- Slash commands for chat, research, summarize, compare, library, help, and status
- OpenAI Responses API integration with live web search for current and source-backed research
- Programmatic extraction of returned URL citations with inline links and a verified Sources section
- Attachment extraction for PDF, DOCX, CSV, XLSX, JSON, and text/code files
- Persistent conversation memory and a simple local research library
- Basic rate limiting and safer Discord response splitting

## Setup

1. Install Node.js dependencies.
2. Create a `.env` file in the project root.
3. Add your Discord bot token and OpenAI API key.
4. Run `npm start`.

## Environment variables

Required:

- `DISCORD_TOKEN`
- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL` default: `gpt-5.6-sol`
- `AI_REQUEST_COOLDOWN_MS` default: `3000`
- `MAX_ATTACHMENT_SIZE_MB` default: `20`
- `DISCORD_CLIENT_ID` optional command-registration override
- `DISCORD_GUILD_ID` optional guild command registration target

## Commands

- `/ask question:...`
- `/research query:...`
- `/summarize`
- `/compare`
- `/library add|list|search|remove|ask`
- `/help`
- `/status`

## Mention workflow

Mention the bot in a server message:

- `@research bot explain Flutter MVVM`
- `@research bot research the latest Flutter architecture trends`

Current, recent, explicitly sourced, and wastewater-research questions automatically use web search. Basic definitions, rewriting, and timeless conceptual questions continue through normal chat. `/research query` always performs web research, and contextual follow-ups retain conversation history.

Attach files to a mention message to trigger file analysis.

## Notes

- Slash command registration runs automatically on startup.
- If you want fast command propagation in one server, set `DISCORD_GUILD_ID`.
- Uploaded files are processed locally for the current request; library storage happens only when you use `/library add`.

## Troubleshooting

- If the bot does not log in, verify `DISCORD_TOKEN` is valid and active.
- If slash commands do not appear immediately, re-run the bot after setting `DISCORD_GUILD_ID`.
- If research responses are empty, check the OpenAI API key and model access.

## Security

- Do not commit `.env`.
- Do not expose API keys in logs.
- Attachments are size-limited and file types are validated before processing.

## Future roadmap

- OpenAI File Search/vector store integration for the research library
- Code interpreter-backed data analysis
- Persistent database-backed research sessions