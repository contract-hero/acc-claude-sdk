Source: https://code.claude.com/docs/en/agent-sdk/typescript, fetched 2026-09-07
(Extract: the functions, options and message types this lesson uses. Signatures checked against `sdk.d.ts` of `@anthropic-ai/claude-agent-sdk@0.3.263`.)

# Agent SDK reference (TypeScript), lesson extract

## Functions

### `query()`

The primary function for interacting with Claude Code. Creates an async generator that streams messages as they arrive.

```typescript
function query({
  prompt,
  options
}: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `prompt` | `string \| AsyncIterable<SDKUserMessage>` | The input prompt as a string or async iterable for streaming mode |
| `options` | `Options` | Optional configuration object (see Options below) |

Returns a `Query` object that extends `AsyncGenerator<SDKMessage, void>` with additional control methods.

```typescript
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<SDKControlInterruptResponse | undefined>;
  close(): void;
  // ... more control methods, most only available in streaming input mode
}
```

For a one-shot string prompt you only need the iterator: `for await (const message of query({ prompt, options })) { ... }`. The generator ends after the `result` message. In single-prompt mode a `query()` that yielded an error result throws afterwards, so return or throw as soon as you see the `result` message, or wrap the loop in `try/catch`.

### `tool()`

Creates a type-safe MCP tool definition for use with SDK MCP servers.

```typescript
function tool<Schema extends AnyZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>,
  extras?: { annotations?: ToolAnnotations; searchHint?: string; alwaysLoad?: boolean }
): SdkMcpToolDefinition<Schema>;
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The name of the tool |
| `description` | `string` | A description of what the tool does |
| `inputSchema` | `Schema extends AnyZodRawShape` | Zod raw shape defining the tool's input parameters (supports both Zod 3 and Zod 4). A raw shape is a plain object of Zod fields, for example `{ text: z.string() }`, not `z.object(...)`. |
| `handler` | `(args, extra) => Promise<CallToolResult>` | Async function that executes the tool logic. `args` is typed from the shape. |
| `extras` | `{ annotations?, searchHint?, alwaysLoad? }` | Optional. `annotations` provides MCP behavioral hints. `alwaysLoad: true` keeps this tool's full schema in the initial prompt instead of deferring it behind tool search. |

The returned `SdkMcpToolDefinition` exposes what you passed in: `.name`, `.description`, `.inputSchema`, `.annotations` and `.handler`. Tests can call `.handler(args, {})` directly.

