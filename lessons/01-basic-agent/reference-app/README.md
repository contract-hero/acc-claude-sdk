# Basic agent (ACC lesson 01 reference app)

A minimal agent built on the Claude Agent SDK for TypeScript: one `query()` call, one in-process MCP server with two custom tools (`add_note`, `list_notes`), and a small CLI.

## Run

```bash
pnpm install
pnpm typecheck
pnpm test
ANTHROPIC_API_KEY=sk-ant-... pnpm agent "Save a note that says hello, then list my notes"
```

- `pnpm test` runs the unit tests offline with a fake `query()`. The live end-to-end test in `tests/e2e/` runs only when `ANTHROPIC_API_KEY` is set (or `ACC_E2E_LIVE=1`). Otherwise it is skipped and the suite still exits 0.
- The SDK reads `ANTHROPIC_API_KEY` from the process environment. It does not load `.env` files.

## Files

```
src/agent.ts    runAgent(): iterate query(), stream text, collect tool calls, read the result message
src/tools.ts    notes store, add_note/list_notes tools, createNotesServer(), withNotes()
src/cli.ts      main(argv, deps): prompt in, streamed text + summary line out
tests/          one test file per chapter + tests/e2e/agent.e2e.test.ts
```
