/**
 * What the session screen shows, as plain data (UI design note, section 4).
 *
 * A session's conversation is a list of blocks in the order they happened.
 * Each block is one kind of thing from section 4.2 of the note: the user's
 * messages, the character's messages (the message tool, M5), working text,
 * thinking, tool calls, approvals, dispatched and received tasks, and
 * markers. Screens only render blocks; a `SessionSource` (source.ts)
 * supplies them. In Stage 1 the source is a scripted fake; Stage 3 builds
 * blocks from the harness's events.
 */

export type ToolStatus = "running" | "done" | "failed" | "cancelled" | "waiting" | "offline";

/** The fixed categories of tools, each with its own icon (note, section 3). */
export type ToolCategory = "web" | "files" | "memory" | "messages" | "booking" | "device" | "task" | "other";

/**
 * How a tool is named on screen (note, section 4.4): `Toolset.Tool(arg)`,
 * with `Remote(device)` in front of a tool on another device and
 * `MCP(server)` in front of a raw MCP tool, which keeps its own name.
 */
export interface ToolName {
  /** The toolset's display name, such as "Web". Absent for core tools and raw MCP tools. */
  toolset?: string;
  /** The tool's display name, such as "Search", or an MCP tool's own name. */
  tool: string;
  /** The device a remote tool runs on, by its node id, such as "desktop3". */
  remote?: string;
  /** The MCP server of a raw MCP tool, such as "github". */
  mcp?: string;
  /** The key argument, shown in parentheses: a query, a path, a recipient. */
  argument?: string;
}

export interface ToolCall {
  id: string;
  name: ToolName;
  category: ToolCategory;
  status: ToolStatus;
  /** A short result after the name, such as "6 results". */
  summary?: string;
  /** Why the call failed, shown in the row. */
  failure?: string;
  durationMs?: number;
  /** The output passed the output threshold (M7): the model saw only part of it. */
  cut?: boolean;
  /** Short previews shown when the row is expanded. */
  input?: string;
  output?: string;
  device: string;
  /** When the call started, as clock time for the detail panel. */
  startedAt: string;
}

export type ApprovalReason = "spends" | "deletes" | "contacts" | "physical";

export interface ApprovalRequest {
  id: string;
  /** What the character wants to do, as a verb phrase: "buy a bus ticket". */
  action: string;
  device: string;
  reason: ApprovalReason;
  /** The arguments, one click away. */
  arguments: string;
  decision?: "allowed" | "denied";
}

/** The two kinds of session (note, section 4.10). */
export type SessionKind = "shared" | "device";

/** A link to another session, such as the one a dispatched task came from. */
export interface SessionLink {
  id: string;
  title: string;
  /** The session has been archived since; the link opens its summary. */
  archived?: boolean;
}

/** Where a dispatched task stands (note, section 4.12). */
export type DispatchStatus = "queued" | "running" | "approval" | "device" | "done" | "failed";

/** One row of a dispatch card: a task and the session it went to. */
export interface DispatchedTask {
  id: string;
  /** A short title, in the dispatcher's words. */
  title: string;
  /** The session running it; absent when the dispatching session kept the task itself. */
  session?: SessionLink & {
    /** The harness started this session for the task. */
    created: boolean;
    kind: SessionKind;
    /** The device of a device session, by its display name. */
    device?: string;
  };
  status: DispatchStatus;
  /** A short result, or why it failed, once there is one. */
  note?: string;
}

export type Block =
  | { kind: "user"; id: string; text: string; time: string; pending?: boolean }
  | { kind: "message"; id: string; text: string; time: string; streaming?: boolean }
  | { kind: "working"; id: string; text: string }
  | { kind: "thinking"; id: string; seconds: number }
  | { kind: "tool"; id: string; call: ToolCall }
  | { kind: "approval"; id: string; request: ApprovalRequest }
  | { kind: "dispatch"; id: string; tasks: DispatchedTask[] }
  | { kind: "received"; id: string; text: string; from: SessionLink }
  | { kind: "remembered"; id: string; text: string }
  | { kind: "notice"; id: string; text: string }
  | { kind: "summarized"; id: string }
  | { kind: "error"; id: string; reason: string }
  | { kind: "break"; id: string }
  /** The session was ended by the user, or archived itself after being idle (note, section 4.11). */
  | { kind: "archived"; id: string; reason: "ended" | "idle"; idleMinutes?: number };

