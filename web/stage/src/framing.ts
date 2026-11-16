/**
 * Fitting a character model into the stage viewport.
 *
 * Models come in arbitrary canvas sizes (a Live2D model may be 4000px tall),
 * while the stage can be a 240x320 desktop pet or a full phone screen. Framing
 * scales the model uniformly so it fits, keeps its proportions, and centres it.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Framing {
  /** Uniform scale applied to the model. */
  scale: number;
  /** Top-left corner of the scaled model inside the viewport, in pixels. */
  x: number;
  y: number;
}

/**
 * Largest uniform scale that fits `model` inside `viewport` minus `padding`
 * pixels on every side, centred. Degenerate sizes (zero or negative, e.g. a
 * webview that has not been laid out yet) yield scale 0 instead of NaN or
 * Infinity, so callers can render nothing rather than garbage.
 */
export function fitModel(viewport: Size, model: Size, padding = 0): Framing {
  const availableWidth = viewport.width - 2 * padding;
  const availableHeight = viewport.height - 2 * padding;
  if (availableWidth <= 0 || availableHeight <= 0 || model.width <= 0 || model.height <= 0) {
    return { scale: 0, x: viewport.width / 2, y: viewport.height / 2 };
  }
  const scale = Math.min(availableWidth / model.width, availableHeight / model.height);
  return {
    scale,
    x: (viewport.width - model.width * scale) / 2,
    y: (viewport.height - model.height * scale) / 2,
  };
}
