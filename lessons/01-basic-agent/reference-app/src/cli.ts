import { pathToFileURL } from 'node:url';
import { AgentError, runAgent, type QueryFn } from './agent.js';
import { createNotesStore, withNotes } from './tools.js';

export interface CliDeps {
  /** Defaults to the real SDK `query`. Tests pass a fake. */
  queryFn?: QueryFn;
  stdout: { write(s: string): unknown };
  stderr: { write(s: string): unknown };
}

const USAGE = [
  'Usage: pnpm agent "<prompt>"',
  '  Runs a one-shot agent that can save and list notes. Needs ANTHROPIC_API_KEY.',
  '',
].join('\n');

export async function main(argv: string[], deps: CliDeps): Promise<number> {
  const prompt = argv.join(' ').trim();
  if (prompt.length === 0) {
    deps.stderr.write(USAGE);
    return 2;
  }

  const store = createNotesStore();
  const options = withNotes({ maxTurns: 10 }, store);

  try {
    const run = await runAgent({
      prompt,
      queryFn: deps.queryFn,
      options,
      onText: (chunk) => deps.stdout.write(chunk),
    });
    deps.stdout.write(
      `\n[done] turns=${run.numTurns} cost=$${run.costUsd.toFixed(4)} notes=${store.list().length}\n`,
    );
    return 0;
  } catch (err) {
    if (err instanceof AgentError) {
      deps.stderr.write(`[error] ${err.subtype}: ${err.errors.join('; ')}\n`);
      return 1;
    }
    const message = err instanceof Error ? err.message : String(err);
    deps.stderr.write(`[error] unexpected: ${message}\n`);
    return 1;
  }
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main(process.argv.slice(2), { stdout: process.stdout, stderr: process.stderr }).then((code) => {
    // Let queued stdout writes flush before exiting (stdout is async on pipes).
    process.stdout.write('', () => process.exit(code));
  });
}
