/**
 * The code rendition of an avatar pack: a page of the pack's own, with its
 * scripts, styles, images, and WebAssembly, which draws the character any
 * way it likes (skills/nl-avatar/references/format.md, "The code
 * rendition").
 *
 * *(user, 2026-11-19)* The page runs sandboxed. It is shown in an iframe
 * with `sandbox="allow-scripts"` and no other permission, so its origin is
 * opaque: it has no storage or cookies, cannot reach into this page, and
 * nothing it sends counts as coming from the app. The desktop app serves
 * every pack file with a content-security policy that keeps everything the
 * page loads inside its own pack, and takes WebRTC away from its frame
 * (apps/desktop/src-tauri/src/avatars.rs). The frame is the only part of the
 * sandbox that lives here, so keep its `sandbox` attribute exactly as it is.
 *
 * The page says it is ready (`CodeReady` in the format) once it listens,
 * and from then on hears the character's cues as messages (`CodeMessage`):
 * the cues as they are at once and whenever one changes, and each gesture
 * once. Nothing else it sends is listened to. Until it says it is ready the
 * frame stays hidden, so an error page never shows; a page that has not said
 * so within `CODE_READY_MS` counts as broken, and the window that shows it
 * shows something else.
 *
 * The frame takes no pointer events: the window that shows it keeps
 * dragging, its menu, and double click for itself, and passes the pointer
 * on as cues. What the avatar costs to run depends on its code.
 */

import type { CodeMessage, CodeRendition } from "@nl/avatar-skill/format";
import { browserTimers, type AvatarView, type Expression, type Pointer, type State, type Timers } from "./avatar";

export interface CodeOptions {
  rendition: CodeRendition;
  /** The URL of a file of the pack, from its path in the pack. */
  url: (path: string) => string;
  timers?: Timers;
}

/** How long a code avatar's page may take to say it is ready before it counts as broken. */
export const CODE_READY_MS = 10_000;

/** The cues as the page last heard them. */
interface Cues {
  state: State;
  expression: Expression;
  pointer: Pointer | null;
  look: { x: number; y: number } | null;
}

/**
 * Shows the code rendition in `container`. Resolves once the page says it
 * is ready; rejects, having removed the frame, when it has not said so
 * within `CODE_READY_MS`.
 */
export function mountCode(container: HTMLElement, options: CodeOptions): Promise<AvatarView> {
  const timers = options.timers ?? browserTimers;
  const frame = document.createElement("iframe");
  frame.className = "nl-code-avatar";
  // Scripts and nothing else: no same origin, forms, popups, downloads,
  // top-level navigation, or pointer lock.
  frame.setAttribute("sandbox", "allow-scripts");
  frame.referrerPolicy = "no-referrer";
  // The character is drawn art; the window that shows it names it for
  // assistive technology, and the frame never takes the focus.
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // `color-scheme: normal` keeps the frame transparent: a browser paints an
  // opaque background behind a frame whose page has another color scheme
  // than the frame element, and a page that sets none has this one.
  frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;color-scheme:normal;pointer-events:none;visibility:hidden";
  frame.src = options.url(options.rendition.entry);

  const cues: Cues = { state: "idle", expression: "neutral", pointer: null, look: null };
  let ready = false;
  let listen: (event: MessageEvent) => void = () => {};
  let timeout = 0;
  const post = (message: CodeMessage) => {
    // The page's origin is opaque, so no target origin but "*" reaches it;
    // the cues are no secret, and only this frame's window receives them.
    if (ready) frame.contentWindow?.postMessage(message, "*");
  };
  const sendCues = () => post({ nlAvatar: 1, type: "cues", ...cues });
  const change = (next: Partial<Cues>) => {
    const changed = (Object.keys(next) as (keyof Cues)[]).some((key) => !same(cues[key], next[key]));
    if (!changed) return;
    Object.assign(cues, next);
    sendCues();
  };

  const view: AvatarView = {
    setState(state) {
      change({ state });
    },
    setExpression(expression) {
      change({ expression: expression ?? "neutral" });
    },
    playGesture(gesture) {
      post({ nlAvatar: 1, type: "gesture", gesture });
    },
    setPointer(pointer) {
      change({ pointer });
    },
    lookAt(point) {
      change({ look: point && { x: point.x, y: point.y } });
    },
    destroy() {
      timers.clearTimeout(timeout);
      window.removeEventListener("message", listen);
      frame.remove();
    },
  };

  return new Promise<AvatarView>((resolve, reject) => {
    listen = (event) => {
      // Only this frame's page, and only its "ready", which asks for
      // nothing but the cues it would have heard anyway. A page that starts
      // again (it may reload itself) says so again and hears them again.
      if (event.source !== frame.contentWindow || !isReady(event.data)) return;
      if (!ready) {
        ready = true;
        timers.clearTimeout(timeout);
        frame.style.visibility = "";
        resolve(view);
      }
      sendCues();
    };
    timeout = timers.setTimeout(() => {
      view.destroy();
      reject(new Error(`The code avatar's page (${options.rendition.entry}) did not say it was ready within ${CODE_READY_MS} ms.`));
    }, CODE_READY_MS);
    window.addEventListener("message", listen);
    container.append(frame);
  });
}

function same(a: Cues[keyof Cues] | undefined, b: Cues[keyof Cues] | undefined): boolean {
  if (a && b && typeof a === "object" && typeof b === "object") return a.x === b.x && a.y === b.y;
  return a === b;
}

function isReady(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { nlAvatar?: unknown }).nlAvatar === 1 && (data as { type?: unknown }).type === "ready";
}