`CallToolResult` comes from `@modelcontextprotocol/sdk/types.js`. The minimal shape is `{ content: [{ type: "text", text: string }], isError?: boolean }`.

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const searchTool = tool(
  "search",
  "Search the web",
  { query: z.string() },
  async ({ query }) => {
    return { content: [{ type: "text", text: `Results for: ${query}` }] };
  },
  { annotations: { readOnlyHint: true, openWorldHint: true } }
);
```

### `createSdkMcpServer()`

Creates an MCP server instance that runs in the same process as your application.

```typescript
function createSdkMcpServer(options: {
  name: string;
  version?: string;
  instructions?: string;
  tools?: Array<SdkMcpToolDefinition<any>>;
  alwaysLoad?: boolean;
  timeout?: number;
}): McpSdkServerConfigWithInstance;
```

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `options.name` | `string` | The name of the MCP server |
| `options.version` | `string` | Optional version string |
| `options.instructions` | `string` | Optional server instructions, surfaced to the model as an MCP instructions block |
| `options.tools` | `Array<SdkMcpToolDefinition>` | Array of tool definitions created with `tool()` |
| `options.alwaysLoad` | `boolean` | When `true`, every tool from this server stays in the initial prompt and is never deferred behind tool search |
| `options.timeout` | `number` | Timeout in milliseconds for this server's tool calls (whole number, at least 1000) |

The return value is the config you pass to `mcpServers`:

```typescript
type McpSdkServerConfigWithInstance = {
  type: "sdk";
  name: string;
  timeout?: number;
  instance: McpServer; // from @modelcontextprotocol/sdk/server/mcp.js
};
```

`mcpServers` accepts other server kinds too (`McpStdioServerConfig`, `McpSSEServerConfig`, `McpHttpServerConfig`); this lesson only uses the in-process `sdk` kind.

## Types

### `Options` (selected properties)

Configuration object for the `query()` function.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `allowedTools` | `string[]` | `[]` | Tools to auto-approve without prompting. This does not restrict Claude to only these tools. Other unlisted tools fall through to `permissionMode` and `canUseTool`. Use `disallowedTools` to block tools. |
| `tools` | `string[] \| { type: 'preset'; preset: 'claude_code' }` | `undefined` | Base set of available built-in tools. Pass an array of tool names, `[]` to disable all built-in tools, or the preset to get Claude Code's default tools. MCP tools are unaffected. |
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP server configurations. Keys are server names; each tool becomes `mcp__<key>__<tool name>`. |
| `settingSources` | `SettingSource[]` | CLI defaults (all sources) | Control which filesystem settings to load. Pass `[]` to disable user, project, and local settings (SDK isolation mode). Must include `'project'` to load CLAUDE.md files. |
| `maxTurns` | `number` | `undefined` | Maximum agentic turns (tool-use round trips). When reached the result has `subtype: 'error_max_turns'`. |
| `model` | `string` | Default from CLI | Claude model alias or full model name. |
| `systemPrompt` | `string \| string[] \| { type: 'preset'; preset: 'claude_code'; append?: string }` | `undefined` (minimal prompt) | Pass a string for a custom prompt, or the preset object to use Claude Code's system prompt, optionally with `append`. |
| `cwd` | `string` | `process.cwd()` | Current working directory for the session. |
| `permissionMode` | `PermissionMode` | `'default'` | Permission mode for the session. |

```typescript
type SettingSource = "user" | "project" | "local";
// 'user'    ~/.claude/settings.json
// 'project' .claude/settings.json
// 'local'   .claude/settings.local.json

type PermissionMode =
  | "default"           // Standard permission behavior
  | "acceptEdits"       // Auto-accept file edits
  | "bypassPermissions" // Bypass permission checks; explicit ask rules still prompt
  | "plan"              // Planning mode - explore without editing
  | "dontAsk"           // Don't prompt for permissions, deny if not pre-approved
  | "auto";             // Model classifier approves or denies permission prompts
```

When `settingSources` is omitted, `query()` loads the same filesystem settings as the Claude Code CLI: user, project, and local. Programmatic options such as `allowedTools` override filesystem settings.

## Message types

### `SDKMessage`

Union type of all possible messages returned by the query. Discriminate on `type`, and on `subtype` for `system` and `result` messages. The set grows over time: ignore types and subtypes you do not recognize.

```typescript
type SDKMessage =
  | SDKAssistantMessage        // type: "assistant"
  | SDKUserMessage             // type: "user"  (tool results fed back to the model)
  | SDKUserMessageReplay       // type: "user", isReplay: true
  | SDKResultMessage           // type: "result"
  | SDKSystemMessage           // type: "system", subtype: "init"
  | SDKPartialAssistantMessage // type: "stream_event" (only with includePartialMessages)
  | SDKCompactBoundaryMessage  // type: "system", subtype: "compact_boundary"
  | SDKStatusMessage           // type: "system", subtype: "status"
  | ...                        // hooks, tasks, plugins, rate limits, notifications, and more
