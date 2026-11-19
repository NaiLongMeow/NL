// @vitest-environment jsdom
import type { LightRendition } from "@nl/avatar-skill/format";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_ONCE_MS, mountLight, placeFrame } from "./light";

const rendition: LightRendition = {
  size: [100, 100],
  animations: {
    idle: { frames: ["idle/1.png", "idle/2.png", "idle/3.png"], fps: 10 },
    work: { frames: ["work/1.png", "work/2.png"], fps: 5 },
    blink: { sheet: "blink.png", columns: 2, count: 4, fps: 20 },
    wave: { frames: ["wave/1.png", "wave/2.png"], fps: 10 },
    poke: { frames: ["poke/1.png"], fps: 10 },
    peek: { frames: ["peek/1.png", "peek/2.png"], fps: 10, loop: false },
    hearts: { image: "hearts.gif" },
    dangle: { image: "dangle.webp" },
  },
  states: { idle: "idle", working: "work", question: "peek" },
  idleExtras: [{ animation: "blink", every: [2, 4] }],
  expressions: { happy: "hearts" },
  gestures: { wave: "wave", bounce: "hearts" },
  pointer: { hover: "poke", press: "wave", drag: "dangle" },
};

let container: HTMLElement;
const loaded: string[] = [];

function mount(random = 0.5) {
  return mountLight(container, {
    rendition,
    url: (path) => `pack://${path}`,
    loadImage: (url) => {
      loaded.push(url);
      return Promise.resolve({ width: 100, height: 100 } as HTMLImageElement);
    },
    random: () => random,
  });
}

const shown = () => {
  const root = container.querySelector<HTMLElement>(".nl-light-avatar")!;
  return [root.dataset.animation, Number(root.dataset.frame)];
};
const still = () => container.querySelector("img")!;

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no 2D canvas; drawing is skipped and the timing is what is tested.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  container = document.createElement("div");
  document.body.append(container);
  loaded.length = 0;
});

afterEach(() => {
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("mountLight", () => {
  it("loops the idle frames at their frame rate", async () => {
    mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(["idle", 0]);
    await vi.advanceTimersByTimeAsync(100);
    expect(shown()).toEqual(["idle", 1]);
    await vi.advanceTimersByTimeAsync(200);
    expect(shown()).toEqual(["idle", 0]);
    expect(loaded).toEqual(["pack://idle/1.png", "pack://idle/2.png", "pack://idle/3.png"]);
  });

  it("shows a state's animation, or the state it falls back to", async () => {
    const view = mount();
    view.setState("working");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(["work", 0]);
    view.setState("thinking"); // thinking → working
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(["work", 0]);
    view.setState("approval"); // approval → question
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("peek");
    view.setState("error"); // error → idle
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("idle");
  });

  it("holds the last frame of an animation that does not loop", async () => {
    const view = mount();
    view.setState("question");
    await vi.advanceTimersByTimeAsync(1000);
    expect(shown()).toEqual(["peek", 1]);
  });

  it("plays a gesture once, then returns to the state", async () => {
    const view = mount();
    view.setState("working");
    view.playGesture("wave");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(["wave", 0]);
    await vi.advanceTimersByTimeAsync(100);
    expect(shown()).toEqual(["wave", 1]);
    await vi.advanceTimersByTimeAsync(100);
    expect(shown()).toEqual(["work", 0]);
    view.playGesture("nod"); // not in the pack: nothing happens
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()).toEqual(["work", 0]);
  });

  it("puts a press above hovering, and dragging above both", async () => {
    const view = mount();
    view.setPointer("hover");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("poke");
    view.setPointer("press");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("wave");
    view.setPointer("hover"); // released while still over it: the press finishes first
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("wave");
    await vi.advanceTimersByTimeAsync(200);
    expect(shown()[0]).toBe("poke");
    view.setPointer("drag");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("dangle");
    view.setPointer(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("idle");
  });

  it("shows an animated image as an image, and ends a one-time one after a while", async () => {
    const view = mount();
    view.setExpression("happy");
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("hearts");
    expect(still().getAttribute("src")).toBe("pack://hearts.gif");
    expect(still().style.display).toBe("block");
    view.setExpression(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(shown()[0]).toBe("idle");
    expect(still().style.display).toBe("none");

    view.playGesture("bounce");
    await vi.advanceTimersByTimeAsync(IMAGE_ONCE_MS - 1);
    expect(shown()[0]).toBe("hearts");
    await vi.advanceTimersByTimeAsync(1);
    expect(shown()[0]).toBe("idle");
  });

  it("plays idle extras now and then, only while idle", async () => {
    const view = mount(0.5); // every [2, 4] seconds: after 3
    await vi.advanceTimersByTimeAsync(2999);
    expect(shown()[0]).toBe("idle");
    await vi.advanceTimersByTimeAsync(1);
    expect(shown()).toEqual(["blink", 0]);
    await vi.advanceTimersByTimeAsync(200); // four frames at 20 fps
    expect(shown()[0]).toBe("idle");

    view.setState("working");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(shown()[0]).toBe("work");
  });

  it("stops everything and leaves the page as it was when destroyed", async () => {
    const view = mount();
    await vi.advanceTimersByTimeAsync(0);
    view.destroy();
    expect(container.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("placeFrame", () => {
  it("fits a frame standing on the bottom middle", () => {
    expect(placeFrame([100, 100], undefined, 240, 320)).toEqual({ x: 0, y: 80, scale: 2.4 });
    expect(placeFrame([200, 100], undefined, 240, 320)).toEqual({ x: 0, y: 200, scale: 1.2 });
  });

  it("puts the anchor at the bottom middle, and fits around it", () => {
    // The anchor is a quarter from the left: the larger side (150) must fit half the width.
    expect(placeFrame([200, 200], [50, 200], 300, 400)).toEqual({ x: 100, y: 200, scale: 1 });
    // A shadow below the feet hangs below the window's edge.
    expect(placeFrame([100, 100], [50, 80], 100, 400)).toEqual({ x: 0, y: 320, scale: 1 });
  });

  it("does not fail on an empty window", () => {
    expect(placeFrame([100, 100], undefined, 0, 0).scale).toBe(0);
  });
});
