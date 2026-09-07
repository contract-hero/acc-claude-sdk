import { describe, expect, it } from 'vitest';
import { runAgent } from '../../src/agent.js';
import { createNotesStore, withNotes } from '../../src/tools.js';

/**
 * Live gate. This test spawns the real Claude Code harness and calls the model,
 * so it costs money and needs credentials. It runs when ANTHROPIC_API_KEY is
 * set. Set ACC_E2E_LIVE=1 to force it on when your credentials come from
 * another provider (Bedrock, Vertex, Foundry). Otherwise the whole describe is
 * skipped and vitest still exits 0.
 */
const live = !!process.env.ANTHROPIC_API_KEY || process.env.ACC_E2E_LIVE === '1';

describe.skipIf(!live)('live agent (needs ANTHROPIC_API_KEY or ACC_E2E_LIVE=1)', () => {
  it(
    'saves a note through the add_note tool and returns a final answer',
    async () => {
      const store = createNotesStore();

      const run = await runAgent({
        prompt: "Use the add_note tool to save the note 'ACC e2e ok'. Then reply with exactly the word DONE.",
        options: withNotes({ maxTurns: 6 }, store),
      });

      expect(store.list().some((n) => n.text.includes('ACC e2e ok'))).toBe(true);
      expect(run.toolCalls.some((c) => c.name === 'mcp__notes__add_note')).toBe(true);
      expect(run.result.length).toBeGreaterThan(0);
    },
    180_000,
  );
});
