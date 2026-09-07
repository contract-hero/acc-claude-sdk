import { describe, expect, it } from 'vitest';
import { AgentError, runAgent } from '../src/agent.js';
import {
  assistantText,
  assistantToolUse,
  makeFakeQuery,
  resultError,
  resultSuccess,
  systemInit,
} from './helpers/fakeQuery.js';

describe('runAgent', () => {
  it('concatenates assistant text blocks in order and streams each chunk to onText', async () => {
    const queryFn = makeFakeQuery([
      systemInit(),
      assistantText('Hello, '),
      assistantText('world.'),
      resultSuccess('Hello, world.'),
    ]);
    const chunks: string[] = [];

    const run = await runAgent({ prompt: 'say hi', queryFn, onText: (c) => chunks.push(c) });

    expect(run.text).toBe('Hello, world.');
    expect(chunks).toEqual(['Hello, ', 'world.']);
  });

  it('reads result, numTurns, costUsd and sessionId from the result message', async () => {
    const queryFn = makeFakeQuery([
      systemInit(),
      assistantText('working'),
      resultSuccess('final answer', { num_turns: 3, total_cost_usd: 0.0123, session_id: 'sess-42' }),
    ]);

    const run = await runAgent({ prompt: 'p', queryFn });

    expect(run.result).toBe('final answer');
    expect(run.numTurns).toBe(3);
    expect(run.costUsd).toBeCloseTo(0.0123, 6);
    expect(run.sessionId).toBe('sess-42');
  });

  it('records every tool_use block with its name and input', async () => {
    const queryFn = makeFakeQuery([
      systemInit(),
      assistantToolUse('mcp__notes__add_note', { text: 'milk' }),
      assistantToolUse('mcp__notes__list_notes', {}),
      assistantText('Saved.'),
      resultSuccess('Saved.'),
    ]);

    const run = await runAgent({ prompt: 'p', queryFn });

    expect(run.toolCalls).toEqual([
      { name: 'mcp__notes__add_note', input: { text: 'milk' } },
      { name: 'mcp__notes__list_notes', input: {} },
    ]);
    expect(run.text).toBe('Saved.');
  });

  it('throws AgentError with subtype and errors when the result reports a failure', async () => {
    const maxTurns = makeFakeQuery([
      systemInit(),
      assistantText('trying'),
      resultError('error_max_turns', ['Reached max turns (1)']),
    ]);
    await expect(runAgent({ prompt: 'p', queryFn: maxTurns })).rejects.toMatchObject({
      name: 'AgentError',
      subtype: 'error_max_turns',
      errors: ['Reached max turns (1)'],
    });

    // A `success` subtype can still carry `is_error: true` (API-level failure).
    const apiError = makeFakeQuery([systemInit(), resultSuccess('Invalid API key', { is_error: true })]);
    const failure = await runAgent({ prompt: 'p', queryFn: apiError }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(AgentError);
    expect(failure).toMatchObject({ subtype: 'api_error', errors: ['Invalid API key'] });
  });

  it('passes the prompt through and applies isolation defaults unless the caller overrides them', async () => {
    const defaults = makeFakeQuery([systemInit(), resultSuccess('ok')]);
    await runAgent({ prompt: 'the prompt', queryFn: defaults });
    expect(defaults.calls).toHaveLength(1);
    expect(defaults.calls[0]?.prompt).toBe('the prompt');
    expect(defaults.calls[0]?.options).toMatchObject({ tools: [], settingSources: [] });

    const overridden = makeFakeQuery([systemInit(), resultSuccess('ok')]);
    await runAgent({ prompt: 'p', queryFn: overridden, options: { tools: ['Read'], maxTurns: 2 } });
    expect(overridden.calls[0]?.options).toMatchObject({
      tools: ['Read'],
      settingSources: [],
      maxTurns: 2,
    });
  });
});
