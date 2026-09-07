# Docs snapshot: Claude Agent SDK (TypeScript)

Curated from the official Claude Code documentation on 2026-09-07 for `@anthropic-ai/claude-agent-sdk@0.3.263`. Every signature quoted here was checked against the package's `sdk.d.ts`. Python examples and unrelated sections were removed.

| File | What it covers | Used in |
|---|---|---|
| `01-overview.md` | What the Agent SDK is, how it compares to the CLI, the Client SDK and Managed Agents, capabilities | Intro |
| `02-quickstart.md` | Install, API key, the `for await` loop over `query()`, common options (`allowedTools`, `permissionMode`, `systemPrompt`) | Chapter 1 |
| `03-custom-tools.md` | `tool()`, `createSdkMcpServer()`, `mcpServers` plus `allowedTools`, `tools: []`, error results | Chapter 2 |
| `04-messages-and-results.md` | `query()` signature, selected `Options`, `SDKMessage` union, assistant / user / result / system messages, `tool()` and `createSdkMcpServer()` reference | Chapters 1 to 3 |
| `05-auth.md` | `ANTHROPIC_API_KEY`, no `.env` loading, the claude.ai login restriction, third-party providers, the e2e gate | Chapter 3, e2e |

Upstream index: https://code.claude.com/docs/llms.txt