/** Three or more tool calls in a row fold into one group (note, section 4.4). */
export type ShownBlock = Block | { kind: "tools"; id: string; calls: ToolCall[] };

export type View = "full" | "chat";

/** What the character is doing right now, for the working indicator (note, section 4.7). */
export interface Activity {
  /** The tool running, if any; otherwise the character is thinking. */
  tool?: ToolCall;
  /** Localized activity text from the tool's manifest, such as "Searching the web…". */
  text?: string;
}

export interface Conversation {
  id: string;
  title: string;
  kind: SessionKind;
  /** The device a device session belongs to and runs on, by its display name. */
  device?: string;
  /** The session a dispatched task came from, for a session the harness started for it. */
  from?: SessionLink;
  /** Other sessions may dispatch tasks to this one (note, section 4.10). */
  acceptsTasks: boolean;
  /** Ended or archived: the conversation is read-only and can be carried on. */
  archived?: boolean;
  character: { name: string };
  blocks: Block[];
  /** Set while a turn runs. */
  activity?: Activity;
  /** How full the context is, 0 to 1. */
  contextUsed: number;
}

/** Blocks shown in chat view; everything else appears only in full view (note, section 4.2). */
const CHAT_VIEW_KINDS: ReadonlySet<Block["kind"]> = new Set([
  "user",
  "message",
  "approval",
  "dispatch",
  "received",
  "remembered",
  "error",
  "break",
  "archived",
]);

/**
 * The blocks to render for a view. Chat view keeps what a chat app shows:
 * both sides' messages, approvals, dispatched and received tasks, and a few
 * tips. Full view shows everything, with runs of three or more tool calls
 * folded into a group.
 */
export function shownBlocks(blocks: readonly Block[], view: View): ShownBlock[] {
  if (view === "chat") return blocks.filter((block) => CHAT_VIEW_KINDS.has(block.kind));
  const shown: ShownBlock[] = [];
  let run: ToolCall[] = [];
  const flush = () => {
    if (run.length >= 3) shown.push({ kind: "tools", id: `tools-${run[0]!.id}`, calls: run });
    else for (const call of run) shown.push({ kind: "tool", id: call.id, call });
    run = [];
  };
  for (const block of blocks) {
    if (block.kind === "tool") {
      run.push(block.call);
      continue;
    }
    flush();
    shown.push(block);
  }
  flush();
  return shown;
}

/** A tool's display name with its key argument, such as `Remote(desktop3).Docs.Read(hello.md)`. */
export function toolDisplayName(name: ToolName): string {
  const parts: string[] = [];
  if (name.remote) parts.push(`Remote(${name.remote})`);
  if (name.mcp) parts.push(`MCP(${name.mcp})`);
  if (name.toolset) parts.push(name.toolset);
  parts.push(name.tool);
  const base = parts.join(".");
  return name.argument === undefined ? base : `${base}(${name.argument})`;
}

/** Messages from the same side in a row share one avatar, as in a chat app. */
export function startsGroup(blocks: readonly ShownBlock[], index: number): boolean {
  const block = blocks[index];
  const previous = blocks[index - 1];
  if (!block || block.kind !== "message") return true;
  return !previous || previous.kind !== "message";
}

/** How many dispatched tasks are in each status, for the dispatch card's header. */
export function countByStatus(tasks: readonly DispatchedTask[]): Partial<Record<DispatchStatus, number>> {
  const counts: Partial<Record<DispatchStatus, number>> = {};
  for (const task of tasks) counts[task.status] = (counts[task.status] ?? 0) + 1;
  return counts;
}
