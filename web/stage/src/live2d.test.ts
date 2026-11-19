import { describe, expect, it } from "vitest";
import { fitProjection, gestureOffsets } from "./live2d";

/** Where the projection puts a point (x, y) of the model matrix's space, in clip space. */
function project(matrix: Float32Array, x: number, y: number): [number, number] {
  return [matrix[0]! * x + matrix[12]!, matrix[5]! * y + matrix[13]!];
}

describe("fitProjection", () => {
  it("fits a tall model into a tall window by its height", () => {
    // A model half as wide as tall spans x from -0.5 to 0.5 and y from -1 to 1.
    const matrix = fitProjection(240 / 320, 0.5);
    expect(project(matrix, 0, 1)).toEqual([0, 1]);
    expect(project(matrix, 0.5, -1)[0]).toBeCloseTo(0.5 / 0.75);
  });

  it("fits a wide model into a tall window by its width", () => {
    const matrix = fitProjection(0.75, 2);
    const [right, top] = project(matrix, 2, 1);
    expect(right).toBeCloseTo(1);
    expect(top).toBeCloseTo(0.375);
  });

  it("zooms and moves by fractions of the window, up being positive", () => {
    const matrix = fitProjection(1, 1, { zoom: 2, x: 0.25, y: -0.1 });
    expect(project(matrix, 0, 0)).toEqual([0.5, expect.closeTo(-0.2)]);
    expect(project(matrix, 1, 1)).toEqual([2.5, expect.closeTo(1.8)]);
    expect(fitProjection(1, 1, {}, 0.05)[13]).toBeCloseTo(0.1);
  });
});

describe("gestureOffsets", () => {
  it("starts and ends every gesture at rest", () => {
    for (const gesture of ["nod", "shake", "tilt", "bounce", "wave"] as const) {
      for (const p of [0, 1]) {
        const offsets = gestureOffsets(gesture, p);
        for (const value of Object.values(offsets)) expect(Math.abs(value)).toBeLessThan(1e-9);
      }
    }
  });

  it("moves the head the gesture's way", () => {
    expect(gestureOffsets("nod", 0.125).angleY).toBeLessThan(-10);
    expect(gestureOffsets("shake", 0.125).angleX).toBeGreaterThan(10);
    expect(gestureOffsets("tilt", 0.5).angleZ).toBeCloseTo(14);
    expect(gestureOffsets("bounce", 0.25).lift).toBeGreaterThan(0.02);
  });
});
