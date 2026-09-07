Sources: https://code.claude.com/docs/en/agent-sdk/overview and https://code.claude.com/docs/en/agent-sdk/quickstart, fetched 2026-09-07

# Authentication for SDK agents

## The rule: use an API key

Get an API key from the Claude Console (https://platform.claude.com/) and set it as an environment variable in the shell where you run your agent:

```bash
export ANTHROPIC_API_KEY=your-api-key
```

The SDK reads the key from the environment of the process that runs your agent. Every `query()` call spawns the Claude Code harness as a subprocess, which inherits `process.env` unless you pass `options.env` (and if you do, spread `process.env` yourself or the subprocess loses `PATH`, `HOME` and `ANTHROPIC_API_KEY`).

## No claude.ai login for SDK products

From the official docs, verbatim:

> Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Please use the API key authentication methods described in this document instead.

This is why the lesson teaches the API-key path only. Do not build a product that asks its users to log in with their claude.ai account or to reuse their Claude Code subscription.

## `.env` files are not loaded

From the quickstart:

> The SDK reads the key from the environment of the process that runs your agent; it doesn't load `.env` files automatically. If you keep the key in a `.env` file, load it yourself, for example with the `dotenv` package, before calling the SDK.

So `ANTHROPIC_API_KEY=... pnpm agent "..."` works, and a `.env` file next to `package.json` does not, unless your code loads it before the first `query()`.

## Third-party providers

The SDK also authenticates through these providers. Set the flag and configure the provider's own credentials:

* **Amazon Bedrock**: `CLAUDE_CODE_USE_BEDROCK=1` plus AWS credentials
* **Claude Platform on AWS**: `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` and `ANTHROPIC_AWS_WORKSPACE_ID`, plus AWS credentials
* **Google Cloud's Agent Platform**: `CLAUDE_CODE_USE_VERTEX=1` plus Google Cloud credentials
* **Microsoft Foundry**: `CLAUDE_CODE_USE_FOUNDRY=1` plus Azure credentials

## How to tell which credential a run used

The first message of every run is the `system` / `init` message. Its `apiKeySource` field reports where the credential came from: `'ANTHROPIC_API_KEY'` (environment variable), `'apiKeyHelper'` (the configured helper command), `'/login managed key'`, or `'none'` (no API key in use, for example a third-party provider). See `SDKSystemMessage` in `04-messages-and-results.md`.

## Errors you will see without a key

> If you see an authentication error such as `Not logged in` or `Invalid API key`, make sure you've set the `ANTHROPIC_API_KEY` environment variable in the shell where you run your agent.

In the message stream an API-level failure shows up as an assistant message with `error: 'authentication_failed'` followed by a `result` message with `subtype: 'success'` and `is_error: true`, whose `result` field holds the error text. `runAgent` in this lesson turns that into an `AgentError` with subtype `api_error`.

## The e2e gate in this lesson

`tests/e2e/agent.e2e.test.ts` spawns the real harness and calls the model. It is wrapped in:

```typescript
const live = !!process.env.ANTHROPIC_API_KEY || process.env.ACC_E2E_LIVE === '1';
describe.skipIf(!live)('live agent (needs ANTHROPIC_API_KEY or ACC_E2E_LIVE=1)', () => { ... });
```

* No key: the describe is skipped, the reason is visible in the vitest output, and `pnpm test` still exits 0.
* `ANTHROPIC_API_KEY` set: the test runs against the API and costs a fraction of a cent.
* `ACC_E2E_LIVE=1`: forces the test on when your credentials come from a third-party provider instead of the environment variable.
