Source: https://code.claude.com/docs/en/agent-sdk/quickstart, fetched 2026-09-07
(TypeScript sections only. The upstream page uses npm; the commands below use pnpm.)

# Quickstart

> Get started with the TypeScript Agent SDK to build AI agents that work autonomously

Use the Agent SDK to build an AI agent that reads your code, finds bugs, and fixes them, all without manual intervention.

**What you'll do:**

1. Set up a project with the Agent SDK
2. Create a file with some buggy code
3. Run an agent that finds and fixes the bugs automatically

## Prerequisites

* **Node.js 18+** (this course targets Node.js 22)
* An **Anthropic account**. If you don't have one, sign up at https://platform.claude.com/

## Setup

### Create a project folder

```bash
mkdir my-agent
cd my-agent
```

For your own projects, you can run the SDK from any folder; it will have access to files in that directory and its subdirectories by default.

### Install the SDK

New project:

```bash
pnpm init
pnpm pkg set type=module
pnpm add @anthropic-ai/claude-agent-sdk
pnpm add -D tsx
```

Setting `"type": "module"` in `package.json` lets your agent script use top-level `await`, and tsx runs TypeScript files directly.

Existing project:

```bash
pnpm add @anthropic-ai/claude-agent-sdk
pnpm add -D tsx
```

If your project uses CommonJS, name your agent script `agent.mts` instead of `agent.ts`. The `.mts` extension makes tsx treat the file as an ES module, so top-level `await` works without converting your whole project to ES modules.

> The TypeScript SDK bundles a native Claude Code binary, so most installs need no separate Claude Code install. The binary comes through npm optional dependencies, so an install that skips them (for example `--omit=optional`) gets no binary even on a supported platform. Reinstall without skipping optional dependencies, or install Claude Code natively and set `pathToClaudeCodeExecutable` to its path.

### Set your API key

