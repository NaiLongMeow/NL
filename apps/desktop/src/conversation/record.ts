/**
 * A session's record as an append-only tree of lines (UI design note,
 * sections 4.15 and 4.16), the shape the harness's JSONL takes in the
 * agent's design (.agents/memory/distributed-design.md, "Checkpoints,
 * rewinding, and branches"). The fake source keeps one per session, so that rewinding,
 * editing, versions, and branches behave on fake data as they will on the
 * real record.
 *
 * *(user, 2026-11-19)* Every step of the loop is a checkpoint, and the
 * record is only ever appended to: nothing here removes or rewrites a line.
 *
 * - Each block line names the line it follows (`parent`), so the lines form
 *   a tree, as pi's entries do (`id`, `parentId`).
 * - The head, where the next line attaches, is the last block line
 *   appended, or the line named by the last head line, which only moves the
 *   head. A rewind, a restore, and showing another version append a head
 *   line.
 * - The conversation is the path from the first line to the head.
 * - A step is a model response with the results of its tool calls, or a
 *   line on its own such as the user's message. Each line names the first
 *   line of its step (`step`); the checkpoint before a block is the line
 *   before its step, so a rewind never cuts a response in half.
 *
 * Every function is pure: the ones that add a line return a new array that
 * starts with the old one.
 */

import type { Block } from "./model";

/** A block of the conversation, after the line `parent` (null: the first line of the session). */
export interface BlockLine {
  kind: "block";
  /** The block's id. */
  id: string;
  parent: string | null;
  /** The id of the first line of this line's step. */
  step: string;
  block: Block;
}

/** Moves the head to the line `head` (null: before the first line). */
export interface HeadLine {
  kind: "head";
  id: string;
  head: string | null;
}

export type Line = BlockLine | HeadLine;

export type SessionRecord = readonly Line[];

/** Where the next line attaches: the last block line appended, or the line the last head line names. */
export function headOf(record: SessionRecord): string | null {
  const last = record[record.length - 1];
  if (!last) return null;
  return last.kind === "head" ? last.head : last.id;
}

function blockLines(record: SessionRecord): Map<string, BlockLine> {
  const lines = new Map<string, BlockLine>();
  for (const line of record) if (line.kind === "block") lines.set(line.id, line);
  return lines;
}

/** The block lines from the first line to `head`, in order. */
export function pathTo(record: SessionRecord, head: string | null): BlockLine[] {
  const lines = blockLines(record);
  const path: BlockLine[] = [];
  for (let id = head; id !== null; ) {
    const line = lines.get(id);
    if (!line) break;
    path.push(line);
    id = line.parent;
  }
  return path.reverse();
}

/**
 * Appends `block` after `parent`, which is the head unless given. `step`
 * names the first line of the block's step; a block that starts a step is
 * its own.
 */
export function appendBlock(
  record: SessionRecord,
  block: Block,
  step: string = block.id,
  parent: string | null = headOf(record),
): SessionRecord {
  return [...record, { kind: "block", id: block.id, parent, step, block }];
}

/** Appends a head line that moves the head to `head`. */
export function moveHead(record: SessionRecord, head: string | null, id: string): SessionRecord {
  return [...record, { kind: "head", id, head }];
}

/**
 * The checkpoint before a block: the line before the first line of the
 * block's step (null: before the first line). Undefined for a block the
 * record does not hold.
 */
export function checkpointBefore(record: SessionRecord, blockId: string): string | null | undefined {
  const lines = blockLines(record);
  const line = lines.get(blockId);
  if (!line) return undefined;
  return (lines.get(line.step) ?? line).parent;
}

/** The block lines that follow `parent`, in the order they were appended. */
export function childrenOf(record: SessionRecord, parent: string | null): BlockLine[] {
  return record.filter((line): line is BlockLine => line.kind === "block" && line.parent === parent);
}

/** The newest block line at or below `id` (null: anywhere), or `id` itself when nothing follows it. */
export function newestBelow(record: SessionRecord, id: string | null): string | null {
  const lines = blockLines(record);
  for (let index = record.length - 1; index >= 0; index--) {
    const line = record[index]!;
    if (line.kind !== "block") continue;
    if (id === null) return line.id;
    for (let at: string | null = line.id; at !== null; at = lines.get(at)?.parent ?? null) {
      if (at === id) return line.id;
    }
  }
  return id;
}

/**
 * The blocks to show: the path to the head, each through `resolve` (which
 * folds in what changed about a block after it was appended, such as an
 * approval's answer), with a versions row before the first block of each
 * way where the path forks, and a rewound marker at the end when lines
 * follow the head.
 */
export function viewOf(record: SessionRecord, resolve: (block: Block) => Block = (block) => block): Block[] {
  const head = headOf(record);
  const blocks: Block[] = [];
  for (const line of pathTo(record, head)) {
    const ways = childrenOf(record, line.parent);
    if (ways.length > 1) {
      blocks.push({ kind: "versions", id: `versions-${line.id}`, fork: line.parent ?? "", index: ways.indexOf(line), count: ways.length });
    }
    blocks.push(resolve(line.block));
  }
  if (childrenOf(record, head).length > 0) blocks.push({ kind: "rewound", id: `rewound-${head ?? ""}` });
  return blocks;
}

/**
 * A record that holds `blocks` one after another, for scripted sessions.
 * Each group in `steps` lists blocks that share a step, such as a response
 * with its tool calls; every other block is a step of its own.
 */
export function recordOf(blocks: readonly Block[], steps: readonly (readonly string[])[] = []): SessionRecord {
  const stepOf = new Map<string, string>();
  for (const group of steps) for (const id of group) stepOf.set(id, group[0]!);
  let record: SessionRecord = [];
  for (const block of blocks) record = appendBlock(record, block, stepOf.get(block.id) ?? block.id);
  return record;
}
