/**
 * The desktop pet window (UI design note, section 6): the character and
 * nothing else, on a transparent window.
 *
 * It shows the look chosen in Settings (look.ts): the built-in ball, or an
 * avatar's light, code, or Live2D rendition, drawn by @nl/stage. A code
 * avatar's page runs in a sandboxed frame that takes no pointer events, so
 * this window keeps the pointer, dragging, and its menus for itself.
 * The character's cue comes from the main window (channel.ts): the state of
 * the session open there. Pointing at the pet, pressing it, and dragging it
 * reach the avatar as pointer cues, and a Live2D avatar looks at the pointer.
 * Dragging moves the window. A right click opens the pet's menu (open NL,
 * Settings, close the pet, quit NL; src-tauri/src/pet.rs). *(user,
 * 2026-11-19)* A double click is too easy to do by accident to close
 * anything, so it only plays: the ball jumps for joy, and an avatar pack
 * bounces with a happy face.
 *
 * A message the character sends while the main window is not in front
 * shows in a bubble above it (PetBubble, app/background.ts).
 *
 * When a Live2D or code avatar cannot load (no WebGL, a broken model, a page
 * that never says it is ready), the pet falls back to the same avatar's
 * light-mode look, or to the ball.
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { mountCode, mountLight, mountLive2D, type AvatarView } from "@nl/stage";
import { avatarFileUrl, checkAvatar, loadAvatars, runtimeFileUrl, type AvatarList } from "../avatars/avatars";
import { shouldStartDrag, type Point } from "../drag";
import { useI18n } from "../i18n/I18n";
import { Avatar, type AvatarCue } from "../ui/Avatar";
import { openMainWindow, openPetMenu, subscribePet, type PetMessage } from "./channel";
import { chooseLook, loadPetPrefs, lookId, type Look } from "./look";
import { PetBubble } from "./PetBubble";
import styles from "./PetWindow.module.css";

/** The ball's share of the window's shorter side. */
const BALL_SHARE = 0.62;

/** How long a double click's play lasts, in milliseconds (the ball's `joy` in Avatar.module.css). */
export const PLAY_MS = 1200;

export function PetWindow() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState(loadPetPrefs);
  const [cue, setCue] = useState<AvatarCue>("idle");
  const [list, setList] = useState<AvatarList | null>(null);
  /** The looks (`lookId`) that failed to load since the avatars were last listed; the pet passes over them. */
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState<PetMessage | null>(null);
  const view = useRef<AvatarView | null>(null);
  const pressedAt = useRef<Point | null>(null);

  useEffect(() => subscribePet(setCue, setPrefs, setMessage), []);
  useEffect(() => {
    let current = true;
    setFailed(new Set());
    loadAvatars().then(
      (next) => current && setList(next),
      () => current && setList(null),
    );
    return () => {
      current = false;
    };
  }, [prefs]);
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const avatars = useMemo(() => list?.avatars.map(checkAvatar) ?? [], [list]);
  const live2d = list?.live2d ?? "no-runtime";
  const look = chooseLook(prefs, avatars, live2d, failed);

  // The pointer, for the avatar's pointer cues and for its gaze; and dragging the window.
  const pointer = (next: "hover" | "press" | "drag" | null) => view.current?.setPointer(next);
  useEffect(() => {
    const release = () => {
      if (pressedAt.current) pointer("hover");
      pressedAt.current = null;
    };
    const move = (event: globalThis.MouseEvent) => {
      if (!pressedAt.current || (event.buttons & 1) === 0) return;
      if (shouldStartDrag(pressedAt.current, { x: event.screenX, y: event.screenY })) {
        pressedAt.current = null;
        pointer("drag");
        void getCurrentWindow().startDragging();
      }
    };
    window.addEventListener("mouseup", release);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", release);
      window.removeEventListener("mousemove", move);
    };
  }, []);
  const onMouseMove = (event: MouseEvent) => {
    view.current?.lookAt({ x: (event.clientX / size.width) * 2 - 1, y: 1 - (event.clientY / size.height) * 2 });
  };

  // A double click plays, once at a time; nothing it does lasts.
  const play = () => {
    if (playing) return;
    setPlaying(true);
    view.current?.playGesture("bounce");
    view.current?.setExpression("happy");
    window.setTimeout(() => {
      setPlaying(false);
      view.current?.setExpression(null);
    }, PLAY_MS);
  };

  return (
    <div
      className={styles.pet}
      title={t.pet.hint}
      data-look={look.kind}
      onMouseEnter={() => pointer("hover")}
      onMouseLeave={() => {
        pointer(null);
        view.current?.lookAt(null);
      }}
      onMouseMove={onMouseMove}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        pressedAt.current = { x: event.screenX, y: event.screenY };
        pointer("press");
      }}
      onDoubleClick={play}
      onContextMenu={(event) => {
        event.preventDefault();
        openPetMenu(t.pet.menu);
      }}
    >
      {look.kind === "ball" ? (
        <span className={styles.ball}>
          <Avatar size={Math.round(Math.min(size.width, size.height) * BALL_SHARE)} cue={cue} play={playing ? "joy" : undefined} />
        </span>
      ) : (
        <PackView key={lookId(look)} look={look} cue={cue} view={view} onFail={(id) => setFailed((before) => new Set(before).add(id))} />
      )}
      {message && (
        <PetBubble
          key={message.id}
          text={message.text}
          onOpen={() => {
            openMainWindow();
            setMessage(null);
          }}
          onDone={() => setMessage(null)}
        />
      )}
    </div>
  );
}

/** An avatar pack's rendition, mounted with @nl/stage. */
function PackView({
  look,
  cue,
  view,
  onFail,
}: {
  look: Exclude<Look, { kind: "ball" }>;
  cue: AvatarCue;
  view: { current: AvatarView | null };
  /** Called with the look's `lookId` when it cannot load. */
  onFail: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cueNow = useRef(cue);
  cueNow.current = cue;

  useEffect(() => {
    const container = box.current;
    if (!container) return;
    let cancelled = false;
    let mounted: AvatarView | null = null;
    const ready = (next: AvatarView) => {
      if (cancelled) {
        next.destroy();
        return;
      }
      mounted = next;
      view.current = next;
      next.setState(cueNow.current);
    };
    const url = (path: string) => avatarFileUrl(look.key, path);
    if (look.kind === "light") {
      ready(mountLight(container, { rendition: look.rendition, url }));
    } else {
      const loading =
        look.kind === "code"
          ? mountCode(container, { rendition: look.rendition, url })
          : mountLive2D(container, { rendition: look.rendition, url, runtimeUrl: runtimeFileUrl });
      loading.then(ready, (error: unknown) => {
        console.error(`The ${look.kind} avatar could not load:`, error);
        if (!cancelled) onFail(lookId(look));
      });
    }
    return () => {
      cancelled = true;
      mounted?.destroy();
      if (view.current === mounted) view.current = null;
    };
    // The look's kind and key name it; its rendition is a new object each
    // time the list reloads, which must not mount the avatar again.
  }, [look.kind, look.key]);

  useEffect(() => view.current?.setState(cue), [cue, view]);

  return <div ref={box} className={styles.stage} />;
}
