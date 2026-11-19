import { describe, expect, it } from "vitest";
import { readImageInfo } from "../scripts/lib/images.ts";
import { gif, jpeg, png, webp, webpLossless } from "./fixtures.ts";

describe("readImageInfo", () => {
  it("reads a PNG's size, and an APNG's frame count", () => {
    expect(readImageInfo(png(320, 200))).toEqual({ format: "png", width: 320, height: 200, frames: 1 });
    expect(readImageInfo(png(64, 64, 12))).toEqual({ format: "png", width: 64, height: 64, frames: 12 });
  });

  it("counts a GIF's frames past its extensions", () => {
    expect(readImageInfo(gif(100, 80))).toEqual({ format: "gif", width: 100, height: 80, frames: 1 });
    expect(readImageInfo(gif(100, 80, 7))).toEqual({ format: "gif", width: 100, height: 80, frames: 7 });
  });

  it("reads extended, animated, and lossless WebP", () => {
    expect(readImageInfo(webp(500, 300))).toEqual({ format: "webp", width: 500, height: 300, frames: 1 });
    expect(readImageInfo(webp(256, 256, 5))).toEqual({ format: "webp", width: 256, height: 256, frames: 5 });
    expect(readImageInfo(webpLossless(1000, 16))).toEqual({ format: "webp", width: 1000, height: 16, frames: 1 });
  });

  it("finds a JPEG's size in its start-of-frame marker", () => {
    expect(readImageInfo(jpeg(1920, 1080))).toEqual({ format: "jpeg", width: 1920, height: 1080, frames: 1 });
  });

  it("refuses what is not an image, or is cut short", () => {
    expect(readImageInfo(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(readImageInfo(png(10, 10).subarray(0, 20))).toBeNull();
    expect(readImageInfo(new Uint8Array())).toBeNull();
  });
});
