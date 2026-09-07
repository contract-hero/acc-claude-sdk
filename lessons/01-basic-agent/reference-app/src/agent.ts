import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

/** The SDK entry point, typed so tests can inject a fake. */
export type QueryFn = typeof query;

export interface RunAgentInput {
  prompt: string;
  /** Defaults to the real SDK `query`. Tests pass a fake. */
  queryFn?: QueryFn;
  /** Merged over the isolation defaults (`settingSources: []`, `tools: []`). */
  options?: Options;
  /** Called with every assistant text block as soon as it arrives. */
  onText?: (chunk: string) => void;
}

export interface AgentRun {
  /** Every assistant text block, concatenated in arrival order. */
  text: string;
  /** The final answer, as reported by the `result` message. */
  result: string;
  numTurns: number;
  costUsd: number;
  sessionId: string;
  toolCalls: Array<{ name: string; input: unknown }>;
}

/** Thrown when the `result` message reports a failure instead of a final answer. */
export class AgentError extends Error {
  readonly subtype: string;
  readonly errors: string[];

  constructor(subtype: string, errors: string[]) {
    super(`Agent stopped with ${subtype}: ${errors.join('; ') || 'no details'}`);
    this.name = 'AgentError';
    this.subtype = subtype;
    this.errors = errors;
  }
}

/**
 * Isolation defaults. `settingSources: []` keeps the learner's own Claude Code
 * settings, plugins and CLAUDE.md files out of the run. `tools: []` removes all
 * built-in tools, so the agent can only call the MCP tools we hand it.
 */
const DEFAULT_OPTIONS: Options = {
  settingSources: [],
  tools: [],
};

export async function runAgent(input: RunAgentInput): Promise<AgentRun> {
  const queryFn = input.queryFn ?? query;
  const options: Options = { ...DEFAULT_OPTIONS, ...input.options };

  let text = '';
  const toolCalls: AgentRun['toolCalls'] = [];

  for await (const message of queryFn({ prompt: input.prompt, options })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') {
          text += block.text;
          input.onText?.(block.text);
        } else if (block.type === 'tool_use') {
          toolCalls.push({ name: block.name, input: block.input });
        }
      }
      continue;
    }

    if (message.type === 'result') {
      // The result message is the only place that carries the final answer,
      // the turn count and the cost. Exactly one is emitted per turn.
      if (message.subtype !== 'success') {
        throw new AgentError(message.subtype, message.errors);
      }
      if (message.is_error) {
        // A `success` subtype with `is_error: true` means the turn ended on an
        // API error (bad key, billing, overload). `result` holds the error text.
        throw new AgentError('api_error', [message.result]);
      }
      return {
        text,
        result: message.result,
        numTurns: message.num_turns,
        costUsd: message.total_cost_usd,
        sessionId: message.session_id,
        toolCalls,
      };
    }
    // Other message types (system init, user tool results, status) are ignored here.
  }

  throw new AgentError('no_result', ['The query ended without a result message.']);
}
