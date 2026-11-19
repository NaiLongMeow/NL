// @vitest-environment jsdom
import type { CodeMessage } from "@nl/avatar-skill/format";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarView } from "./avatar";
import { CODE_READY_MS, mountCode } from "./code";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(() => {
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount() {
  return mountCode(container, { rendition: { entry: "code/index.html" }, url: (path) => `http://nlavatar.localhost/a/orb/${path}` });
}

function frame() {
  const element = container.querySelector("iframe");
  if (!element) throw new Error("no frame");
  return element;
}

/** Records what the page receives, from now on. */
function received() {
  const sent: [CodeMessage, string][] = [];
  vi.spyOn(frame().contentWindow!, "postMessage").mockImplementation(((message: CodeMessage, target: string) => {
    sent.push([message, target]);
  }) as Window["postMessage"]);
  return sent;
}

function fromPage(data: unknown, source: Window | null = frame().contentWindow) {
  window.dispatchEvent(new MessageEvent("message", { data, source }));
}

const READY = { nlAvatar: 1, type: "ready" };
const cues = (state: string, expression: string, pointer: string | null, look: { x: number; y: number } | null) => ({ nlAvatar: 1, type: "cues", state, expression, pointer, look });

/** Mounts, records what the page receives, and has the page say it is ready. */
async function mountReady(): Promise<[AvatarView, [CodeMessage, string][]]> {
  const mounting = mount();
  const sent = received();
  fromPage(READY);
  return [await mounting, sent];
}

describe("mountCode", () => {
  it("shows the pack's page in a frame sandboxed to scripts alone, which takes no pointer events", async () => {
    const [view] = await mountReady();
    const element = frame();
    expect(element.getAttribute("sandbox")).toBe("allow-scripts");
    expect(element.src).toBe("http://nlavatar.localhost/a/orb/code/index.html");
    expect(element.referrerPolicy).toBe("no-referrer");
    expect(element.style.pointerEvents).toBe("none");
    expect(element.style.colorScheme).toBe("normal");
    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.tabIndex).toBe(-1);
    view.destroy();
  });

  it("keeps the frame hidden and sends nothing until the page says it is ready, then sends the cues", async () => {
    const mounting = mount();
    const sent = received();
    expect(frame().style.visibility).toBe("hidden");
    fromPage({ nlAvatar: 1, type: "cues" });
    expect(sent).toEqual([]);
    fromPage(READY);
    const view = await mounting;
    expect(frame().style.visibility).toBe("");
    expect(sent).toEqual([[cues("idle", "neutral", null, null), "*"]]);
    view.destroy();
  });

  it("sends the cues whenever one changes, and each gesture once", async () => {
    const [view, sent] = await mountReady();
    sent.length = 0;
    view.setState("working");
    view.setState("working");
    view.setExpression("happy");
    view.setExpression(null);
    view.setPointer("hover");
    view.lookAt({ x: 0.5, y: -0.25 });
    view.lookAt({ x: 0.5, y: -0.25 });
    view.lookAt(null);
    view.playGesture("wave");
    view.playGesture("wave");
    expect(sent).toEqual([
      [cues("working", "neutral", null, null), "*"],
      [cues("working", "happy", null, null), "*"],
      [cues("working", "neutral", null, null), "*"],
      [cues("working", "neutral", "hover", null), "*"],
      [cues("working", "neutral", "hover", { x: 0.5, y: -0.25 }), "*"],
      [cues("working", "neutral", "hover", null), "*"],
      [{ nlAvatar: 1, type: "gesture", gesture: "wave" }, "*"],
      [{ nlAvatar: 1, type: "gesture", gesture: "wave" }, "*"],
    ]);
    view.destroy();
  });

  it("answers a page that says it is ready again with the cues as they are, and listens to nothing else", async () => {
    const [view, sent] = await mountReady();
    view.setState("thinking");
    sent.length = 0;
    fromPage(READY);
    expect(sent).toEqual([[cues("thinking", "neutral", null, null), "*"]]);

    fromPage(READY, window);
    fromPage(READY, null);
    fromPage({ nlAvatar: 1, type: "invoke", cmd: "avatars" });
    fromPage("ready");
    expect(sent).toHaveLength(1);
    view.destroy();
  });

  it("counts a page that never says it is ready as broken, and takes its frame away", async () => {
    vi.useFakeTimers();
    const mounting = mount();
    const failed = expect(mounting).rejects.toThrow(/did not say it was ready/);
    vi.advanceTimersByTime(CODE_READY_MS);
    await failed;
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("removes the frame and stops listening when destroyed", async () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");
    const [view] = await mountReady();
    view.destroy();
    expect(container.querySelector("iframe")).toBeNull();
    const listener = added.mock.calls.find(([type]) => type === "message")?.[1];
    expect(listener).toBeDefined();
    expect(removed).toHaveBeenCalledWith("message", listener);
  });
});
