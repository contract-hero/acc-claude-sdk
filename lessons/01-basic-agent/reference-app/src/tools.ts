import {
  createSdkMcpServer,
  tool,
  type McpSdkServerConfigWithInstance,
  type Options,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export interface Note {
  id: number;
  text: string;
}

export interface NotesStore {
  add(text: string): Note;
  list(): Note[];
}

/** In-memory notebook. Lives in our process, so tool handlers can mutate it directly. */
export function createNotesStore(): NotesStore {
  const notes: Note[] = [];
  return {
    add(text) {
      const note: Note = { id: notes.length + 1, text };
      notes.push(note);
      return note;
    },
    list() {
      return [...notes];
    },
  };
}

/** Fully qualified names: mcp__<server name>__<tool name>. */
export const NOTES_ALLOWED_TOOLS = ['mcp__notes__add_note', 'mcp__notes__list_notes'];

/** The two tool definitions, exposed so tests can call the handlers directly. */
export function createNotesTools(store: NotesStore) {
  const addNote = tool(
    'add_note',
    'Save a short text note in the in-memory notebook. Returns the id of the saved note.',
    { text: z.string().min(1).describe('The note text to save') },
    async ({ text }) => {
      const note = store.add(text);
      return { content: [{ type: 'text', text: `Saved note #${note.id}: ${note.text}` }] };
    },
  );

  const listNotes = tool(
    'list_notes',
    'List every note saved so far, in insertion order.',
    {},
    async () => {
      const notes = store.list();
      const text =
        notes.length === 0 ? 'No notes yet.' : notes.map((n) => `#${n.id}: ${n.text}`).join('\n');
      return { content: [{ type: 'text', text }] };
    },
    { annotations: { readOnlyHint: true } },
  );

  return { addNote, listNotes };
}

/** Wrap the tools in an in-process MCP server named `notes`. */
export function createNotesServer(store: NotesStore): McpSdkServerConfigWithInstance {
  const { addNote, listNotes } = createNotesTools(store);
  return createSdkMcpServer({ name: 'notes', version: '1.0.0', tools: [addNote, listNotes] });
}

/** Return `options` extended with the notes server and its pre-approved tool names. */
export function withNotes(options: Options, store: NotesStore): Options {
  return {
    ...options,
    mcpServers: { ...options.mcpServers, notes: createNotesServer(store) },
    allowedTools: [...(options.allowedTools ?? []), ...NOTES_ALLOWED_TOOLS],
  };
}
