# acc-claude-sdk: Claude's working notes

This repository is an ACC **course plugin**. It contains content only: a plugin manifest, one start command, and lessons. There is no runtime code here. ACC (`agentic-community-college`) discovers this plugin through `accContent` in `.claude-plugin/plugin.json` and runs the lessons.

## Stack

- TypeScript only (`.ts`), ESM (`"type": "module"`), Node.js 22+.
- pnpm only. Never npm or yarn. Commit `pnpm-lock.yaml` inside each `reference-app/`.
- Tests with vitest. Type checks with `tsc --noEmit`.
- SDK: `@anthropic-ai/claude-agent-sdk` (pinned `^0.3.263`), `zod` v4.

## Lesson layout (ACC v0.3)

```
lessons/<slug>/
├── lesson.json          identity, prerequisites, workspace seeding rules
├── description.md       what the learner builds, why, prerequisites, time
├── docs/                curated snapshot of the official docs + INDEX.md
├── chapters.json        ordered chapters, per-chapter verification, final e2e gate
├── chapters/NN-<id>.md  chapter brief: what we implement, done when, implementation notes
├── reference-app/       complete working solution INCLUDING every test (unit + e2e)
└── validation.json      result of the authoring-time learner pass (written by the maintainer)
```

- `workspace.host` (the `reference-app/`) is copied whole into `~/.acc/workspaces/<slug>/`, then every `solution_files` entry is deleted. The learner's workspace holds scaffold + tests, never the solution.
- Each chapter has a mandatory `verification` (`test-suite` or `compile`). `final_verification` runs the whole suite including the e2e.
- Chapter briefs have three parts: **What we implement**, **Done when**, **Implementation notes**.

## How to add a lesson

Do not write lesson files by hand. Run ACC's `lesson-creator` skill (`/agentic-community-college:create-lesson`). It runs Phase 0 (docs snapshot), the plan, the tests and the reference solution, the chapter briefs, the description, and the learner validation pass, and it writes `validation.json`. Then add the lesson to the table in `README.md`.

When a lesson touches the SDK API, verify every signature against the installed `sdk.d.ts` of `@anthropic-ai/claude-agent-sdk`. Do not guess the API from memory.

## Auth rule (applies to every lesson)

- The SDK reads `ANTHROPIC_API_KEY` from the process environment. It does not load `.env` files.
- Anthropic does not allow third-party products to offer claude.ai login or rate limits for SDK agents. Lessons teach the API-key path only. Never instruct the learner to reuse their Claude Code login.
- Unit tests must run offline with a fake `query()`. The live e2e test must be gated: it runs only when `ANTHROPIC_API_KEY` is set or `ACC_E2E_LIVE=1` is set, and it must show a clear skip reason otherwise. A skipped e2e still exits 0.
- Never run the live e2e while authoring unless the maintainer asks for it.

## Reference-app conventions

- `pnpm install`, `pnpm typecheck`, `pnpm test` must pass from `reference-app/` with the e2e skipped.
- Keep the SDK isolation defaults in `runAgent`: `settingSources: []` and `tools: []`, both overridable by the caller.
- pnpm 10+ blocks dependency build scripts. `tsx` and `vitest` need esbuild's install script, so each reference app ships a `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }` (pnpm 11 ignores the `pnpm` field in `package.json`). Without it, `pnpm test` fails in the pre-run dependency check.
- No em-dashes in prose.
