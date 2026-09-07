/**
 * Builders for fake SDK messages and a fake `query()`.
 *
 * The shapes follow `SDKMessage` from @anthropic-ai/claude-agent-sdk: real
 * `type` / `subtype` discriminators and the fields our code reads. Fields we
 * never read (usage details, timings) are filled with placeholders and the
 * objects are cast, because the full `BetaMessage` shape is heavy.
 */
import type {
  Options,
  Query,
  SDKMessage,
  SDKResultError,
  SDKResultSuccess,
  SDKSystemMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { QueryFn } from '../../src/agent.js';

export const FAKE_SESSION_ID = 'fake-session-0001';

let counter = 0;
function nextUuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

export function systemInit(overrides: Partial<SDKSystemMessage> = {}): SDKMessage {
  return {
    type: 'system',
    subtype: 'init',
    uuid: nextUuid(),
    session_id: FAKE_SESSION_ID,
    apiKeySource: 'ANTHROPIC_API_KEY',
    claude_code_version: '0.0.0-fake',
    cwd: process.cwd(),
    tools: [],
    mcp_servers: [{ name: 'notes', status: 'connected' }],
    model: 'fake-model',
    permissionMode: 'default',
    slash_commands: [],
    output_style: 'default',
    skills: [],
    plugins: [],
    ...overrides,
  } as unknown as SDKMessage;
}

function assistantMessage(content: unknown[]): SDKMessage {
  return {
    type: 'assistant',
    uuid: nextUuid(),
    session_id: FAKE_SESSION_ID,
    parent_tool_use_id: null,
    message: {
      id: `msg_fake_${counter}`,
      type: 'message',
      role: 'assistant',
      model: 'fake-model',
      content,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  } as unknown as SDKMessage;
}

export function assistantText(text: string): SDKMessage {
  return assistantMessage([{ type: 'text', text, citations: null }]);
}

export function assistantToolUse(name: string, input: unknown): SDKMessage {
  return assistantMessage([{ type: 'tool_use', id: `toolu_fake_${counter + 1}`, name, input }]);
}

const FAKE_USAGE = {
  input_tokens: 10,
  output_tokens: 5,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

export function resultSuccess(result: string, extras: Partial<SDKResultSuccess> = {}): SDKMessage {
  return {
    type: 'result',
    subtype: 'success',
    uuid: nextUuid(),
    session_id: FAKE_SESSION_ID,
    duration_ms: 12,
    duration_api_ms: 8,
    is_error: false,
    num_turns: 1,
    result,
    stop_reason: 'end_turn',
    total_cost_usd: 0.001,
    usage: FAKE_USAGE,
    modelUsage: {},
    permission_denials: [],
    ...extras,
  } as unknown as SDKMessage;
}

export function resultError(subtype: SDKResultError['subtype'], errors: string[]): SDKMessage {
  return {
    type: 'result',
    subtype,
    uuid: nextUuid(),
    session_id: FAKE_SESSION_ID,
    duration_ms: 12,
    duration_api_ms: 8,
    is_error: true,
    num_turns: 1,
    stop_reason: null,
    total_cost_usd: 0.001,
    usage: FAKE_USAGE,
    modelUsage: {},
    permission_denials: [],
    errors,
  } as unknown as SDKMessage;
}

export interface FakeQueryCall {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options: Options | undefined;
}

export type FakeQuery = QueryFn & { calls: FakeQueryCall[] };

/**
 * A `query()` stand-in. Records every `{ prompt, options }` it receives in
 * `calls` and yields the given messages in order. Tool handlers are never run
 * by the fake: it only replays the stream the SDK would produce.
 */
export function makeFakeQuery(messages: SDKMessage[]): FakeQuery {
  const calls: FakeQueryCall[] = [];
  const queryFn = ((params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options }) => {
    calls.push({ prompt: params.prompt, options: params.options });
    async function* stream(): AsyncGenerator<SDKMessage, void> {
      for (const message of messages) {
        yield message;
      }
    }
    // The real Query adds control methods (interrupt, close, ...) that runAgent never calls.
    return stream() as unknown as Query;
  }) as QueryFn;
  return Object.assign(queryFn, { calls });
}
