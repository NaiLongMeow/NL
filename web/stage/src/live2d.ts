/**
 * The Live2D rendition of an avatar pack: a Cubism 3+ model drawn with
 * WebGL by the Cubism Web Framework from a runtime pack (cubism.ts).
 *
 * The model plays its own expressions, motions, physics, and pose. This
 * renderer adds what makes it feel alive, through the standard controls
 * (LIVE2D_CONTROLS in the format, or the ids the pack maps them to): it
 * blinks, breathes and sways, turns its head and eyes toward the pointer,
 * moves its mouth while speaking, and plays the built-in gestures (nod,
 * shake, tilt, bounce) that a pack does not replace with a motion.
 *
 * On top of that come the pack's poses, added in order: `base`, the state's
 * (with the format's fallbacks), the expression's, the pointer's. A pose's
 * `expression` starts the model's expression (the highest pose that names
 * one wins), its `motion` plays one of the group's motions (the state's
 * motion repeats while the state lasts), and its `params` are offsets added
 * every frame, kept within each parameter's range by the framework.
 *
 * It draws at most `fps` times a second (30 by default) and not at all
 * while the page is hidden: Live2D mode is the heavier of the two, but it
 * should not cost more than it shows.
 */

import {
  LIVE2D_CONTROLS,
  folderOf,
  joinPackPath,
  resolveState,
  type Live2DControl,
  type Live2DPose,
  type Live2DRendition,
} from "@nl/avatar-skill/format";
import type { AvatarView, Expression, Gesture, Pointer, State } from "./avatar";
import { loadRuntime, type CubismId, type CubismMotion, type CubismUserModel } from "./cubism";

export interface Live2DOptions {
  rendition: Live2DRendition;
  /** The URL of a file of the pack, from its path in the pack. */
  url: (path: string) => string;
  /** The URL of a file of the runtime pack, from its path in the runtime. */
  runtimeUrl: (path: string) => string;
  /** The most frames drawn per second. */
  fps?: number;
}

/** Motion priorities, as the framework's motion manager understands them. */
const PRIORITY = { idle: 1, normal: 2, force: 3 } as const;

/** How long each built-in gesture lasts, in seconds. */
const GESTURE_SECONDS: Partial<Record<Gesture, number>> = { nod: 1, shake: 1, tilt: 1.4, bounce: 0.8 };

/** The offsets a built-in gesture adds at progress `p` (0 to 1): head angles in degrees, and a lift in window heights. */
export function gestureOffsets(gesture: Gesture, p: number): { angleX: number; angleY: number; angleZ: number; lift: number } {
  const fade = 1 - p;
  switch (gesture) {
    case "nod":
      return { angleX: 0, angleY: -18 * Math.sin(4 * Math.PI * p) * fade, angleZ: 0, lift: 0 };
    case "shake":
      return { angleX: 24 * Math.sin(4 * Math.PI * p) * fade, angleY: 0, angleZ: 0, lift: 0 };
    case "tilt":
      return { angleX: 0, angleY: 0, angleZ: 14 * Math.sin(Math.PI * p), lift: 0 };
    case "bounce":
      return { angleX: 0, angleY: 0, angleZ: 0, lift: 0.05 * Math.abs(Math.sin(2 * Math.PI * p)) * fade };
    default:
      return { angleX: 0, angleY: 0, angleZ: 0, lift: 0 };
  }
}

/**
 * The column-major matrix that fits a model, `modelAspect` wide per unit of
 * height (and 2 units tall after the framework's model matrix), into a
 * window `windowAspect` wide per unit of height: as large as fits whole,
 * times `zoom`, moved by `x` and `y` fractions of the window (up is
 * positive).
 */
export function fitProjection(windowAspect: number, modelAspect: number, framing: { zoom?: number; x?: number; y?: number } = {}, lift = 0): Float32Array {
  const scale = Math.min(1, windowAspect / modelAspect) * (framing.zoom ?? 1);
  return new Float32Array([scale / windowAspect, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1, 0, 2 * (framing.x ?? 0), 2 * ((framing.y ?? 0) + lift), 0, 1]);
}

