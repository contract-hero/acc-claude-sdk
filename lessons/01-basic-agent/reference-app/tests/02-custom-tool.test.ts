import { describe, expect, it } from 'vitest';
import {
  NOTES_ALLOWED_TOOLS,
  createNotesServer,
  createNotesStore,
  createNotesTools,
  withNotes,
} from '../src/tools.js';

/** Read the text of the first content block of a tool result. */
function firstText(result: { content: Array<{ type: string; text?: string }> }): string {
  const block = result.content[0];
  if (!block || block.type !== 'text' || typeof block.text !== 'string') {
    throw new Error(`expected a text block, got ${JSON.stringify(block)}`);
  }
  return block.text;
}

describe('notes tools', () => {
  it('add_note returns a text content block and stores the note', async () => {
    const store = createNotesStore();
    const { addNote } = createNotesTools(store);

    const result = await addNote.handler({ text: 'buy milk' }, {});

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect(firstText(result)).toContain('buy milk');
    expect(store.list()).toEqual([{ id: 1, text: 'buy milk' }]);
  });

  it('list_notes returns every note in insertion order', async () => {
    const store = createNotesStore();
    store.add('first');
    store.add('second');
    const { listNotes } = createNotesTools(store);

    const text = firstText(await listNotes.handler({}, {}));

    expect(text).toContain('#1: first');
    expect(text).toContain('#2: second');
    expect(text.indexOf('first')).toBeLessThan(text.indexOf('second'));
  });

  it('names the tools so that their fully qualified names match NOTES_ALLOWED_TOOLS', () => {
    const { addNote, listNotes } = createNotesTools(createNotesStore());

    expect(addNote.name).toBe('add_note');
    expect(listNotes.name).toBe('list_notes');
    expect(NOTES_ALLOWED_TOOLS).toEqual(['mcp__notes__add_note', 'mcp__notes__list_notes']);
  });

  it('createNotesServer returns an in-process sdk server named notes', () => {
    const server = createNotesServer(createNotesStore());

    expect(server.type).toBe('sdk');
    expect(server.name).toBe('notes');
    expect(server.instance).toBeDefined();
  });

  it('withNotes adds mcpServers.notes and the allowed tool names without dropping existing options', () => {
    const store = createNotesStore();

    const options = withNotes({ maxTurns: 4, allowedTools: ['Read'], settingSources: [] }, store);

    expect(options.maxTurns).toBe(4);
    expect(options.settingSources).toEqual([]);
    expect(options.allowedTools).toEqual(['Read', 'mcp__notes__add_note', 'mcp__notes__list_notes']);
    expect(options.mcpServers?.notes).toMatchObject({ type: 'sdk', name: 'notes' });
  });
});
