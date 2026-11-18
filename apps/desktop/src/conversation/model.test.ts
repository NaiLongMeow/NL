import { describe, expect, it } from "vitest";
import {
  characterState,
  countByStatus,
  pendingQuestion,
  shownBlocks,
  startsGroup,
  toolDisplayName,
  type Block,
  type Conversation,
  type DispatchedTask,
  type ToolCall,
} from "./model";

const call = (id: string): ToolCall => ({
  id,
  name: { toolset: "Web", tool: "Search", argument: `"${id}"` },
  category: "web",
  status: "done",
  device: "This device",
  startedAt: "09:00:00",
});
const tool = (id: string): Block => ({ kind: "tool", id, call: call(id) });

describe("toolDisplayName", () => {
  it("names a toolset's tool with its key argument", () => {
    expect(toolDisplayName({ toolset: "Docs", tool: "Read", argument: "hello.md" })).toBe("Docs.Read(hello.md)");
  });

  it("puts the device of a remote tool in front", () => {
    expect(toolDisplayName({ remote: "desktop3", toolset: "Docs", tool: "Read", argument: "hello.md" })).toBe(
      "Remote(desktop3).Docs.Read(hello.md)",
    );
  });

  it("keeps a raw MCP tool's own name behind its server", () => {
    expect(toolDisplayName({ mcp: "github", tool: "create_issue" })).toBe("MCP(github).create_issue");
    expect(toolDisplayName({ remote: "server1", mcp: "github", tool: "create_issue" })).toBe(
      "Remote(server1).MCP(github).create_issue",
    );
  });

  it("leaves out the parentheses when there is no key argument", () => {
    expect(toolDisplayName({ toolset: "Web", tool: "Search" })).toBe("Web.Search");
  });
});

describe("shownBlocks", () => {
  const blocks: Block[] = [
    { kind: "user", id: "u", text: "hi", time: "09:00" },
    { kind: "thinking", id: "th", seconds: 3 },
    { kind: "working", id: "w", text: "working" },
    tool("a"),
    tool("b"),
    tool("c"),
    { kind: "message", id: "m", text: "hello", time: "09:00" },
    tool("d"),
    { kind: "remembered", id: "r", text: "likes tea" },
    { kind: "dispatch", id: "d", tasks: [] },
    { kind: "received", id: "rv", text: "do this", from: { id: "other", title: "Other" } },
    { kind: "question", id: "q", question: { id: "q1", text: "Which one?", options: [{ label: "This" }] } },
    { kind: "notice", id: "n", text: "digest" },
    { kind: "summarized", id: "s" },
    { kind: "archived", id: "a", reason: "idle", idleMinutes: 30 },
  ];

  it("shows only what a chat app would in chat view, with dispatched and received tasks and questions", () => {
    expect(shownBlocks(blocks, "chat").map((block) => block.id)).toEqual(["u", "m", "r", "d", "rv", "q", "a"]);
  });

  it("folds three or more tool calls in a row into a group in full view", () => {
    const shown = shownBlocks(blocks, "full");
    expect(shown.map((block) => block.kind)).toEqual([
      "user",
      "thinking",
      "working",
      "tools",
      "message",
      "tool",
      "remembered",
      "dispatch",
      "received",
      "question",
      "notice",
      "summarized",
      "archived",
    ]);
    const group = shown[3];
    expect(group?.kind === "tools" && group.calls.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps one or two tool calls as rows", () => {
    expect(shownBlocks([tool("a"), tool("b")], "full").map((block) => block.kind)).toEqual(["tool", "tool"]);
  });
});

describe("startsGroup", () => {
  it("gives the avatar to the first of several messages in a row", () => {
    const blocks: Block[] = [
      { kind: "user", id: "u", text: "hi", time: "" },
      { kind: "message", id: "m1", text: "a", time: "" },
      { kind: "message", id: "m2", text: "b", time: "" },
      { kind: "working", id: "w", text: "…" },
      { kind: "message", id: "m3", text: "c", time: "" },
    ];
    expect(blocks.map((_, index) => startsGroup(blocks, index))).toEqual([true, true, false, true, true]);
  });
});

describe("countByStatus", () => {
  it("counts dispatched tasks by status, leaving out statuses no task has", () => {
    const task = (id: string, status: DispatchedTask["status"]): DispatchedTask => ({ id, title: id, status });
    expect(countByStatus([task("a", "running"), task("b", "done"), task("c", "running"), task("d", "device")])).toEqual({
      running: 2,
      done: 1,
      device: 1,
    });
  });
});

describe("characterState", () => {
  const base: Conversation = {
    id: "s",
    title: "S",
    kind: "shared",
    acceptsTasks: true,
    character: { name: "Dafeiyu" },
    blocks: [],
    contextUsed: 0,
  };
  const approval: Block = {
    kind: "approval",
    id: "ap",
    request: { id: "a1", action: "buy", device: "Laptop", reason: "spends", arguments: "{}" },
  };
  const question: Block = { kind: "question", id: "qu", question: { id: "q1", text: "Which?", options: [{ label: "A" }] } };

  it("puts what waits on the user first: an approval, then a question, then a device, then a running turn", () => {
    const working = { ...base, activity: { text: "Working" } };
    expect(characterState(base)).toBe("idle");
    expect(characterState(working)).toBe("working");
    expect(characterState({ ...working, waitsForDevice: true })).toBe("device");
    expect(characterState({ ...working, waitsForDevice: true, blocks: [question] })).toBe("question");
    expect(characterState({ ...working, waitsForDevice: true, blocks: [question, approval] })).toBe("approval");
  });

  it("stops waiting once the approval and the question are answered, and an archived session is idle", () => {
    const answered: Block[] = [
      { ...approval, request: { id: "a1", action: "buy", device: "Laptop", reason: "spends", arguments: "{}", decision: "denied" } },
      { kind: "question", id: "qu", question: { id: "q1", text: "Which?", options: [{ label: "A" }], answer: { skipped: true } } },
    ];
    expect(characterState({ ...base, blocks: answered })).toBe("idle");
    expect(pendingQuestion({ ...base, blocks: answered })).toBeUndefined();
    expect(pendingQuestion({ ...base, blocks: [question] })?.id).toBe("q1");
    expect(characterState({ ...base, archived: true, blocks: [approval] })).toBe("idle");
  });
});
