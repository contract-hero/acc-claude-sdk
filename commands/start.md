---
description: Start the ACC course on the Claude Agent SDK (TypeScript)
---

# /acc-claude-sdk:start

Welcome to the Claude Agent SDK course. In this course you build agents on the Claude Code harness with TypeScript: you start with a single `query()` call, read the typed message stream, add a custom in-process tool, and wrap the agent in a small CLI. Later lessons add sessions, hooks, and subagents. The agent writes the code, you read, ask, and confirm.

## Instructions

Invoke the `course-engine` skill from the `agentic-community-college` plugin with the course filter pinned to `acc-claude-sdk`. The skill then:

1. Lists this course's lessons (only `acc-claude-sdk` lessons, no other course).
2. Checks that the active output style is `Concise` and offers to set it.
3. Runs this course's prerequisite probes (`node-22-installed`, `pnpm-installed`).
4. Collects personalization (this course has none, so accept the defaults).
5. Hands off to the `course-conductor` agent for the chapter loop.

The `agentic-community-college` plugin must be installed and enabled. If the `course-engine` skill is not available, tell the learner to install ACC first and stop.
