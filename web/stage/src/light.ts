/**
 * The light rendition of an avatar pack: images, cheap to show. Frames and
 * sprite sheets are drawn on a canvas at their own frame rate; an `image`
 * animation (still, or animated GIF, APNG, or WebP) is shown in an <img>,
 * which the browser animates by itself. Nothing is drawn between frames,
 * and nothing at all while the page is hidden, so a pet at rest costs
 * almost nothing.
 *
 * Several things may want to show at once. The highest wins (the format's
 * order): dragging, a press, a gesture, hovering, an expression, an idle
 * extra, then the state. Presses, gestures, and idle extras play once and
 * then give way.
 *
 * The frame is scaled to fit the window with its anchor (the point that
 * stands on the ground; the bottom center by default) at the middle of the
 * window's bottom edge.
 */

import { resolveState, type LightAnimation, type LightRendition } from "@nl/avatar-skill/format";
import { browserTimers, type AvatarView, type Expression, type Gesture, type Pointer, type State, type Timers } from "./avatar";

export interface LightOptions {
  rendition: LightRendition;
  /** The URL of a file of the pack, from its path in the pack. */
  url: (path: string) => string;
  /** Loads an image; tests pass a stand-in. */
  loadImage?: (url: string) => Promise<HTMLImageElement>;
  timers?: Timers;
  /** A number from 0 to 1, for when idle extras play; tests pass a fixed one. */
  random?: () => number;
}

/**
 * How long a one-time animation shown as an animated image lasts: a page
 * cannot tell when a GIF ends, so presses, gestures, and idle extras that use
 * one show for this long.
 */
export const IMAGE_ONCE_MS = 2000;

const DEFAULT_FPS = 8;

/** The layers that can each want an animation, highest first. */
const LAYERS = ["drag", "press", "gesture", "hover", "expression", "extra", "state"] as const;
type Layer = (typeof LAYERS)[number];
/** Layers whose animation plays once and then clears. */
const ONCE: ReadonlySet<Layer> = new Set(["press", "gesture", "extra"]);

function defaultLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

/** Where a frame of `size` goes in a box of `width` x `height` so that `anchor` sits at the bottom middle. */
export function placeFrame(
  size: readonly [number, number],
  anchor: readonly [number, number] | undefined,
  width: number,
  height: number,
): { x: number; y: number; scale: number } {
  const [frameWidth, frameHeight] = size;
  const [anchorX, anchorY] = anchor ?? [frameWidth / 2, frameHeight];
  // The largest scale at which the frame stays inside the box sideways, with
  // the anchor centered, and the part above the anchor fits the height.
  const halfWidth = Math.max(anchorX, frameWidth - anchorX, 1);
  const scale = Math.max(0, Math.min(width / 2 / halfWidth, height / Math.max(anchorY, 1)));
  return { x: width / 2 - anchorX * scale, y: height - anchorY * scale, scale };
}

