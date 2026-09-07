Source: https://code.claude.com/docs/en/agent-sdk/overview, fetched 2026-09-07

# Agent SDK overview

> Build production AI agents with Claude Code as a library

An agent is an application that completes a task by planning its own steps and calling tools that read files, run commands, or edit code. The Agent SDK gives you the same tools, agent loop, and context management that power Claude Code, programmable in Python and TypeScript. This course uses TypeScript.

## Compare the Agent SDK to other Claude tools

| If you're... | Use | Why |
| --- | --- | --- |
| Building an agent without implementing the tool loop yourself | **Agent SDK** | A library that runs the agent loop in your own process, in Python or TypeScript. |
| Doing interactive development or running one-off tasks from a terminal | **Claude Code CLI** | The terminal interface, built for daily interactive use. |
| Calling the API directly and implementing the tool loop yourself | **Client SDK** | Direct access to the Anthropic API rather than to Claude Code. You implement the tool loop yourself. |
| Running long-running or asynchronous agents without managing your own sandbox or session infrastructure | **Managed Agents** | Hosted REST API, a separate product from the Agent SDK. Anthropic runs the agent and the sandbox. |

The SDK is available as a library for Python and TypeScript only. To drive the same agent loop from another language, run the CLI as a subprocess with the `-p` flag and `--output-format json`.

## Capabilities

These Claude Code capabilities are available in the SDK:

| Capability | What it does |
| --- | --- |
| Built-in tools | Read, write, edit files, run commands, and search the web |
| Hooks | Run custom code at key points in the agent lifecycle |
| Subagents | Spawn specialized agents for focused subtasks |
| MCP | Connect external tools and data sources via the Model Context Protocol |
| Permissions | Control which tools run automatically, which need approval |
| Sessions | Maintain context across exchanges, resume or fork later |
| Skills, commands, and memory | Load automatically from your project's `.claude/` and from `~/.claude/`, same as Claude Code |
| Plugins | Package skills, agents, hooks, and MCP servers, and load them by local path |

This lesson uses three of them: the agent loop through `query()`, MCP through an in-process server with custom tools, and permissions through `allowedTools`. It turns the built-in tools off (`tools: []`) and does not load your local `.claude/` configuration (`settingSources: []`), so the run depends only on the code in the lesson.

## Get started

Follow the Quickstart (`02-quickstart.md`) to install the SDK, set your API key, and build your first agent.

> Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods described in the Quickstart instead.

## How the pieces fit

```
your program
  └── query({ prompt, options })          starts the Claude Code harness in a subprocess
        ├── system  { subtype: 'init' }   model, tools, MCP servers, session id
        ├── assistant                     text blocks + tool_use blocks
        ├── user                          tool results (fed back to the model)
        ├── ...                           repeats while the model calls tools
        └── result                        final text, num_turns, total_cost_usd, or an error subtype
```

The SDK handles orchestration, tool execution, context management and retries. Your code consumes the stream and reacts to the messages it cares about.

## Next steps

- Quickstart: build your first agent (`02-quickstart.md`)
- Custom tools: give Claude your own functions (`03-custom-tools.md`)
- TypeScript reference: the parts used in this lesson (`04-messages-and-results.md`)
- Full TypeScript reference: https://code.claude.com/docs/en/agent-sdk/typescript
- Example agents: https://github.com/anthropics/claude-agent-sdk-demos
