import { describe, expect, it } from "vitest";
import { shownBlocks, startsGroup, toolDisplayName, type Block, type ToolCall } from "./model";

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
    { kind: "task", id: "k", task: { id: "k", title: "t", device: "d", latest: "l", elapsedSeconds: 1, running: true, steps: [] } },
    { kind: "notice", id: "n", text: "digest" },
    { kind: "summarized", id: "s" },
  ];

  it("shows only what a chat app would in chat view", () => {
    expect(shownBlocks(blocks, "chat").map((block) => block.id)).toEqual(["u", "m", "r"]);
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
      "task",
      "notice",
      "summarized",
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