export function mountLight(container: HTMLElement, options: LightOptions): AvatarView {
  const { rendition, url } = options;
  const loadImage = options.loadImage ?? defaultLoadImage;
  const timers = options.timers ?? browserTimers;
  const random = options.random ?? Math.random;

  const root = document.createElement("div");
  root.className = "nl-light-avatar";
  root.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
  const still = document.createElement("img");
  still.alt = "";
  still.draggable = false;
  still.style.cssText = "position:absolute;display:none;transform-origin:0 0";
  if (rendition.pixelated) {
    canvas.style.imageRendering = "pixelated";
    still.style.imageRendering = "pixelated";
  }
  root.append(canvas, still);
  container.append(root);

  const layers: Partial<Record<Layer, string>> = { state: rendition.states.idle };
  let state: State = "idle";
  let playing: { name: string; layer: Layer; frame: number; timer: number | null } | null = null;
  const extraTimers: number[] = [];
  const images = new Map<string, Promise<HTMLImageElement>>();
  let destroyed = false;

  const image = (path: string) => {
    const address = url(path);
    let pending = images.get(address);
    if (!pending) {
      pending = loadImage(address);
      images.set(address, pending);
    }
    return pending;
  };

  /** The frames an animation draws: the images it needs, loaded. */
  const frames = (animation: LightAnimation) => {
    if (animation.frames) return Promise.all(animation.frames.map(image));
    if (animation.sheet) return Promise.all([image(animation.sheet)]);
    return Promise.resolve([]);
  };

  const frameCount = (animation: LightAnimation) => animation.frames?.length ?? animation.count ?? 1;

  const layout = () => {
    const box = container.getBoundingClientRect();
    const place = placeFrame(rendition.size, rendition.anchor, box.width, box.height);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
    still.style.left = `${place.x}px`;
    still.style.top = `${place.y}px`;
    still.style.width = `${rendition.size[0] * place.scale}px`;
    still.style.height = `${rendition.size[1] * place.scale}px`;
    return { place, ratio };
  };
  let geometry = layout();

  const draw = (animation: LightAnimation, loaded: HTMLImageElement[], frame: number) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const { place, ratio } = geometry;
    const [width, height] = rendition.size;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = !rendition.pixelated;
    const target = [place.x * ratio, place.y * ratio, width * place.scale * ratio, height * place.scale * ratio] as const;
    if (animation.frames) {
      const source = loaded[frame];
      if (source) context.drawImage(source, ...target);
    } else if (animation.sheet && loaded[0]) {
      const columns = animation.columns ?? 1;
      context.drawImage(loaded[0], (frame % columns) * width, Math.floor(frame / columns) * height, width, height, ...target);
    }
  };

  /** The animation the highest layer wants. */
  const top = (): { name: string; layer: Layer } => {
    for (const layer of LAYERS) {
      const name = layers[layer];
      if (name !== undefined && rendition.animations[name]) return { name, layer };
    }
    return { name: rendition.states.idle, layer: "state" };
  };

  const stopTimer = () => {
    if (playing?.timer != null) timers.clearTimeout(playing.timer);
    if (playing) playing.timer = null;
  };

  const finish = (layer: Layer) => {
    delete layers[layer];
    if (layer === "extra") scheduleExtras();
    update();
  };

  /** Shows whatever the layers now want, starting it from its first frame when it changed. */
  const update = () => {
    if (destroyed) return;
    const wanted = top();
    if (playing && playing.name === wanted.name && playing.layer === wanted.layer) return;
    stopTimer();
    const animation = rendition.animations[wanted.name]!;
    const current = { ...wanted, frame: 0, timer: null as number | null };
    playing = current;
    root.dataset.animation = wanted.name;
    root.dataset.frame = "0";
    if (animation.image !== undefined) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      still.src = url(animation.image);
      still.style.display = "block";
      if (ONCE.has(wanted.layer)) current.timer = timers.setTimeout(() => playing === current && finish(wanted.layer), IMAGE_ONCE_MS);
      return;
    }
    void frames(animation).then(
      (loaded) => {
        if (playing !== current || destroyed) return;
        still.style.display = "none";
        still.removeAttribute("src");
        const count = frameCount(animation);
        const interval = 1000 / (animation.fps ?? DEFAULT_FPS);
        const step = () => {
          if (playing !== current || destroyed) return;
          draw(animation, loaded, current.frame);
          root.dataset.frame = String(current.frame);
          const last = current.frame >= count - 1;
          if (last && ONCE.has(wanted.layer)) {
            current.timer = timers.setTimeout(() => playing === current && finish(wanted.layer), interval);
            return;
          }
          if (last && !(animation.loop ?? true)) return; // hold the last frame
          if (count === 1 && !ONCE.has(wanted.layer)) return; // a still frame needs no timer
          current.timer = timers.setTimeout(() => {
            current.frame = last ? 0 : current.frame + 1;
            step();
          }, interval);
        };
        step();
      },
      () => {
        // A frame that does not load leaves the previous picture; the pack's
        // checker reports such files, so there is nothing to tell the user here.
      },
    );
  };

  /** Plans each idle extra at a random time in its range; one plays only while the state is idle and nothing else shows. */
  const scheduleExtras = () => {
    for (const handle of extraTimers.splice(0)) timers.clearTimeout(handle);
    if (destroyed || state !== "idle" || document.hidden) return;
    for (const extra of rendition.idleExtras ?? []) {
      const [min, max] = extra.every;
      const delay = (min + (max - min) * random()) * 1000;
      extraTimers.push(
        timers.setTimeout(() => {
          if (state === "idle" && top().layer === "state") {
            layers.extra = extra.animation;
            update();
          } else {
            scheduleExtras();
          }
        }, delay),
      );
    }
  };

  const resize = () => {
    geometry = layout();
    // Redraw the current frame at the new size: restart the current animation where it is.
    if (playing && rendition.animations[playing.name]?.image === undefined) {
      const current = playing;
      void frames(rendition.animations[current.name]!).then((loaded) => {
        if (playing === current) draw(rendition.animations[current.name]!, loaded, current.frame);
      });
    }
  };
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(container);

  const visibility = () => {
    if (document.hidden) {
      stopTimer();
      for (const handle of extraTimers.splice(0)) timers.clearTimeout(handle);
      playing = null;
    } else {
      update();
      scheduleExtras();
    }
  };
  document.addEventListener("visibilitychange", visibility);

  update();
  scheduleExtras();

  return {
    setState(next: State) {
      state = next;
      layers.state = resolveState(rendition.states, next) ?? rendition.states.idle;
      if (next !== "idle") delete layers.extra;
      update();
      scheduleExtras();
    },
    setExpression(expression: Expression | null) {
      const name = expression && expression !== "neutral" ? rendition.expressions?.[expression] : undefined;
      if (name === undefined) delete layers.expression;
      else layers.expression = name;
      update();
    },
    playGesture(gesture: Gesture) {
      const name = rendition.gestures?.[gesture];
      if (name === undefined) return;
      layers.gesture = name;
      // The same gesture again starts it over.
      if (playing?.layer === "gesture") playing = null;
      update();
    },
    setPointer(pointer: Pointer | null) {
      delete layers.hover;
      delete layers.drag;
      if (pointer === "press") {
        const name = rendition.pointer?.press;
        if (name !== undefined) {
          layers.press = name;
          if (playing?.layer === "press") playing = null;
        }
      } else if (pointer !== null) {
        const name = rendition.pointer?.[pointer];
        if (name !== undefined) layers[pointer] = name;
      }
      update();
    },
    lookAt() {
      // Images cannot turn to look; nothing to do.
    },
    destroy() {
      destroyed = true;
      stopTimer();
      for (const handle of extraTimers.splice(0)) timers.clearTimeout(handle);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      root.remove();
    },
  };
}
