import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_IDLE_LIMIT, FAKE_REPLY_DELAY_MS, createFakeSource } from "./fake";
import type { SessionSource } from "./source";

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

  it("derives each session's status: working, waiting for approval, an answer, or a device, or idle with a countdown", () => {
    const source = createFakeSource("en");
    const status = (id: string) => source.list().find((item) => item.id === id)?.status;
    expect(status("downloads")).toMatchObject({ kind: "working" });
    expect(status("hike")).toEqual({ kind: "approval" });
    expect(status("photos")).toEqual({ kind: "question" });
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

  it("records the answer to a question, picked or skipped, and continues the turn", () => {
    for (const answer of [{ choices: ["Into a folder named Undated"] }, { skipped: true as const }]) {
      const source = createFakeSource("en");
      source.answerQuestion("photos", "q1", answer);
      const question = source.conversation("photos")!.blocks.find((block) => block.kind === "question");
      expect(question?.kind === "question" && question.question.answer).toEqual(answer);
      expect(source.list().find((item) => item.id === "photos")?.status.kind).toBe("working");
      vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
      const reply = source.conversation("photos")!.blocks.at(-1);
      expect(reply?.kind).toBe("message");
      if ("choices" in answer) expect(reply?.kind === "message" && reply.text).toContain("Into a folder named Undated");
      expect(source.list().find((item) => item.id === "photos")?.status.kind).toBe("idle");
    }
  });

  it("takes a message sent while a question waits as its answer, in the user's own words", () => {
    const source = createFakeSource("en");
    source.send("photos", "Put them in 2026/Unknown");
    const blocks = source.conversation("photos")!.blocks;
    const question = blocks.find((block) => block.kind === "question");
    expect(question?.kind === "question" && question.question.answer).toEqual({ choices: [], other: "Put them in 2026/Unknown" });
    expect(blocks.at(-1)).toMatchObject({ kind: "user", text: "Put them in 2026/Unknown" });
    expect(blocks.at(-1)).not.toMatchObject({ pending: true });
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
    expect(source.conversation(carried)).toMatchObject({
      title: "Birthday gift ideas",
      kind: "shared",
      origin: { kind: "carry", session: { id: "gift", archived: true } },
    });
    expect(source.conversation(carried)!.blocks[0]).toMatchObject({ kind: "summarized" });
  });
});

