# Chapter 2: Give the agent a custom in-process tool

## What we implement

`src/tools.ts` gives the agent a notebook. `createNotesStore()` returns an in-memory store with `add(text)` and `list()`. `createNotesTools(store)` defines two tools with `tool()`: `add_note` (schema `{ text: z.string() }`) and `list_notes` (no arguments). Each handler mutates or reads the store and returns one text content block. `createNotesServer(store)` wraps both in an in-process MCP server named `notes` with `createSdkMcpServer()`. `withNotes(options, store)` returns the options extended with `mcpServers.notes` and the two fully qualified tool names in `allowedTools`, so the agent calls them without a permission prompt.

## Done when

`pnpm vitest run tests/02-custom-tool.test.ts` is green. The tests:

- **add_note returns a text content block and stores the note**: `addNote.handler({ text: 'buy milk' }, {})` returns `{ content: [{ type: 'text', text }] }` with the note text, and `store.list()` equals `[{ id: 1, text: 'buy milk' }]`.
- **list_notes returns every note in insertion order**: after `add('first')` and `add('second')`, the text contains `#1: first` before `#2: second`.
- **names the tools so that their fully qualified names match NOTES_ALLOWED_TOOLS**: tool names are `add_note` and `list_notes`; `NOTES_ALLOWED_TOOLS` equals `['mcp__notes__add_note', 'mcp__notes__list_notes']`.
- **createNotesServer returns an in-process sdk server named notes**: the config has `type: 'sdk'`, `name: 'notes'` and an `instance`.
- **withNotes adds mcpServers.notes and the allowed tool names without dropping existing options**: `maxTurns`, `settingSources` and an existing `allowedTools: ['Read']` survive; `allowedTools` becomes `['Read', 'mcp__notes__add_note', 'mcp__notes__list_notes']`.

## Implementation notes

- Read `docs/03-custom-tools.md` (create a tool, call a tool, control tool access) and the `tool()` / `createSdkMcpServer()` sections of `docs/04-messages-and-results.md`.
- `tool(name, description, zodRawShape, handler, extras?)` returns `SdkMcpToolDefinition` with `.name`, `.description`, `.inputSchema` and `.handler`. The schema is a raw shape (a plain object of Zod fields), not `z.object()`. Use `import { z } from 'zod'` (Zod 4). An empty shape `{}` means no arguments.
- The handler is `async (args, extra) => CallToolResult`. Return `{ content: [{ type: 'text', text }] }`. `args` is typed from the shape.
- `createSdkMcpServer({ name: 'notes', version: '1.0.0', tools: [addNote, listNotes] })` returns `McpSdkServerConfigWithInstance`, that is `{ type: 'sdk', name, instance }`. Pass it as `options.mcpServers = { notes: server }`.
- Tool names are `mcp__<server key>__<tool name>`. The server key is the key you use in `mcpServers`, so `notes` gives `mcp__notes__add_note`. List the full names in `allowedTools` so the calls run without a permission prompt.
- The store lives in our process and the handlers close over it. That is why the CLI (chapter 3) can count the saved notes after the run.
- Export `createNotesTools` so the tests can call the handlers directly. The server instance does not expose them.
- Keep the existing entries when extending `allowedTools` and `mcpServers` in `withNotes`; spread, do not replace.
- Do not edit `package.json`, `tsconfig.json` or anything under `tests/`. Only `src/tools.ts` is expected. `src/agent.ts` stays as it is.
