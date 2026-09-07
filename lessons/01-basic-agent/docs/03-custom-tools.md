Source: https://code.claude.com/docs/en/agent-sdk/custom-tools, fetched 2026-09-07
(TypeScript sections only.)

# Give Claude custom tools

> Define custom tools with the Claude Agent SDK's in-process MCP server so Claude can call your functions, hit your APIs, and perform domain-specific operations.

Custom tools extend the Agent SDK by letting you define your own functions that Claude can call during a conversation. Using the SDK's in-process MCP server, you can give Claude access to databases, external APIs, domain-specific logic, or any other capability your application needs.

## Quick reference

| If you want to... | Do this |
| :--- | :--- |
| Define a tool | Use `tool()` with a name, description, schema, and handler. See [Create a custom tool](#create-a-custom-tool). |
| Register a tool with Claude | Wrap in `createSdkMcpServer` and pass to `mcpServers` in `query()`. See [Call a custom tool](#call-a-custom-tool). |
| Pre-approve a tool | Add to your allowed tools. See [Configure allowed tools](#configure-allowed-tools). |
| Remove a built-in tool from Claude's context | Pass a `tools` array listing only the built-ins you want. See [Configure allowed tools](#configure-allowed-tools). |
| Let Claude call tools in parallel | Set `readOnlyHint: true` on tools with no side effects. See [Add tool annotations](#add-tool-annotations). |
| Control the error message Claude reads | Return `isError: true` to compose the message instead of surfacing the raw exception. See [Handle errors](#handle-errors). |
| Return images or files | Use `image` or `resource` blocks in the content array. See [Other result blocks](#other-result-blocks). |
| Return a machine-readable JSON result | Set `structuredContent` on the result. See [Other result blocks](#other-result-blocks). |

## Create a custom tool

A tool is defined by four parts, passed as arguments to the `tool()` helper:

* **Name:** a unique identifier Claude uses to call the tool.
* **Description:** what the tool does. Claude reads this to decide when to call it.
* **Input schema:** the arguments Claude must provide. In TypeScript this is always a Zod schema (a raw shape, an object of Zod fields), and the handler's `args` are typed from it automatically.
* **Handler:** the async function that runs when Claude calls the tool. It receives the validated arguments and must return an object with:
  * `content` (required): an array of result blocks, each with a `type` of `"text"`, `"image"`, `"audio"`, `"resource"`, or `"resource_link"`.
  * `structuredContent` (optional): a JSON object holding the result as machine-readable data, returned alongside `content`.
  * `isError` (optional): set to `true` to signal a tool failure so Claude can react to it. See [Handle errors](#handle-errors).

After defining a tool, wrap it in a server with `createSdkMcpServer`. The server runs in-process inside your application, not as a separate process.

### Weather tool example

This example defines a `get_temperature` tool and wraps it in an MCP server. It only sets up the tool; to pass it to `query` and run it, see [Call a custom tool](#call-a-custom-tool) below.

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define a tool: name, description, input schema, handler
const getTemperature = tool(
  "get_temperature",
  "Get the current temperature at a location",
  {
    latitude: z.number().describe("Latitude coordinate"), // .describe() adds a field description Claude sees
    longitude: z.number().describe("Longitude coordinate")
  },
  async (args) => {
    // args is typed from the schema: { latitude: number; longitude: number }
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m&temperature_unit=fahrenheit`
    );
    const data: any = await response.json();

    // Return a content array - Claude sees this as the tool result
    return {
      content: [{ type: "text", text: `Temperature: ${data.current.temperature_2m}°F` }]
    };
  }
);

// Wrap the tool in an in-process MCP server
const weatherServer = createSdkMcpServer({
  name: "weather",
  version: "1.0.0",
  tools: [getTemperature]
});
```

See the `tool()` reference in `04-messages-and-results.md` for full parameter details.

> To make a parameter optional, add `.default()` to the Zod field. The `get_precipitation_chance` tool below shows the pattern.

### Call a custom tool

Pass the MCP server you created to `query` via the `mcpServers` option. The key in `mcpServers` becomes the `{server_name}` segment in each tool's fully qualified name: `mcp__{server_name}__{tool_name}`. List that name in `allowedTools` so the tool runs without a permission prompt.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What's the temperature in San Francisco?",
  options: {
    mcpServers: { weather: weatherServer },
    allowedTools: ["mcp__weather__get_temperature"]
  }
})) {
  // "result" is the final message after all tool calls complete
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

Combine this snippet with the tool and server definitions from the weather tool example in one file, then run it with `pnpm tsx weather.ts`. Claude calls `get_temperature` and the script prints a one-line answer with the current temperature in San Francisco.

### Add more tools

A server holds as many tools as you list in its `tools` array. With more than one tool on a server, you can list each one in `allowedTools` individually or use the wildcard `mcp__weather__*` to cover every tool the server exposes.

```typescript
// Define a second tool for the same server
const getPrecipitationChance = tool(
  "get_precipitation_chance",
  "Get the hourly precipitation probability for a location",
  {
    latitude: z.number(),
    longitude: z.number(),
    hours: z
      .number()
      .int()
      .min(1)
      .max(24)
      .default(12) // .default() makes the parameter optional
      .describe("How many hours of forecast to return")
  },
  async (args) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&hourly=precipitation_probability&forecast_days=1`
    );
    const data: any = await response.json();
    const chances = data.hourly.precipitation_probability.slice(0, args.hours);

    return {
      content: [{ type: "text", text: `Next ${args.hours} hours: ${chances.join("%, ")}%` }]
    };
  }
);

// Rebuild the server with both tools in the array
const weatherServer = createSdkMcpServer({
  name: "weather",
  version: "1.0.0",
  tools: [getTemperature, getPrecipitationChance]
});
```

Tool search is on by default and defers SDK MCP tools: Claude sees each tool's name in a compact list and loads its full schema on demand. With tool search disabled, every tool in this array consumes context window space on every turn. Pass `alwaysLoad: true` in the `extras` argument of `tool()` or in the options of `createSdkMcpServer()` to keep a tool's full schema in the initial prompt.

### Add tool annotations

Tool annotations are optional metadata describing how a tool behaves. Pass them as the fifth argument to the `tool()` helper. All hint fields are Booleans.

| Field | Default | Meaning |
| :--- | :--- | :--- |
| `readOnlyHint` | `false` | Tool does not modify its environment. Controls whether the tool can be called in parallel with other read-only tools. |
| `destructiveHint` | `true` | Tool may perform destructive updates. Informational only. |
| `idempotentHint` | `false` | Repeated calls with the same arguments have no additional effect. Informational only. |
| `openWorldHint` | `true` | Tool reaches systems outside your process. Informational only. |

Annotations are metadata, not enforcement. A tool marked `readOnlyHint: true` can still write to disk if that's what the handler does. Keep the annotation accurate to the handler.

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

tool(
  "get_temperature",
  "Get the current temperature at a location",
  { latitude: z.number(), longitude: z.number() },
  async (args) => ({ content: [{ type: "text", text: `...` }] }),
  { annotations: { readOnlyHint: true } } // Lets Claude batch this with other read-only calls
);
```

## Control tool access

The weather tool example registered a server and listed tools in `allowedTools`. This section covers how to scope access when you have multiple tools or want to restrict built-ins.

### Configure allowed tools

The `tools` option and the allowed/disallowed lists affect two layers: availability, which controls whether a tool appears in Claude's context, and permission, which controls whether a call is approved once Claude attempts it. `tools` and bare-name `disallowedTools` entries change availability. `allowedTools` and scoped `disallowedTools` rules change permission.

| Option | Layer | Effect |
| :--- | :--- | :--- |
| `tools: ["Read", "Grep"]` | Availability | Only the listed built-ins are in Claude's context. Unlisted built-ins are removed. MCP tools are unaffected. |
| `tools: []` | Availability | All built-ins are removed. Claude can only use your MCP tools. |
| allowed tools | Permission | Listed tools run without a permission prompt. Other unlisted tools remain available; calls go through the permission flow. |
| disallowed tools | Both | A bare tool name such as `"Bash"` removes the tool from Claude's context, the same as omitting it from `tools`. A scoped rule such as `"Bash(rm *)"` leaves the tool in context and denies only matching calls. |

To remove a built-in entirely, omit it from `tools` or list its bare name in `disallowedTools`; both keep the tool out of context so Claude never attempts it. A scoped `disallowedTools` rule blocks matching calls but leaves the tool visible, so Claude may waste a turn trying it.

This lesson uses `tools: []` (no built-ins) plus `allowedTools: ["mcp__notes__add_note", "mcp__notes__list_notes"]`.

## Handle errors

A handler error doesn't stop the agent loop. The SDK's in-process MCP server catches uncaught exceptions and returns them as error results, so how you report an error determines what Claude reads, not whether the query fails:

| What happens | Result |
| :--- | :--- |
| Handler throws an uncaught exception | The MCP server converts it to an error result carrying the raw exception message. Claude sees that message, and the agent loop continues. |
| Handler catches the error and returns `isError: true` | Claude sees the message you compose. You can add context the raw exception lacks, such as which request failed or what to try instead. |

In both cases Claude can retry, try a different tool, or explain the failure. Catch errors yourself when the raw exception message isn't enough for Claude to act on.

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

tool(
  "fetch_data",
  "Fetch data from an API",
  {
    endpoint: z.string().url().describe("API endpoint URL")
  },
  async (args) => {
    try {
      const response = await fetch(args.endpoint);

      if (!response.ok) {
        // Return the failure as a tool result so Claude can react to it.
        // isError marks this as a failed call rather than odd-looking data.
        return {
          content: [{ type: "text", text: `API error: ${response.status} ${response.statusText}` }],
          isError: true
        };
      }

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      // Composes the message Claude reads. An uncaught throw would
      // reach Claude as the raw error message with no context.
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch data: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);
```

## Other result blocks

The `content` array in a tool result accepts `text`, `image`, `audio`, `resource`, and `resource_link` blocks. You can mix them in the same response.

* **Images**: `{ type: "image", data: <base64 string, no data: prefix>, mimeType: "image/png" }`. The result is processed as visual input.
* **Resources**: `{ type: "resource", resource: { uri, mimeType?, text | blob } }`. The URI is a label for Claude to reference; the actual content rides in `text` or `blob`.
* **Structured data**: `structuredContent` is an optional JSON object on the result, separate from `content`. When set, Claude receives the JSON plus any image or resource blocks from `content`; text blocks are not forwarded, since they are assumed to duplicate the structured data.

These block shapes come from the MCP `CallToolResult` type. See https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-result for the full definition.

## See the tool calls as they happen

For each response, inspect assistant messages (which contain the tool calls Claude made during that turn) and print each `tool_use` block before printing the final result text. This lets you see when Claude is using the tool versus answering from its own knowledge.

Because tool search is on by default, the output may also include a `ToolSearch` call as Claude loads the deferred tool schema.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

try {
  for await (const message of query({
    prompt: "Convert 100 kilometers to miles.",
    options: {
      mcpServers: { converter: converterServer },
      allowedTools: ["mcp__converter__convert_units"]
    }
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "tool_use") {
          console.log(`[tool call] ${block.name}`, block.input);
        }
      }
    } else if (message.type === "result" && message.subtype === "success") {
      console.log(`A: ${message.result}`);
    }
  }
} catch (error) {
  // A single-shot query() throws after yielding an error result. Only success
  // results are logged above, so handle the failure here.
  console.error(`Call failed: ${error}`);
}
```

## Next steps

* If your server grows to dozens of tools, see tool search: https://code.claude.com/docs/en/agent-sdk/tool-search
* To connect to external MCP servers (filesystem, GitHub, Slack) instead of building your own: https://code.claude.com/docs/en/agent-sdk/mcp
* To control which tools run automatically versus requiring approval: https://code.claude.com/docs/en/agent-sdk/permissions
