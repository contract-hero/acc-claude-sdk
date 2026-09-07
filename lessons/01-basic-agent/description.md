# Your first agent with the Claude Agent SDK

## What you will build

A minimal but complete agent in TypeScript on top of the Claude Agent SDK, the library that exposes the Claude Code harness (agent loop, tools, permissions, context management) to your own program. In three chapters you will:

1. Call `query()` and turn its typed message stream into a plain result object (`runAgent`).
2. Give the agent a pair of custom tools (`add_note`, `list_notes`) served by an MCP server that runs inside your process.
3. Wrap it in a tiny CLI, `pnpm agent "..."`, that streams the answer and prints a one-line summary with turns, cost and saved notes.

Every chapter is defined by a test file. The conductor implements the code until the tests pass and explains what it wrote in an HTML artifact. Later lessons add sessions, hooks and subagents on top of this app.

## Why the Agent SDK instead of the plain API

With the Messages API you implement the tool loop yourself: send the prompt, detect `tool_use` blocks, run the tool, send the `tool_result` back, repeat, and manage the context on the way. The Agent SDK runs that loop for you, in your process, with the same tools, permission rules and session handling that Claude Code uses. You keep control of what the agent can do (`tools`, `allowedTools`, `mcpServers`, `maxTurns`) and you read a typed stream of messages that ends with one `result` message carrying the final text, the turn count and the cost. The trade-off is less control over each API call and a dependency on the bundled Claude Code binary.

## Prerequisites

- Node.js 22 or newer and pnpm (checked by the course probes).
- Basic TypeScript: async functions, `for await`, reading generics.
- No prior knowledge of MCP or of the Agent SDK.

## Environment

- The unit tests run offline. They inject a fake `query()` that replays SDK messages, so all three chapters pass without credentials.
- The end-to-end test (`tests/e2e/agent.e2e.test.ts`) calls the real model. It needs `ANTHROPIC_API_KEY` in the environment, or `ACC_E2E_LIVE=1` when your credentials come from another provider. Without it the test is skipped with a visible reason and the suite still exits 0.
- The SDK does not load `.env` files. Export the key in the shell that runs the agent.

## Deliverable

A working app in your workspace: `src/agent.ts`, `src/tools.ts`, `src/cli.ts`, green unit tests, and a CLI you can run with your own API key: `ANTHROPIC_API_KEY=... pnpm agent "Save a note that says hello, then list my notes"`.

## Estimated time

About 30 minutes.
