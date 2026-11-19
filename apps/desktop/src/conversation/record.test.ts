import { describe, expect, it } from "vitest";
import type { Block } from "./model";
import {
  appendBlock,
  checkpointBefore,
  childrenOf,
  headOf,
  moveHead,
  newestBelow,
  pathTo,
  recordOf,
  viewOf,
  type SessionRecord,
} from "./record";

const user = (id: string, text = id): Block => ({ kind: "user", id, text, time: "09:00" });
const message = (id: string, text = id): Block => ({ kind: "message", id, text, time: "09:00" });
const working = (id: string): Block => ({ kind: "working", id, text: id });
const ids = (blocks: readonly Block[]) => blocks.map((block) => (block.kind === "versions" ? `v${block.index + 1}/${block.count}` : block.id));

/** u1, then one response (w1, m1, m2) in one step, then u2 and its reply m3. */
function conversation(): SessionRecord {
  return recordOf([user("u1"), working("w1"), message("m1"), message("m2"), user("u2"), message("m3")], [["w1", "m1", "m2"]]);
}

/** Every line of `before` is still in `after`, unchanged and in the same place. */
function appendedOnly(before: SessionRecord, after: SessionRecord) {
  expect(after.length).toBeGreaterThan(before.length);
  before.forEach((line, index) => expect(after[index]).toBe(line));
}

describe("a session's record", () => {
  it("shows the path from the first line to the head", () => {
    const record = conversation();
    expect(headOf(record)).toBe("m3");
    expect(ids(viewOf(record))).toEqual(["u1", "w1", "m1", "m2", "u2", "m3"]);
  });

  it("rewinds to before a whole step, never into the middle of a response", () => {
    const record = conversation();
    expect(checkpointBefore(record, "m2")).toBe("u1");
    expect(checkpointBefore(record, "w1")).toBe("u1");
    expect(checkpointBefore(record, "u2")).toBe("m2");
    expect(checkpointBefore(record, "u1")).toBeNull();
    expect(checkpointBefore(record, "nothing")).toBeUndefined();
  });

  it("rewinds by appending a head line, and keeps every later line", () => {
    const record = conversation();
    const rewound = moveHead(record, checkpointBefore(record, "m2")!, "h1");
    appendedOnly(record, rewound);
    expect(headOf(rewound)).toBe("u1");
    expect(ids(viewOf(rewound))).toEqual(["u1", "rewound-u1"]);
    // Restoring is another head line, to the newest line after the checkpoint.
    const restored = moveHead(rewound, newestBelow(rewound, headOf(rewound)), "h2");
    appendedOnly(rewound, restored);
    expect(ids(viewOf(restored))).toEqual(["u1", "w1", "m1", "m2", "u2", "m3"]);
  });

  it("rewinds to before the first line too", () => {
    const rewound = moveHead(conversation(), checkpointBefore(conversation(), "u1")!, "h1");
    expect(headOf(rewound)).toBeNull();
    expect(ids(viewOf(rewound))).toEqual(["rewound-"]);
    expect(newestBelow(rewound, null)).toBe("m3");
  });

  it("goes on from a checkpoint as a second way, with a versions row where the ways part", () => {
    const record = conversation();
    // Editing u2: the new message follows u2's checkpoint, and becomes the head.
    const edited = appendBlock(record, user("u2b", "edited"), "u2b", checkpointBefore(record, "u2")!);
    appendedOnly(record, edited);
    expect(childrenOf(edited, "m2").map((line) => line.id)).toEqual(["u2", "u2b"]);
    expect(ids(viewOf(edited))).toEqual(["u1", "w1", "m1", "m2", "v2/2", "u2b"]);
    const answered = appendBlock(edited, message("m4"));
    expect(ids(viewOf(answered))).toEqual(["u1", "w1", "m1", "m2", "v2/2", "u2b", "m4"]);

    // Showing the first way goes to its newest line; the second stays in the record.
    const first = moveHead(answered, newestBelow(answered, childrenOf(answered, "m2")[0]!.id), "h1");
    appendedOnly(answered, first);
    expect(ids(viewOf(first))).toEqual(["u1", "w1", "m1", "m2", "v1/2", "u2", "m3"]);
    const versions = viewOf(first).find((block) => block.kind === "versions");
    expect(versions).toMatchObject({ fork: "m2", index: 0, count: 2 });
  });

  it("names the start of the session as the fork when the first line was edited", () => {
    const record = conversation();
    const edited = appendBlock(record, user("u1b"), "u1b", checkpointBefore(record, "u1")!);
    expect(viewOf(edited)[0]).toMatchObject({ kind: "versions", fork: "", index: 1, count: 2 });
    expect(pathTo(edited, headOf(edited)).map((line) => line.id)).toEqual(["u1b"]);
  });

  it("folds later changes into blocks only in the view", () => {
    const record = conversation();
    const view = viewOf(record, (block) => (block.id === "m3" ? { ...block, text: "changed" } : block));
    expect(view.at(-1)).toMatchObject({ id: "m3", text: "changed" });
    expect(record.at(-1)).toMatchObject({ block: { text: "m3" } });
  });
});
