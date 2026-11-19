import { describe, expect, it } from "vitest";
import type { Block } from "../conversation/model";
import type { SessionSource } from "../conversation/source";
import { deliveryFor, newMessages, watchMessages, type Arrival } from "./background";

const message = (id: string, text: string, streaming?: boolean): Block => ({ kind: "message", id, text, time: "09:00", streaming });

describe("where a message goes besides its session", () => {
  it("goes nowhere else while the main window is in front", () => {
    expect(deliveryFor({ focused: true, petShown: true, notifications: true })).toBe("none");
    expect(deliveryFor({ focused: true, petShown: false, notifications: true })).toBe("none");
  });

  it("goes to the pet when it is shown, and to a notification otherwise, unless notifications are off", () => {
    expect(deliveryFor({ focused: false, petShown: true, notifications: true })).toBe("pet");
    expect(deliveryFor({ focused: false, petShown: true, notifications: false })).toBe("pet");
    expect(deliveryFor({ focused: false, petShown: false, notifications: true })).toBe("notification");
    expect(deliveryFor({ focused: false, petShown: false, notifications: false })).toBe("none");
  });
});

describe("new messages", () => {
  it("are the finished messages not seen before, each once", () => {
    const seen = new Set<string>();
    const user: Block = { kind: "user", id: "u1", text: "hi", time: "09:00" };
    expect(newMessages(seen, [{ id: "a", blocks: [user, message("m1", "one")] }])).toEqual([{ session: "a", id: "m1", text: "one" }]);
    expect(newMessages(seen, [{ id: "a", blocks: [user, message("m1", "one")] }])).toEqual([]);
    const streaming = [{ id: "a", blocks: [message("m1", "one"), message("m2", "tw", true)] }];
    expect(newMessages(seen, streaming)).toEqual([]);
    const finished = [
      { id: "a", blocks: [message("m1", "one"), message("m2", "two")] },
      { id: "b", blocks: [message("m3", "three")] },
    ];
    expect(newMessages(seen, finished).map((arrival) => arrival.id)).toEqual(["m2", "m3"]);
  });
});

describe("watching a source", () => {
  /** Just enough of a session source: this device, a phone, and their sessions' blocks. */
  function stubSource() {
    const listeners = new Set<() => void>();
    const blocks = new Map<string, Block[]>([
      ["mine", [message("m1", "history")]],
      ["shared", []],
      ["phone's", []],
    ]);
    const source = {
      devices: () => [
        { id: "desktop3", name: "Desk", type: "computer", self: true, online: true },
        { id: "phone1", name: "Phone", type: "phone", online: true },
      ],
      list: () => [
        { id: "mine", title: "", kind: "device", deviceId: "desktop3", status: "idle", acceptsTasks: true },
        { id: "shared", title: "", kind: "shared", status: "idle", acceptsTasks: true },
        { id: "phone's", title: "", kind: "device", deviceId: "phone1", status: "idle", acceptsTasks: true },
      ],
      conversation: (id: string) => ({ blocks: blocks.get(id) ?? [] }),
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as unknown as SessionSource;
    const add = (session: string, block: Block) => {
      blocks.set(session, [...(blocks.get(session) ?? []), block]);
      for (const listener of listeners) listener();
    };
    return { source, add };
  }

  it("reports what arrives in this device's sessions and shared ones, never the history or another device's", () => {
    const { source, add } = stubSource();
    const arrivals: Arrival[] = [];
    const stop = watchMessages(source, (arrival) => arrivals.push(arrival));
    expect(arrivals).toEqual([]);
    add("mine", message("m2", "for this desk"));
    add("phone's", message("m3", "for the phone"));
    add("shared", message("m4", "for everyone"));
    expect(arrivals.map((arrival) => arrival.text)).toEqual(["for this desk", "for everyone"]);
    stop();
    add("mine", message("m5", "after stopping"));
    expect(arrivals).toHaveLength(2);
  });
});
