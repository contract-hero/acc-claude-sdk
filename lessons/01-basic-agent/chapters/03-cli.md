# Chapter 3: Wrap it in a tiny CLI

## What we implement

`src/cli.ts` exports `main(argv, deps)`. The prompt is `argv` joined with spaces. An empty prompt prints usage to stderr and returns exit code 2. Otherwise `main` creates a notes store, builds options with `withNotes({ maxTurns: 10 }, store)`, and calls `runAgent()` with an `onText` that writes every chunk to stdout as it arrives. After the run it prints one summary line, `[done] turns=<n> cost=$<x.xxxx> notes=<count>`, and returns 0. An `AgentError` becomes `[error] <subtype>: <errors>` on stderr with exit code 1. A guard runs `main()` with the real streams only when the file is executed directly, which is what `pnpm agent "..."` does.

## Done when

`pnpm vitest run tests/03-cli.test.ts` is green. The tests:

- **prints usage to stderr and returns 2 when no prompt is given**: `main([], deps)` returns 2, stderr matches `/usage/i`, stdout is empty and `query()` is never called.
- **streams assistant text to stdout and prints the [done] summary line**: stdout is exactly `'Hello there.\n[done] turns=2 cost=$0.0042 notes=0\n'`, the code is 0, stderr is empty, and `['say', 'hello']` reaches `query()` as `'say hello'`.
- **wires the notes server, the allowed tools and the isolation defaults into the query options**: the recorded options have `mcpServers.notes` with `type: 'sdk'`, both `mcp__notes__*` names in `allowedTools`, `tools: []` and `settingSources: []`.
- **prints an [error] line to stderr and returns 1 on AgentError**: an `error_during_execution` result with `['boom']` gives stderr `'[error] error_during_execution: boom\n'` and code 1.

## Implementation notes

- Reuse chapters 1 and 2: `runAgent`, `AgentError` and `QueryFn` from `./agent.js`; `createNotesStore` and `withNotes` from `./tools.js`. ESM with `moduleResolution: NodeNext` needs the `.js` extension in relative imports.
- `deps` is `{ queryFn?: QueryFn; stdout: { write(s: string): unknown }; stderr: { write(s: string): unknown } }`. Pass `deps.queryFn` straight to `runAgent`; when it is `undefined`, `runAgent` falls back to the real `query`.
- The summary line uses `run.numTurns`, `run.costUsd.toFixed(4)` and `store.list().length`. The fake `query()` never runs handlers, so the tests expect `notes=0`. In a live run the handlers mutate the same store, so the count is real.
- Guard: `const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href`, with `pathToFileURL` from `node:url`. Only then call `main(process.argv.slice(2), { stdout: process.stdout, stderr: process.stderr })` and exit with the returned code. Importing the module from a test must not start an agent.
- Running it for real needs `ANTHROPIC_API_KEY` in the environment (see `docs/05-auth.md`). The SDK does not read `.env`.
- Do not edit `package.json`, `tsconfig.json` or anything under `tests/`. Only `src/cli.ts` is expected.
