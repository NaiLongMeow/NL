import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_IDLE_LIMIT, FAKE_REPLY_DELAY_MS, createFakeSource } from "./fake";

describe("createFakeSource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens every live and archived session it lists, in both languages", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const source = createFakeSource(locale);
      expect(source.list().length).toBeGreaterThan(0);
      for (const summary of source.list()) {
        expect(source.conversation(summary.id)?.title).toBe(summary.title);
      }
      for (const item of source.archive()) {
        expect(source.conversation(item.id)).toMatchObject({ title: item.title, archived: true });
      }
    }
  });

  it("keeps snapshots stable until something changes, as useSyncExternalStore needs", () => {
    const source = createFakeSource("en");
    expect(source.conversation("presentation")).toBe(source.conversation("presentation"));
    expect(source.conversation("gift")).toBe(source.conversation("gift"));
    expect(source.list()).toBe(source.list());
    expect(source.devices()).toBe(source.devices());
    expect(source.archive()).toBe(source.archive());
  });

  it("puts every device session under a device it knows, and shared sessions under none", () => {
    const source = createFakeSource("en");
    const devices = new Set(source.devices().map((device) => device.id));
    for (const item of source.list()) {
      if (item.kind === "device") expect(devices.has(item.deviceId!)).toBe(true);
      else expect(item.deviceId).toBeUndefined();
    }
    expect(source.devices().filter((device) => device.self)).toHaveLength(1);
  });

  it("dispatches tasks to existing and new sessions that exist, and marks where they came from", () => {
    const source = createFakeSource("en");
    const dispatch = source.conversation("errands")!.blocks.find((block) => block.kind === "dispatch");
    expect(dispatch?.kind).toBe("dispatch");
    if (dispatch?.kind !== "dispatch") return;
    const live = new Set(source.list().map((item) => item.id));
    for (const task of dispatch.tasks) {
      if (!task.session) continue;
      expect(live.has(task.session.id), task.session.id).toBe(true);
      const received = source.conversation(task.session.id)!.blocks.some(
        (block) => block.kind === "received" && block.from.id === "errands",
      );
      expect(received, task.session.id).toBe(true);
      // A session the harness started for the task names the dispatcher; an existing one does not.
      expect(source.conversation(task.session.id)!.from?.id === "errands").toBe(task.session.created);
    }
  });

  it("derives each session's status: working, waiting for approval or a device, or idle with a countdown", () => {
    const source = createFakeSource("en");
    const status = (id: string) => source.list().find((item) => item.id === id)?.status;
    expect(status("downloads")).toMatchObject({ kind: "working" });
    expect(status("hike")).toEqual({ kind: "approval" });
    expect(status("mia")).toEqual({ kind: "device" });
    expect(status("errands")).toEqual({ kind: "idle", archivesInMinutes: DEFAULT_IDLE_LIMIT - 4 });
    source.setIdleLimit(10);
    expect(status("errands")).toEqual({ kind: "idle", archivesInMinutes: 6 });
    // A session idle longer than a new, shorter limit archives within a minute, never in the past.
    expect(status("presentation")).toEqual({ kind: "idle", archivesInMinutes: 1 });
  });

  it("starts a turn when the user sends while the character is idle, then replies, resetting the idle time", () => {
    const source = createFakeSource("en");
    const listener = vi.fn();
    source.subscribe(listener);
    source.send("presentation", "Hello");
    const sent = source.conversation("presentation")!;
    expect(sent.blocks.at(-1)).toMatchObject({ kind: "user", text: "Hello", pending: false });
    expect(sent.activity).toBeDefined();
    vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
    const replied = source.conversation("presentation")!;
    expect(replied.activity).toBeUndefined();
    expect(replied.blocks.at(-1)?.kind).toBe("message");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(source.list().find((item) => item.id === "presentation")?.status).toEqual({
      kind: "idle",
      archivesInMinutes: DEFAULT_IDLE_LIMIT,
    });
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
    source.stop("downloads");
    const stopped = source.conversation("downloads")!;
    expect(stopped.activity).toBeUndefined();
    expect(stopped.blocks.some((block) => block.kind === "tool" && block.call.status === "running")).toBe(false);
  });

  it("switches whether a session accepts tasks", () => {
    const source = createFakeSource("en");
    expect(source.conversation("presentation")!.acceptsTasks).toBe(false);
    source.setAcceptsTasks("presentation", true);
    expect(source.conversation("presentation")!.acceptsTasks).toBe(true);
    expect(source.list().find((item) => item.id === "presentation")?.acceptsTasks).toBe(true);
  });

  it("ends a session at once: it leaves the live list, reads as archived, and heads the archive", () => {
    const source = createFakeSource("en");
    source.end("errands");
    expect(source.list().some((item) => item.id === "errands")).toBe(false);
    expect(source.conversation("errands")).toMatchObject({ archived: true });
    expect(source.conversation("errands")!.blocks.at(-1)).toMatchObject({ kind: "archived", reason: "ended" });
    expect(source.archive()[0]).toMatchObject({ id: "errands", reason: "ended" });
    // Its dispatched tasks keep running in their own sessions.
    expect(source.list().find((item) => item.id === "downloads")?.status.kind).toBe("working");
  });

  it("starts shared and device sessions, and carries on from a summary", () => {
    const source = createFakeSource("en");
    const shared = source.start("shared");
    const device = source.start("device");
    expect(source.list().find((item) => item.id === shared)).toMatchObject({ kind: "shared", acceptsTasks: true });
    expect(source.list().find((item) => item.id === device)).toMatchObject({ kind: "device", deviceId: "laptop" });
    const carried = source.carryOn("gift");
    expect(source.conversation(carried)).toMatchObject({ title: "Birthday gift ideas", kind: "shared" });
    expect(source.conversation(carried)!.blocks[0]).toMatchObject({ kind: "summarized" });
  });
});