Get an API key from the Claude Console (https://platform.claude.com/), then set it as an environment variable in the shell where you'll run your agent:

macOS / Linux:

```bash
export ANTHROPIC_API_KEY=your-api-key
```

Windows (PowerShell):

```powershell
$env:ANTHROPIC_API_KEY = "your-api-key"
```

The SDK reads the key from the environment of the process that runs your agent; it doesn't load `.env` files automatically. If you keep the key in a `.env` file, load it yourself, for example with the `dotenv` package, before calling the SDK.

The SDK also supports authentication via third-party API providers:

* **Amazon Bedrock**: set `CLAUDE_CODE_USE_BEDROCK=1` environment variable and configure AWS credentials
* **Claude Platform on AWS**: set `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` and `ANTHROPIC_AWS_WORKSPACE_ID`, then configure AWS credentials
* **Google Cloud's Agent Platform**: set `CLAUDE_CODE_USE_VERTEX=1` environment variable and configure Google Cloud credentials
* **Microsoft Foundry**: set `CLAUDE_CODE_USE_FOUNDRY=1` environment variable and configure Azure credentials

> Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Please use the API key authentication methods described in this document instead.

## Create a buggy file

Create `utils.py` in the `my-agent` directory and paste the following code:

```python
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)


def get_user_name(user):
    return user["name"].upper()
```

This code has two bugs:

1. `calculate_average([])` crashes with division by zero
2. `get_user_name(None)` crashes with a TypeError

## Build an agent that finds and fixes bugs

Create `agent.ts` (or `agent.mts` if your existing project uses CommonJS):

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

// Agentic loop: streams messages as Claude works
for await (const message of query({
  prompt: "Review utils.py for bugs that would cause crashes. Fix any issues you find.",
  options: {
    allowedTools: ["Read", "Edit", "Glob"], // Auto-approve these tools
    permissionMode: "acceptEdits" // Auto-approve file edits
  }
})) {
  // Print human-readable output
  if (message.type === "assistant" && message.message?.content) {
    for (const block of message.message.content) {
      if ("text" in block) {
        console.log(block.text); // Claude's reasoning
      } else if ("name" in block) {
        console.log(`Tool: ${block.name}`); // Tool being called
      }
    }
  } else if (message.type === "result") {
    console.log(`Done: ${message.subtype}`); // Final result
  }
}
```

This code has three main parts:

1. **`query`**: the main entry point that creates the agentic loop. It returns an async iterator, so you use `for await` to stream messages as Claude works. See `04-messages-and-results.md` for the full signature.

2. **`prompt`**: what you want Claude to do. Claude figures out which tools to use based on the task.

3. **`options`**: configuration for the agent. This example uses `allowedTools` to pre-approve `Read`, `Edit`, and `Glob`, and `permissionMode: "acceptEdits"` to auto-approve file changes. Other options include `systemPrompt`, `mcpServers`, and more.

The `for await` loop keeps running as Claude thinks, calls tools, observes results, and decides what to do next. Each iteration yields a message: Claude's reasoning, a tool call, a tool result, or the final outcome. The SDK handles the orchestration, tool execution, context management, and retries, so you consume the stream. The loop ends when Claude finishes the task or hits an error.

The message handling inside the loop filters for human-readable output. Without filtering, you'd see raw message objects including system initialization and internal state, which is useful for debugging but noisy otherwise.

> This example uses streaming to show progress in real-time. If you don't need live output (e.g., for background jobs or CI pipelines), you can collect all messages at once.

### Run your agent

```bash
pnpm tsx agent.ts
```

As it works, the agent prints its reasoning and each tool it calls, ending with `Done: success`. After running, check `utils.py`. You'll see defensive code handling empty lists and null users. Your agent autonomously:

1. **Read** `utils.py` to understand the code
2. **Analyzed** the logic and identified edge cases that would crash
3. **Edited** the file to add proper error handling

This is what makes the Agent SDK different: Claude executes tools directly instead of asking you to implement them.

> If you see an authentication error such as `Not logged in` or `Invalid API key`, make sure you've set the `ANTHROPIC_API_KEY` environment variable in the shell where you run your agent. The SDK doesn't load `.env` files automatically.

### Try other prompts

* `"Add docstrings to all functions in utils.py"`
* `"Add type hints to all functions in utils.py"`
* `"Create a README.md documenting the functions in utils.py"`

### Customize your agent

**Add web search capability:**

```typescript
const _ = {
  options: {
    allowedTools: ["Read", "Edit", "Glob", "WebSearch"],
    permissionMode: "acceptEdits"
  }
};
```

**Give Claude a custom system prompt:**

```typescript
const _ = {
  options: {
    allowedTools: ["Read", "Edit", "Glob"],
    permissionMode: "acceptEdits",
    systemPrompt: "You are a senior Python developer. Always follow PEP 8 style guidelines."
  }
};
```

**Run commands in the terminal:**

```typescript
const _ = {
  options: {
    allowedTools: ["Read", "Edit", "Glob", "Bash"],
    permissionMode: "acceptEdits"
  }
};
```

With `Bash` enabled, try: `"Write unit tests for utils.py, run them, and fix any failures"`

## Key concepts

**Tools** control what your agent can do:

| Tools | What the agent can do |
| --- | --- |
| `Read`, `Glob`, `Grep` | Read-only analysis |
| `Read`, `Edit`, `Glob` | Analyze and modify code |
| `Read`, `Edit`, `Bash`, `Glob`, `Grep` | Full automation |

**Permission modes** control how much human oversight you want. The SDK evaluates the active mode together with your allow and deny rules in a fixed order. See `PermissionMode` in `04-messages-and-results.md` for the list of modes.

In this lesson the agent gets no built-in tools at all (`tools: []`) and only the custom `notes` tools, pre-approved through `allowedTools`. The quickstart above shows the other common setup: built-in tools with `permissionMode: "acceptEdits"`.

## Next steps

* **Permissions**: https://code.claude.com/docs/en/agent-sdk/permissions
* **Hooks**: https://code.claude.com/docs/en/agent-sdk/hooks
* **Sessions**: https://code.claude.com/docs/en/agent-sdk/sessions
* **MCP servers**: https://code.claude.com/docs/en/agent-sdk/mcp
* **Troubleshooting**: https://code.claude.com/docs/en/agent-sdk/troubleshooting
