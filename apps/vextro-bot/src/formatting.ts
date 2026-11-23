import type { Context } from "telegraf";
import type { MessageEntity } from "telegraf/types";

/**
 * Converts Telegram's native formatting entities (the hidden "bold from char 0-7"
 * notes that the Telegram app attaches when the owner uses the B / I / U / S /
 * spoiler / monospace / link buttons) into MarkdownV2 source text.
 *
 * This is the single place in the bot that turns "what the owner actually typed,
 * with real Telegram formatting applied" into stored text that will render
 * identically wherever it is sent back out.
 */

const ESCAPE_CHARS = /[_*\[\]()~`>#+\-=|{}.!\\]/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(ESCAPE_CHARS, (ch) => "\\" + ch);
}

// Escape text that sits inside a URL () segment — different escape set per Telegram's spec.
function escapeLinkUrl(url: string): string {
  return url.replace(/[)\\]/g, (ch) => "\\" + ch);
}

interface Boundary {
  offset: number;
  openers: string[];
  closers: string[];
}

/**
 * Convert plain text + Telegram MessageEntity[] (as given on ctx.message.entities /
 * ctx.message.caption_entities) into MarkdownV2 source. Telegram uses UTF-16 code
 * unit offsets for entities, so we operate on an array of UTF-16 units, not
 * JS string indices naively — for the overwhelming majority of real-world text
 * (no astral characters inside formatted spans) a direct index walk is correct;
 * this implementation is careful to walk by UTF-16 units to match Telegram's offsets.
 */
export function entitiesToMarkdownV2(text: string, entities: MessageEntity[] | undefined): string {
  if (!entities || entities.length === 0) return escapeMarkdownV2(text);

  const utf16 = toUtf16Array(text);

  const boundaries = new Map<number, Boundary>();
  const mark = (offset: number) => {
    if (!boundaries.has(offset)) boundaries.set(offset, { offset, openers: [], closers: [] });
    return boundaries.get(offset)!;
  };

  for (const e of entities) {
    const start = e.offset;
    const end = e.offset + e.length;
    const pair = markerFor(e);
    if (!pair) continue;
    mark(start).openers.push(pair.open);
    mark(end).closers.unshift(pair.close);
  }

  const sortedOffsets = [...boundaries.keys()].sort((a, b) => a - b);
  let out = "";
  let cursor = 0;
  for (const offset of sortedOffsets) {
    out += escapeMarkdownV2(sliceUtf16(utf16, cursor, offset));
    const b = boundaries.get(offset)!;
    out += b.closers.join("");
    out += b.openers.join("");
    cursor = offset;
  }
  out += escapeMarkdownV2(sliceUtf16(utf16, cursor, utf16.length));
  return out;
}

function markerFor(e: MessageEntity): { open: string; close: string } | null {
  switch (e.type) {
    case "bold": return { open: "*", close: "*" };
    case "italic": return { open: "_", close: "_" };
    case "underline": return { open: "__", close: "__" };
    case "strikethrough": return { open: "~", close: "~" };
    case "spoiler": return { open: "||", close: "||" };
    case "code": return { open: "`", close: "`" };
    case "pre": return { open: "```" + (e.language ?? "") + "\n", close: "\n```" };
    case "text_link": return e.url ? { open: "[", close: "](" + escapeLinkUrl(e.url) + ")" } : null;
    default: return null; // mentions, hashtags, custom emoji etc. pass through as plain escaped text
  }
}

function toUtf16Array(text: string): string[] {
  // Split into UTF-16 code units (not code points) to match Telegram's entity offsets exactly.
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) out.push(text[i]!);
  return out;
}
function sliceUtf16(units: string[], start: number, end: number): string {
  return units.slice(start, end).join("");
}

/**
 * Call this from any "send me the title / body / message text" step across the bot
 * (guide editor, welcome text, help text, broadcast composer, channel posts,
 * support replies — everything the owner types that users will later see).
 * Returns MarkdownV2 source ready to store, plus the parse_mode to send it with.
 */
export function captureFormattedInput(ctx: Context): { markdown: string; parse_mode: "MarkdownV2" } | null {
  const msg = ctx.message as any;
  if (!msg) return null;
  const text: string | undefined = msg.text ?? msg.caption;
  if (text === undefined) return null;
  const entities: MessageEntity[] | undefined = msg.entities ?? msg.caption_entities;
  return { markdown: entitiesToMarkdownV2(text, entities), parse_mode: "MarkdownV2" };
}
