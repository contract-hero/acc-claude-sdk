# Chapter 1: Run a query and read the result

## What we implement

`src/agent.ts` exports `runAgent()`. It calls the SDK's `query()` with a prompt and options and iterates the message stream with `for await`. Every assistant text block is appended to `text` and forwarded to an optional `onText` callback, so a caller can stream the answer. Every `tool_use` block is recorded in `toolCalls`. The `result` message ends the run: on `success` we return its `result`, `num_turns`, `total_cost_usd` and `session_id`; on an error subtype we throw `AgentError`. The function accepts an injectable `queryFn`, so the tests run offline against a fake stream.

## Done when

`pnpm vitest run tests/01-run-query.test.ts` is green. The tests:

- **concatenates assistant text blocks in order and streams each chunk to onText**: two text blocks become `'Hello, world.'` and `onText` receives `['Hello, ', 'world.']`.
- **reads result, numTurns, costUsd and sessionId from the result message**: the returned `AgentRun` mirrors `result`, `num_turns`, `total_cost_usd` and `session_id`.
- **records every tool_use block with its name and input**: `toolCalls` lists `{ name, input }` in arrival order.
- **throws AgentError with subtype and errors when the result reports a failure**: an `error_max_turns` result gives `AgentError { subtype: 'error_max_turns', errors }`; a `success` result with `is_error: true` gives `AgentError { subtype: 'api_error', errors: [result] }`.
- **passes the prompt through and applies isolation defaults unless the caller overrides them**: the fake `query()` receives the prompt and `{ tools: [], settingSources: [] }`; `options: { tools: ['Read'], maxTurns: 2 }` wins over the defaults while `settingSources: []` stays.

## Implementation notes

- Read `docs/04-messages-and-results.md` first: `query()`, `Options`, `SDKMessage`, `SDKAssistantMessage`, `SDKResultMessage`. `docs/02-quickstart.md` shows the `for await` loop.
- Signature: `query({ prompt, options }): Query`, where `Query extends AsyncGenerator<SDKMessage, void>`. Import `query` and `type Options` from `@anthropic-ai/claude-agent-sdk`. Export `type QueryFn = typeof query` so tests and the CLI can inject a fake.
- Narrow on `message.type`. For `'assistant'`, iterate `message.message.content`: blocks with `type === 'text'` carry `.text`; blocks with `type === 'tool_use'` carry `.name` and `.input`.
- For `'result'`, narrow on `message.subtype`. `'success'` has `result`, `num_turns`, `total_cost_usd`, `session_id`. The error subtypes (`error_during_execution`, `error_max_turns`, `error_max_budget_usd`, `error_max_structured_output_retries`) have `errors: string[]` and no `result`.
- The result message is the only place to read the final answer, the turn count and the cost. Exactly one is emitted per query. Return or throw when you see it.
- A `success` result can carry `is_error: true` when the turn ended on an API error (bad key, billing, overload). Then `result` holds the error text. Treat it as a failure.
- Defaults: merge `{ settingSources: [], tools: [] }` under the caller's options (`{ ...defaults, ...input.options }`). `tools: []` removes every built-in tool (Read, Bash, ...). `settingSources: []` keeps the learner's own Claude Code settings, plugins and CLAUDE.md files out of the run.
- `tests/helpers/fakeQuery.ts` yields plain objects with real `type` / `subtype` fields and never runs tool handlers. Read it before implementing.
- Do not edit `package.json`, `tsconfig.json` or anything under `tests/`. Only `src/agent.ts` is expected.
