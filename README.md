# acc-claude-sdk

An [Agentic Community College](https://github.com/contract-hero/agentic-community-college) (ACC) course plugin for Claude Code. It teaches the **Claude Agent SDK** for TypeScript: how to build an agent on the Claude Code harness, from a first `query()` call to custom tools.

This is the first course on the ACC v0.3 lesson model: every lesson ships its own docs snapshot, a chapter plan, tests that define each chapter, and a complete reference app. The conductor agent implements each chapter until its tests pass and explains the code in an HTML artifact. You read, ask, and confirm.

## What the course teaches

- How `query()` runs the agent loop and streams typed messages (`system`, `assistant`, `user`, `result`).
- Why the `result` message is the contract: final text, turn count, cost, session id, error subtypes.
- How to define a custom tool with `tool()` and a Zod schema, serve it in-process with `createSdkMcpServer()`, and pre-approve it through `allowedTools`.
- How to isolate an SDK run from your local Claude Code settings (`settingSources: []`) and from the built-in tools (`tools: []`).
- How to wrap the agent in a small CLI that is testable offline by injecting `query()`.

## Lessons

| Lesson | Title | Chapters |
|---|---|---|
| `01-basic-agent` | Your first agent with the Claude Agent SDK | Run a query and read the result. Give the agent a custom in-process tool. Wrap it in a tiny CLI. |

Later lessons will add sessions, hooks, and subagents.

## How to run

1. Install and enable the `agentic-community-college` plugin (ACC). See its README for the install steps.
2. Install and enable this plugin, `acc-claude-sdk`, the same way.
3. In Claude Code, run:

```
/acc-claude-sdk:start
```

ACC seeds a workspace at `~/.acc/workspaces/01-basic-agent/`, runs the prerequisite probes (Node.js 22+, pnpm), and starts the chapter loop.

## Credentials

- The unit tests of every chapter run offline. No API key is needed to pass the chapters.
- The end-to-end test (`tests/e2e/agent.e2e.test.ts`) calls the real model. It runs only when `ANTHROPIC_API_KEY` is set (or when you force it with `ACC_E2E_LIVE=1` because your credentials come from another provider). Without a key the test is skipped and the suite still exits 0.
- The SDK reads `ANTHROPIC_API_KEY` from the environment of the process. It does not load `.env` files. Anthropic does not allow third-party products to offer claude.ai login for SDK agents, so this course teaches the API-key path only.

## Layout

```
.claude-plugin/plugin.json   plugin manifest + accContent (lessons dir, probes)
commands/start.md            /acc-claude-sdk:start
lessons/01-basic-agent/      lesson.json, description.md, docs/, chapters.json, chapters/, reference-app/
```

## Requirements

- Node.js 22 or newer
- pnpm
- Claude Code with the `agentic-community-college` plugin enabled
