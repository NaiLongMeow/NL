/**
 * The Live2D Cubism runtime, loaded at run time from a runtime pack and
 * never bundled: Cubism Core is proprietary and the Cubism Web Framework is
 * under Live2D's own license, so neither enters NL's repository or builds
 * (see docs/architecture.md and the nl-avatar skill).
 *
 * A runtime pack holds `live2dcubismcore.min.js` (Cubism Core, which defines
 * the global `Live2DCubismCore`), `cubism-framework.js` (a build of the
 * Cubism Web Framework 5 that defines the global `CubismFw` with
 * `CubismFramework`, `Option`, `LogLevel`, `CubismModelSettingJson`,
 * `CubismUserModel`, and `CubismMatrix44`), and the framework's WebGL
 * shaders in `shaders/`.
 *
 * The interfaces below describe only the part of the framework's API that
 * live2d.ts calls, so that it type-checks without the framework's sources.
 */

/** A parameter id as the framework's id manager hands it out. */
export type CubismId = { readonly __cubismId: unique symbol };

export interface CubismMotion {
  setFadeInTime(seconds: number): void;
  setFadeOutTime(seconds: number): void;
  setEffectIds?(eyeBlinkIds: CubismId[], lipSyncIds: CubismId[]): void;
}

export interface CubismMotionManager {
  startMotionPriority(motion: CubismMotion, autoDelete: boolean, priority: number): number;
  startMotion(motion: CubismMotion, autoDelete: boolean): number;
  updateMotion(model: CubismModel, deltaSeconds: number): boolean;
  isFinished(): boolean;
  stopAllMotions(): void;
}

export interface CubismModel {
  getCanvasWidth(): number;
  getCanvasHeight(): number;
  getParameterIndex(id: CubismId): number;
  getParameterCount(): number;
  setParameterValueById(id: CubismId, value: number, weight?: number): void;
  addParameterValueById(id: CubismId, value: number, weight?: number): void;
  loadParameters(): void;
  saveParameters(): void;
  update(): void;
}

export interface CubismMatrix44 {
  setMatrix(values: Float32Array): void;
  multiplyByMatrix(other: CubismMatrix44): void;
  getArray(): Float32Array;
}

export interface CubismRenderer {
  startUp(gl: WebGLRenderingContext | WebGL2RenderingContext): void;
  setIsPremultipliedAlpha(premultiplied: boolean): void;
  bindTexture(index: number, texture: WebGLTexture): void;
  setMvpMatrix(matrix: CubismMatrix44): void;
  setRenderState(frameBuffer: WebGLFramebuffer | null, viewport: number[]): void;
  /** Draws the model; `shaderPath` is the folder URL the shaders are fetched from, ending in "/". */
  drawModel(shaderPath?: string | null): void;
}

export interface CubismUserModel {
  loadModel(buffer: ArrayBuffer, checkConsistency?: boolean): void;
  loadExpression(buffer: ArrayBuffer, size: number, name: string): CubismMotion | null;
  loadMotion(
    buffer: ArrayBuffer,
    size: number,
    name: string,
    onFinished?: unknown,
    onBegan?: unknown,
    setting?: CubismModelSetting,
    group?: string,
    index?: number,
  ): CubismMotion | null;
  loadPhysics(buffer: ArrayBuffer, size: number): void;
  loadPose(buffer: ArrayBuffer, size: number): void;
  createRenderer(width: number, height: number, maskBufferCount?: number): void;
  getRenderer(): CubismRenderer;
  getModel(): CubismModel;
  getModelMatrix(): CubismMatrix44;
  release(): void;
  // The framework's own managers, which a CubismUserModel creates; the
  // official samples drive them directly in the same way.
  _motionManager: CubismMotionManager;
  _expressionManager: CubismMotionManager;
  _physics: { evaluate(model: CubismModel, deltaSeconds: number): void } | null;
  _pose: { updateParameters(model: CubismModel, deltaSeconds: number): void } | null;
}

export interface CubismModelSetting {
  getModelFileName(): string;
  getTextureCount(): number;
  getTextureFileName(index: number): string;
  getExpressionCount(): number;
  getExpressionName(index: number): string;
  getExpressionFileName(index: number): string;
  getMotionGroupCount(): number;
  getMotionGroupName(index: number): string;
  getMotionCount(group: string): number;
  getMotionFileName(group: string, index: number): string;
  getPhysicsFileName(): string;
  getPoseFileName(): string;
  getEyeBlinkParameterCount(): number;
  getEyeBlinkParameterId(index: number): CubismId;
  getLipSyncParameterCount(): number;
  getLipSyncParameterId(index: number): CubismId;
}

export interface CubismFw {
  CubismFramework: {
    startUp(option?: unknown): boolean;
    initialize(memorySize?: number): void;
    isStarted(): boolean;
    isInitialized(): boolean;
    getIdManager(): { getId(id: string): CubismId };
  };
  Option: new () => { logFunction: (message: string) => void; loggingLevel: number };
  LogLevel: Record<string, number>;
  CubismModelSettingJson: new (buffer: ArrayBuffer, size: number) => CubismModelSetting;
  CubismUserModel: new () => CubismUserModel;
  CubismMatrix44: new () => CubismMatrix44;
}

interface RuntimeGlobals {
  Live2DCubismCore?: { Version?: { csmGetVersion(): number } };
  CubismFw?: CubismFw;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load the Live2D runtime file ${src}`));
    document.head.append(script);
  });
}

/**
 * Cubism Core compiles its WebAssembly asynchronously after its script has
 * run; until then its functions throw. Wait until it answers.
 */
async function coreReady(globals: RuntimeGlobals, timeoutMs = 10_000): Promise<void> {
  const start = performance.now();
  for (;;) {
    try {
      if (globals.Live2DCubismCore?.Version?.csmGetVersion()) return;
    } catch {
      // Not compiled yet.
    }
    if (performance.now() - start > timeoutMs) throw new Error("Cubism Core did not start");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

let loading: Promise<CubismFw> | null = null;

/**
 * Loads the runtime from `url` (which maps a runtime file's path to its URL)
 * once per page, starts the framework, and returns it.
 */
export function loadRuntime(url: (path: string) => string): Promise<CubismFw> {
  loading ??= (async () => {
    const globals = window as unknown as RuntimeGlobals;
    if (!globals.Live2DCubismCore) await loadScript(url("live2dcubismcore.min.js"));
    await coreReady(globals);
    if (!globals.CubismFw) await loadScript(url("cubism-framework.js"));
    const fw = globals.CubismFw;
    if (!fw) throw new Error("The Live2D runtime has no Cubism Framework (the CubismFw global)");
    if (!fw.CubismFramework.isStarted()) {
      const option = new fw.Option();
      option.logFunction = (message) => console.warn(`[Cubism] ${message.trim()}`);
      // Errors only: the framework warns once per drawing while its shaders
      // are still loading, hundreds of lines in the first few frames.
      option.loggingLevel = fw.LogLevel.LogLevel_Error ?? 4;
      fw.CubismFramework.startUp(option);
    }
    if (!fw.CubismFramework.isInitialized()) fw.CubismFramework.initialize();
    return fw;
  })();
  // A failed load may be tried again, for example after the runtime is installed.
  loading.catch(() => {
    loading = null;
  });
  return loading;
}
