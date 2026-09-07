import { describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import {
  assistantText,
  makeFakeQuery,
  resultError,
  resultSuccess,
  systemInit,
} from './helpers/fakeQuery.js';

function makeIo() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: { write: (s: string) => out.push(s) },
    stderr: { write: (s: string) => err.push(s) },
    out: () => out.join(''),
    err: () => err.join(''),
  };
}

describe('cli main', () => {
  it('prints usage to stderr and returns 2 when no prompt is given', async () => {
    const io = makeIo();
    const queryFn = makeFakeQuery([]);

    const code = await main([], { queryFn, stdout: io.stdout, stderr: io.stderr });

    expect(code).toBe(2);
    expect(io.err()).toMatch(/usage/i);
    expect(io.out()).toBe('');
    expect(queryFn.calls).toHaveLength(0);
  });

  it('streams assistant text to stdout and prints the [done] summary line', async () => {
    const io = makeIo();
    const queryFn = makeFakeQuery([
      systemInit(),
      assistantText('Hello '),
      assistantText('there.'),
      resultSuccess('Hello there.', { num_turns: 2, total_cost_usd: 0.0042 }),
    ]);

    const code = await main(['say', 'hello'], { queryFn, stdout: io.stdout, stderr: io.stderr });

    expect(code).toBe(0);
    expect(io.out()).toBe('Hello there.\n[done] turns=2 cost=$0.0042 notes=0\n');
    expect(io.err()).toBe('');
    expect(queryFn.calls[0]?.prompt).toBe('say hello');
  });

  it('wires the notes server, the allowed tools and the isolation defaults into the query options', async () => {
    const io = makeIo();
    const queryFn = makeFakeQuery([systemInit(), resultSuccess('ok')]);

    await main(['x'], { queryFn, stdout: io.stdout, stderr: io.stderr });

    const options = queryFn.calls[0]?.options;
    expect(options?.mcpServers?.notes).toMatchObject({ type: 'sdk', name: 'notes' });
    expect(options?.allowedTools).toEqual(
      expect.arrayContaining(['mcp__notes__add_note', 'mcp__notes__list_notes']),
    );
    expect(options?.tools).toEqual([]);
    expect(options?.settingSources).toEqual([]);
  });

  it('prints an [error] line to stderr and returns 1 on AgentError', async () => {
    const io = makeIo();
    const queryFn = makeFakeQuery([systemInit(), resultError('error_during_execution', ['boom'])]);

    const code = await main(['do it'], { queryFn, stdout: io.stdout, stderr: io.stderr });

    expect(code).toBe(1);
    expect(io.err()).toBe('[error] error_during_execution: boom\n');
  });
});