describe("checkpoints and rewinding (note, sections 4.15 and 4.16)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const ids = (source: SessionSource, id: string) =>
    source.conversation(id)!.blocks.map((block) => (block.kind === "versions" ? `v${block.index + 1}/${block.count}` : block.id));

  it("rewinds to before a block's whole step, and restores what came after", () => {
    const source = createFakeSource("en");
    const before = ids(source, "hike");
    // t2 was one of three calls in one response: the rewind goes to before that response.
    source.rewind("hike", "t2");
    expect(ids(source, "hike")).toEqual(["s1", "u1", "rewound-u1"]);
    const rewound = source.conversation("hike")!;
    expect(rewound.activity).toBeUndefined();
    expect(source.list().find((item) => item.id === "hike")?.status.kind).toBe("idle");
    source.restore("hike");
    expect(ids(source, "hike")).toEqual(before);
  });

  it("rewinds a running turn after stopping it, so that its reply never arrives", () => {
    const source = createFakeSource("en");
    source.send("presentation", "One more thing");
    const sent = source.conversation("presentation")!.blocks.at(-1)!;
    source.rewind("presentation", sent.id);
    expect(source.conversation("presentation")!.activity).toBeUndefined();
    vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
    expect(ids(source, "presentation")).toEqual(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "b1", `rewound-b1`]);
  });

  it("edits the user's message as a second way from its checkpoint, and shows either way", () => {
    const source = createFakeSource("en");
    source.edit("presentation", "c3", "Tired, and a bit nervous about tomorrow.");
    expect(ids(source, "presentation").slice(0, 3)).toEqual(["c1", "c2", "v2/2"]);
    expect(source.conversation("presentation")!.blocks[3]).toMatchObject({ kind: "user", text: "Tired, and a bit nervous about tomorrow." });
    expect(source.conversation("presentation")!.activity).toBeDefined();
    vi.advanceTimersByTime(FAKE_REPLY_DELAY_MS);
    expect(source.conversation("presentation")!.blocks.at(-1)?.kind).toBe("message");

    source.showVersion("presentation", "c2", 0);
    expect(ids(source, "presentation")).toEqual(["c1", "c2", "v1/2", "c3", "c4", "c5", "c6", "c7", "b1"]);
    source.showVersion("presentation", "c2", 1);
    const second = source.conversation("presentation")!.blocks;
    expect(ids(source, "presentation").slice(0, 3)).toEqual(["c1", "c2", "v2/2"]);
    expect(second.slice(3).map((block) => block.kind)).toEqual(["user", "message"]);
  });

  it("keeps a quote with the message that carries it, and through an edit", () => {
    const source = createFakeSource("en");
    const quote = { from: "character" as const, text: "Want to treat yourself tonight?" };
    source.send("presentation", "Yes, let's do it", quote);
    const sent = source.conversation("presentation")!.blocks.at(-1)!;
    expect(sent).toMatchObject({ kind: "user", quote });
    source.edit("presentation", sent.id, "Yes, ramen it is");
    expect(source.conversation("presentation")!.blocks.at(-1)).toMatchObject({ kind: "user", text: "Yes, ramen it is", quote });
  });

  it("branches a session with a copy of its conversation, and leaves the session as it is", () => {
    const source = createFakeSource("en");
    const before = source.conversation("presentation");
    const branch = source.branch("presentation");
    expect(source.conversation(branch)).toMatchObject({
      title: "Presentation day (branch)",
      kind: "device",
      origin: { kind: "branch", session: { id: "presentation", title: "Presentation day" } },
    });
    expect(source.conversation(branch)!.blocks).toEqual(before!.blocks);
    expect(source.list().find((item) => item.id === branch)).toMatchObject({ deviceId: "laptop" });
    source.send(branch, "Only in the branch");
    expect(source.conversation("presentation")).toBe(before);
  });

  it("branches a session in the middle of a turn at the checkpoint before the unfinished step", () => {
    const source = createFakeSource("en");
    const branch = source.branch("hike");
    // The step that waits for approval (w2, t5, a1) is left out.
    expect(ids(source, branch).at(-1)).toBe("rv-hike");
    expect(source.conversation(branch)!.activity).toBeUndefined();
    // Still so once a rewind has stopped the turn and a restore brought the waiting step back.
    source.rewind("hike", "t2");
    source.restore("hike");
    expect(source.conversation("hike")!.activity).toBeUndefined();
    expect(ids(source, source.branch("hike")).at(-1)).toBe("rv-hike");
  });

  it("carries on from a live session's summary, and leaves the session live and as it was", () => {
    const source = createFakeSource("en");
    const before = source.conversation("presentation");
    const carried = source.carryOn("presentation");
    expect(source.conversation(carried)).toMatchObject({
      title: "Presentation day",
      origin: { kind: "carry", session: { id: "presentation" } },
    });
    expect(source.conversation(carried)!.blocks.map((block) => block.kind)).toEqual(["summarized"]);
    expect(source.conversation("presentation")).toBe(before);
    expect(source.list().some((item) => item.id === "presentation")).toBe(true);
  });

  it("summarizes a session now, except during a turn", () => {
    const source = createFakeSource("en");
    source.compact("presentation");
    expect(source.conversation("presentation")!.blocks.at(-1)?.kind).toBe("summarized");
    expect(source.conversation("presentation")!.contextUsed).toBeLessThan(0.18);
    const hike = source.conversation("hike");
    source.compact("hike");
    expect(source.conversation("hike")).toBe(hike);
    // A turn stopped while its approval waits is still unfinished.
    source.stop("hike");
    const stopped = source.conversation("hike");
    source.compact("hike");
    expect(source.conversation("hike")).toBe(stopped);
  });

  it("renames a session, ignoring an empty title", () => {
    const source = createFakeSource("en");
    source.rename("presentation", "  The big day ");
    expect(source.list().find((item) => item.id === "presentation")?.title).toBe("The big day");
    source.rename("presentation", "   ");
    expect(source.conversation("presentation")!.title).toBe("The big day");
  });
});
