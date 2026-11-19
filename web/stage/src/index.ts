/**
 * Public API of the stage renderer, which draws avatar packs (the format of
 * skills/nl-avatar/references/format.md) for the desktop app's windows and,
 * through a webview, for the mobile app: the light rendition (images), the
 * Live2D rendition (with a Live2D runtime loaded at run time), and the code
 * rendition (a page of the pack's own, run sandboxed).
 */

export type { AvatarView, Expression, Gesture, Pointer, State, Timers } from "./avatar";
export { CODE_READY_MS, mountCode, type CodeOptions } from "./code";
export { IMAGE_ONCE_MS, mountLight, placeFrame, type LightOptions } from "./light";
export { fitProjection, gestureOffsets, mountLive2D, type Live2DOptions } from "./live2d";
