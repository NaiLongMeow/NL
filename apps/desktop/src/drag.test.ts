import { describe, expect, it } from "vitest";
import { DRAG_THRESHOLD, shouldStartDrag } from "./drag";

describe("shouldStartDrag", () => {
  const start = { x: 100, y: 100 };

  it("ignores jitter below the threshold, so double-clicks still register", () => {
    expect(shouldStartDrag(start, { x: 102, y: 102 })).toBe(false);
  });

  it("starts once the pointer has moved the threshold distance", () => {
    expect(shouldStartDrag(start, { x: 100 + DRAG_THRESHOLD, y: 100 })).toBe(true);
  });

  it("measures diagonal distance, not each axis separately", () => {
    // 3 px on each axis is about 4.24 px in total.
    expect(shouldStartDrag(start, { x: 103, y: 97 })).toBe(true);
  });
});
