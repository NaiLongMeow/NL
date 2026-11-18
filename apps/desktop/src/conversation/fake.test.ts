import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAKE_REPLY_DELAY_MS, createFakeSource } from "./fake";

describe("createFakeSource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens every conversation the sidebar lists, in both languages", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const source = createFakeSource(locale);
      expect(source.list().length).toBeGreaterThan(0);
      for (const summary of source.list()) {
        expect(source.conversation(summary.id)?.title).toBe(summary.title);
      }
    }
  });

  it("keeps snapshots stable until something changes, as useSyncExternalStore needs", () => {
    const source = createFakeSource("en");
    expect(source.conversation("chat")).toBe(source.conversation("chat"));
    expect(source.list()).toBe(source.list());
  });

  it("starts a turn when the user sends while the character is idle, then replies", () => {
    const source = createFakeSource("en");
    const listener = vi.fn();
    source.subscribe(listener);
    source.send("chat", "Hello");
    const sent = source.conversation("chat")!;
    expect(sent.blocks.at(-1)).toMatchObject({ kind: "user", text: "Hello", pending: false });
    expect(sent.activity).toBeDefined();
    vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
    const replied = source.conversation("chat")!;
    expect(replied.activity).toBeUndefined();
    expect(replied.blocks.at(-1)?.kind).toBe("message");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("lets a message sent during a turn cut in at the next step", () => {
    const source = createFakeSource("en");
    source.send("hike", "Also check Monday");
    expect(source.conversation("hike")!.blocks.at(-1)).toMatchObject({ kind: "user", pending: true });
  });

  it("records the answer to an approval and continues the turn", () => {
    const source = createFakeSource("en");
    source.answer("hike", "a1", "allowed");
    const approval = source.conversation("hike")!.blocks.find((block) => block.kind === "approval");
    expect(approval?.kind === "approval" && approval.request.decision).toBe("allowed");
    vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
    expect(source.conversation("hike")!.blocks.at(-1)?.kind).toBe("message");
  });

  it("stops the turn and cancels tool calls still running", () => {
    const source = createFakeSource("en");
    source.stop("hike");
    const stopped = source.conversation("hike")!;
    expect(stopped.activity).toBeUndefined();
    expect(stopped.blocks.some((block) => block.kind === "tool" && block.call.status === "running")).toBe(false);
  });
});
