import { describe, expect, it } from "vitest";
import { NOTIFICATION_TEXT, NOTIFY_KEY, loadNotify, notificationText, saveNotify } from "./notify";

describe("message notifications", () => {
  it("are on until the user turns them off", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    expect(loadNotify(storage)).toBe(true);
    saveNotify(false, storage);
    expect(store.get(NOTIFY_KEY)).toBe("off");
    expect(loadNotify(storage)).toBe(false);
    saveNotify(true, storage);
    expect(loadNotify(storage)).toBe(true);
  });

  it("show the start of a long message", () => {
    expect(notificationText("Done.")).toBe("Done.");
    const long = "鱼".repeat(NOTIFICATION_TEXT + 10);
    const shown = notificationText(long);
    expect([...shown]).toHaveLength(NOTIFICATION_TEXT);
    expect(shown.endsWith("…")).toBe(true);
  });
});