```

### `SDKAssistantMessage`

Assistant response message.

```typescript
type SDKAssistantMessage = {
  type: "assistant";
  uuid: UUID;
  session_id: string;
  message: BetaMessage; // From Anthropic SDK
  parent_tool_use_id: string | null;
  error?: SDKAssistantMessageError;
  aborted?: true;
  timestamp?: string;
};
```

The `message` field is a `BetaMessage` from the Anthropic SDK. It includes fields like `id`, `content`, `model`, `stop_reason`, and `usage`. `content` is an array of blocks; the two you handle in this lesson are:

```typescript
{ type: "text"; text: string }
{ type: "tool_use"; id: string; name: string; input: unknown }
```

When streamed, one assistant message typically holds the single block it delivers, so a turn with text and a tool call arrives as several assistant messages. Concatenate the text blocks in arrival order.

`error`, when present, names an API-level failure: `'authentication_failed'`, `'billing_error'`, `'rate_limit'`, `'overloaded'`, `'invalid_request'`, `'model_not_found'`, `'server_error'`, `'max_output_tokens'`, or `'unknown'`, among others.

### `SDKUserMessage`

User input message. In the output stream it carries tool results back to the model.

```typescript
type SDKUserMessage = {
  type: "user";
  message: MessageParam; // From Anthropic SDK; content holds the tool_result blocks
  parent_tool_use_id: string | null;
  tool_use_result?: unknown; // the tool's structured output, not the text sent to the model
};
```

### `SDKResultMessage`

Final result message. The CLI emits exactly one result message per turn, after that turn's assistant and user messages. Treat it as the turn-complete signal.

```typescript
type SDKResultMessage =
  | {
      type: "result";
      subtype: "success";
      uuid: UUID;
      session_id: string;
      duration_ms: number;
      duration_api_ms: number;
      is_error: boolean;
      num_turns: number;
      result: string;
      stop_reason: string | null;
      total_cost_usd: number;
      usage: NonNullableUsage;
      modelUsage: { [modelName: string]: ModelUsage };
      permission_denials: SDKPermissionDenial[];
    }
  | {
      type: "result";
      subtype:
        | "error_max_turns"
        | "error_during_execution"
        | "error_max_budget_usd"
        | "error_max_structured_output_retries";
      uuid: UUID;
      session_id: string;
      duration_ms: number;
      duration_api_ms: number;
      is_error: boolean;
      num_turns: number;
      stop_reason: string | null;
      total_cost_usd: number;
      usage: NonNullableUsage;
      modelUsage: { [modelName: string]: ModelUsage };
      permission_denials: SDKPermissionDenial[];
      errors: string[];
    };
```

* `result` (success arm only): the final assistant text. With `is_error: true` it holds the error text of an API error that ended the turn (for example an invalid key). Check `is_error` before you trust `result`.
* `errors` (error arms only): why the turn stopped early.
* `num_turns`: the number of agentic turns used. `maxTurns` caps it.
* `total_cost_usd`: cumulative estimated cost in USD for this `query()` call. It is an estimate, not a billing statement.
* `usage`: main agent loop only. Prefer `modelUsage` for token accounting.
* `api_error_status?` (success arm): the HTTP status code of the API error that terminated the conversation, absent or `null` otherwise. `terminal_reason?` (both arms) names why the loop ended, for example `"completed"`, `"max_turns"`, `"api_error"`.

### `SDKSystemMessage`

System initialization message. It is the first message of every run.

```typescript
type SDKSystemMessage = {
  type: "system";
  subtype: "init";
  uuid: UUID;
  session_id: string;
  apiKeySource: ApiKeySource; // 'ANTHROPIC_API_KEY' | 'apiKeyHelper' | '/login managed key' | 'none' | ...
  claude_code_version: string;
  cwd: string;
  tools: string[];            // built-in and MCP tool names available to the model
  mcp_servers: { name: string; status: string }[];
  model: string;
  permissionMode: PermissionMode;
  slash_commands: string[];
  output_style: string;
  skills: string[];
  plugins: { name: string; path: string; version?: string }[];
  capabilities?: string[];
};
```

Use it to confirm the run is configured the way you expect: `tools` should list your `mcp__notes__*` tools and nothing else when `tools: []` is set, and `mcp_servers` should show `{ name: 'notes', status: 'connected' }`.

## Reading the stream: the pattern this lesson uses

```typescript
let text = "";
const toolCalls: Array<{ name: string; input: unknown }> = [];

for await (const message of query({ prompt, options })) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") toolCalls.push({ name: block.name, input: block.input });
    }
  } else if (message.type === "result") {
    if (message.subtype !== "success") throw new Error(`${message.subtype}: ${message.errors.join("; ")}`);
    if (message.is_error) throw new Error(`api_error: ${message.result}`);
    return { text, result: message.result, numTurns: message.num_turns, costUsd: message.total_cost_usd };
  }
}
```
