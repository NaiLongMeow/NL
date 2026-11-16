import { describe, expect, it } from "vitest";
import { fitModel } from "./framing";

describe("fitModel", () => {
  it("scales a tall model down to the viewport height and centres it horizontally", () => {
    expect(fitModel({ width: 240, height: 320 }, { width: 1000, height: 2000 })).toEqual({
      scale: 0.16,
      x: 40,
      y: 0,
    });
  });

  it("scales a wide model to the viewport width and centres it vertically", () => {
    expect(fitModel({ width: 200, height: 200 }, { width: 400, height: 100 })).toEqual({
      scale: 0.5,
      x: 0,
      y: 75,
    });
  });

  it("keeps padding on every side", () => {
    const framing = fitModel({ width: 120, height: 120 }, { width: 100, height: 100 }, 10);
    expect(framing).toEqual({ scale: 1, x: 10, y: 10 });
  });

  it.each([
    [{ width: 0, height: 320 }, { width: 100, height: 100 }],
    [{ width: 240, height: 320 }, { width: 0, height: 100 }],
    [{ width: 20, height: 20 }, { width: 100, height: 100 }],
  ])("returns scale 0 for degenerate sizes (%o, %o)", (viewport, model) => {
    const framing = fitModel(viewport, model, 10);
    expect(framing.scale).toBe(0);
    expect(Number.isFinite(framing.x) && Number.isFinite(framing.y)).toBe(true);
  });
});