export async function mountLive2D(container: HTMLElement, options: Live2DOptions): Promise<AvatarView> {
  const { rendition, url } = options;
  const fw = await loadRuntime(options.runtimeUrl);
  const ids = fw.CubismFramework.getIdManager();

  const fetchBuffer = async (path: string) => {
    const response = await fetch(url(path));
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.arrayBuffer();
  };
  const modelFolder = folderOf(rendition.model);
  const inModel = (reference: string) => {
    const path = joinPackPath(modelFolder, reference);
    if (path === null) throw new Error(`The model names a file outside its pack: ${reference}`);
    return path;
  };

  const settingBuffer = await fetchBuffer(rendition.model);
  const setting = new fw.CubismModelSettingJson(settingBuffer, settingBuffer.byteLength);
  const user: CubismUserModel = new fw.CubismUserModel();
  user.loadModel(await fetchBuffer(inModel(setting.getModelFileName())));
  const model = user.getModel();

  const expressions = new Map<string, CubismMotion>();
  for (let index = 0; index < setting.getExpressionCount(); index++) {
    const buffer = await fetchBuffer(inModel(setting.getExpressionFileName(index)));
    const name = setting.getExpressionName(index);
    const motion = user.loadExpression(buffer, buffer.byteLength, name);
    if (motion && !expressions.has(name)) expressions.set(name, motion);
  }
  if (setting.getPhysicsFileName()) {
    const buffer = await fetchBuffer(inModel(setting.getPhysicsFileName()));
    user.loadPhysics(buffer, buffer.byteLength);
  }
  if (setting.getPoseFileName()) {
    const buffer = await fetchBuffer(inModel(setting.getPoseFileName()));
    user.loadPose(buffer, buffer.byteLength);
  }

  const eyeBlinkIds = Array.from({ length: setting.getEyeBlinkParameterCount() }, (_, i) => setting.getEyeBlinkParameterId(i));
  const lipSyncIds = Array.from({ length: setting.getLipSyncParameterCount() }, (_, i) => setting.getLipSyncParameterId(i));
  const control = (name: Live2DControl): CubismId => ids.getId(rendition.parameters?.[name] ?? LIVE2D_CONTROLS[name]);
  const controls = Object.fromEntries((Object.keys(LIVE2D_CONTROLS) as Live2DControl[]).map((name) => [name, control(name)])) as Record<Live2DControl, CubismId>;
  const blinkIds = eyeBlinkIds.length > 0 ? eyeBlinkIds : [controls.eyeLOpen, controls.eyeROpen];
  const mouthIds = lipSyncIds.length > 0 ? lipSyncIds : [controls.mouthOpenY];

  // Motions load when first needed, and stay loaded.
  const groups = new Map<string, CubismMotion[]>();
  const motionsOf = async (group: string) => {
    let list = groups.get(group);
    if (!list) {
      list = [];
      for (let index = 0; index < setting.getMotionCount(group); index++) {
        const buffer = await fetchBuffer(inModel(setting.getMotionFileName(group, index)));
        const motion = user.loadMotion(buffer, buffer.byteLength, `${group}_${index}`, undefined, undefined, setting, group, index);
        if (motion) {
          motion.setEffectIds?.(eyeBlinkIds, lipSyncIds);
          list.push(motion);
        }
      }
      groups.set(group, list);
    }
    return list;
  };
  const playMotion = async (group: string, priority: number) => {
    const list = await motionsOf(group);
    const motion = list[Math.floor(Math.random() * list.length)];
    if (motion) user._motionManager.startMotionPriority(motion, false, priority);
  };

  // The canvas, the WebGL context, the renderer, and the textures.
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  container.append(canvas);
  const attributes: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: true };
  const gl = (canvas.getContext("webgl2", attributes) ?? canvas.getContext("webgl", attributes)) as WebGL2RenderingContext | WebGLRenderingContext | null;
  if (!gl) {
    canvas.remove();
    throw new Error("WebGL is not available");
  }
  const resize = () => {
    const box = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
  };
  resize();
  user.createRenderer(canvas.width, canvas.height);
  const renderer = user.getRenderer();
  renderer.startUp(gl);
  renderer.setIsPremultipliedAlpha(true);
  const textures: WebGLTexture[] = [];
  for (let index = 0; index < setting.getTextureCount(); index++) {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.crossOrigin = "anonymous";
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Could not load the texture ${setting.getTextureFileName(index)}`));
      element.src = url(inModel(setting.getTextureFileName(index)));
    });
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    renderer.bindTexture(index, texture);
    textures.push(texture);
  }
  const shaderPath = options.runtimeUrl("shaders/");
  const projection = new fw.CubismMatrix44();
  const modelAspect = model.getCanvasWidth() / model.getCanvasHeight();

  // What the character is doing.
  let state: State = "idle";
  let expression: Expression | null = null;
  let pointer: Pointer | null = null;
  let gesture: { name: Gesture; started: number; seconds: number } | null = null;
  let gazeTarget = { x: 0, y: 0 };
  const gaze = { x: 0, y: 0 };
  let shownExpression: string | null = null;
  let stateMotion: string | null = null;

  const poses = (): Live2DPose[] => {
    const list: (Live2DPose | undefined)[] = [
      rendition.base,
      resolveState(rendition.states ?? {}, state),
      expression && expression !== "neutral" ? rendition.expressions?.[expression] : undefined,
      pointer ? rendition.pointer?.[pointer] : undefined,
    ];
    return list.filter((pose): pose is Live2DPose => pose !== undefined);
  };

  /** Starts the expression and motions the current poses ask for. */
  const applyPoses = (changed: "state" | "expression" | "pointer" | "all") => {
    const current = poses();
    const wantedExpression = [...current].reverse().find((pose) => pose.expression !== undefined)?.expression ?? null;
    if (wantedExpression !== shownExpression) {
      shownExpression = wantedExpression;
      const motion = wantedExpression === null ? undefined : expressions.get(wantedExpression);
      if (motion) user._expressionManager.startMotion(motion, false);
      else user._expressionManager.stopAllMotions();
    }
    const statePose = resolveState(rendition.states ?? {}, state);
    stateMotion = statePose?.motion ?? null;
    if ((changed === "state" || changed === "all") && stateMotion) void playMotion(stateMotion, PRIORITY.idle);
    if (changed === "expression" && expression && expression !== "neutral") {
      const group = rendition.expressions?.[expression]?.motion;
      if (group) void playMotion(group, PRIORITY.normal);
    }
    if (changed === "pointer" && pointer) {
      const group = rendition.pointer?.[pointer]?.motion;
      if (group) void playMotion(group, PRIORITY.normal);
    }
  };

  // Blinking: open for 2 to 6 seconds, then shut and open again in a quarter of a second.
  let blinkClock = 0;
  let nextBlink = 2 + Math.random() * 4;
  const blinkValue = (dt: number) => {
    blinkClock += dt;
    const t = blinkClock - nextBlink;
    if (t < 0) return 1;
    if (t < 0.08) return 1 - t / 0.08;
    if (t < 0.13) return 0;
    if (t < 0.28) return (t - 0.13) / 0.15;
    blinkClock = 0;
    nextBlink = 2 + Math.random() * 4;
    return 1;
  };

  let elapsed = 0;
  const update = (dt: number) => {
    elapsed += dt;
    model.loadParameters();
    if (user._motionManager.isFinished() && stateMotion) void playMotion(stateMotion, PRIORITY.idle);
    const motionUpdated = user._motionManager.updateMotion(model, dt);
    model.saveParameters();
    if (!motionUpdated) {
      const open = blinkValue(dt);
      for (const id of blinkIds) model.setParameterValueById(id, open);
    }
    user._expressionManager.updateMotion(model, dt);

    // Looking at the pointer, eased so the head turns rather than jumps.
    const ease = Math.min(1, dt * 5);
    gaze.x += (gazeTarget.x - gaze.x) * ease;
    gaze.y += (gazeTarget.y - gaze.y) * ease;
    let lift = 0;
    let angles = { angleX: 0, angleY: 0, angleZ: 0 };
    if (gesture) {
      const progress = (performance.now() - gesture.started) / 1000 / gesture.seconds;
      if (progress >= 1) gesture = null;
      else {
        const offsets = gestureOffsets(gesture.name, progress);
        angles = offsets;
        lift = offsets.lift;
      }
    }
    model.addParameterValueById(controls.angleX, gaze.x * 30 + angles.angleX);
    model.addParameterValueById(controls.angleY, gaze.y * 30 + angles.angleY);
    model.addParameterValueById(controls.angleZ, gaze.x * gaze.y * -30 + angles.angleZ);
    model.addParameterValueById(controls.bodyAngleX, gaze.x * 10);
    model.addParameterValueById(controls.eyeBallX, gaze.x);
    model.addParameterValueById(controls.eyeBallY, gaze.y);

    // Breathing, with the slow sway of a body at rest.
    const wave = (period: number) => Math.sin((2 * Math.PI * elapsed) / period);
    model.addParameterValueById(controls.angleX, 15 * wave(6.5345) * 0.4);
    model.addParameterValueById(controls.angleY, 8 * wave(3.5345) * 0.4);
    model.addParameterValueById(controls.angleZ, 10 * wave(5.5345) * 0.4);
    model.addParameterValueById(controls.bodyAngleX, 4 * wave(15.5345) * 0.4);
    model.setParameterValueById(controls.breath, 0.5 + 0.5 * wave(3.2345));

    if (state === "speaking") {
      const mouth = 0.5 + 0.4 * Math.sin(elapsed * 14) * Math.sin(elapsed * 3.3);
      for (const id of mouthIds) model.setParameterValueById(id, Math.max(0, mouth));
    }

    for (const pose of poses()) {
      for (const [id, offset] of Object.entries(pose.params ?? {})) model.addParameterValueById(ids.getId(id), offset);
    }

    user._physics?.evaluate(model, dt);
    user._pose?.updateParameters(model, dt);
    model.update();
    return lift;
  };

  const draw = (lift: number) => {
    const width = canvas.width;
    const height = canvas.height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    projection.setMatrix(fitProjection(width / height, modelAspect, rendition.framing, lift));
    projection.multiplyByMatrix(user.getModelMatrix());
    renderer.setMvpMatrix(projection);
    renderer.setRenderState(null, [0, 0, width, height]);
    renderer.drawModel(shaderPath);
  };

  const interval = 1000 / (options.fps ?? 30);
  let frame = 0;
  let last = performance.now();
  let lastDrawn = 0;
  let destroyed = false;
  const tick = (now: number) => {
    if (destroyed) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden) {
      last = now;
      return;
    }
    // A small allowance, so that a 60 Hz display still draws every second frame at 30.
    if (now - lastDrawn < interval - 2) return;
    lastDrawn = now;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    draw(update(dt));
  };

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  applyPoses("all");
  frame = requestAnimationFrame(tick);

  return {
    setState(next: State) {
      if (next === state) return;
      state = next;
      applyPoses("state");
    },
    setExpression(next: Expression | null) {
      if (next === expression) return;
      expression = next;
      applyPoses("expression");
    },
    playGesture(name: Gesture) {
      const group = rendition.gestures?.[name]?.motion;
      if (group) {
        void playMotion(group, PRIORITY.force);
        return;
      }
      const seconds = GESTURE_SECONDS[name];
      if (seconds) gesture = { name, started: performance.now(), seconds };
    },
    setPointer(next: Pointer | null) {
      if (next === pointer) return;
      pointer = next;
      applyPoses("pointer");
    },
    lookAt(point: { x: number; y: number } | null) {
      gazeTarget = point ? { x: Math.max(-1, Math.min(1, point.x)), y: Math.max(-1, Math.min(1, point.y)) } : { x: 0, y: 0 };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      user.release();
      for (const texture of textures) gl.deleteTexture(texture);
      canvas.remove();
    },
  };
}
