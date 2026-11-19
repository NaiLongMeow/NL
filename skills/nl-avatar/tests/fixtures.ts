/**
 * Builders for the smallest files the checker can recognize: image headers
 * with a chosen size and frame count, a moc3 header, and packs written to a
 * temporary folder. Tests make every file they need, so the repository holds
 * no binary fixtures and no third-party art.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function u32le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function u16le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u24le(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff];
}

function chunk(type: string, data: number[]): number[] {
  // The reader does not verify CRCs, so they are left as zero.
  return [...u32be(data.length), ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
}

/** A PNG header with the given size; an APNG when `frames` is above 1. */
export function png(width: number, height: number, frames = 1): Uint8Array {
  const ihdr = [...u32be(width), ...u32be(height), 8, 6, 0, 0, 0];
  const actl = frames > 1 ? chunk("acTL", [...u32be(frames), ...u32be(0)]) : [];
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("IHDR", ihdr), ...actl, ...chunk("IDAT", [0]), ...chunk("IEND", [])]);
}

/** A GIF with the given size and number of frames (each an empty image, after a graphic control extension). */
export function gif(width: number, height: number, frames = 1): Uint8Array {
  const bytes = [..."GIF89a"].map((c) => c.charCodeAt(0));
  bytes.push(...u16le(width), ...u16le(height), 0x00, 0x00, 0x00);
  for (let index = 0; index < frames; index++) {
    bytes.push(0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00);
    bytes.push(0x2c, 0, 0, 0, 0, ...u16le(width), ...u16le(height), 0x00, 0x02, 0x00);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

/** An extended WebP (VP8X) with the given size, animated with `frames` ANMF chunks when above 1. */
export function webp(width: number, height: number, frames = 1): Uint8Array {
  const vp8x = [frames > 1 ? 0x02 : 0x00, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)];
  const body: number[] = [..."WEBP"].map((c) => c.charCodeAt(0));
  const riffChunk = (type: string, data: number[]) => [...[...type].map((c) => c.charCodeAt(0)), ...u32le(data.length), ...data, ...(data.length % 2 ? [0] : [])];
  body.push(...riffChunk("VP8X", vp8x));
  if (frames > 1) {
    body.push(...riffChunk("ANIM", [0, 0, 0, 0, 0, 0]));
    for (let index = 0; index < frames; index++) body.push(...riffChunk("ANMF", new Array(16).fill(0)));
  }
  return Uint8Array.from([..."RIFF"].map((c) => c.charCodeAt(0)).concat(u32le(body.length), body));
}

/** A lossless WebP (VP8L) header with the given size. */
export function webpLossless(width: number, height: number): Uint8Array {
  const bits = (width - 1) | ((height - 1) << 14);
  const data = [0x2f, ...u32le(bits)];
  const body = [..."WEBPVP8L"].map((c) => c.charCodeAt(0)).concat(u32le(data.length), data, data.length % 2 ? [0] : []);
  return Uint8Array.from([..."RIFF"].map((c) => c.charCodeAt(0)).concat(u32le(body.length), body));
}

/** A baseline JPEG header (SOI, APP0, SOF0) with the given size. */
export function jpeg(width: number, height: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

/** A moc3 header: the "MOC3" magic and a format version. */
export function moc3(version = 5): Uint8Array {
  return Uint8Array.from([0x4d, 0x4f, 0x43, 0x33, version, 0, 0, 0]);
}

/** Writes `files` (path to text, JSON value, or bytes) into a new temporary folder and returns its path. */
export function writePack(files: Record<string, string | object | Uint8Array>): string {
  const folder = mkdtempSync(`${tmpdir()}/nl-avatar-test-`).replace(/\\/g, "/");
  for (const [path, content] of Object.entries(files)) {
    const full = `${folder}/${path}`;
    mkdirSync(full.slice(0, full.lastIndexOf("/")), { recursive: true });
    writeFileSync(full, content instanceof Uint8Array || typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return folder;
}

export function removeFolder(folder: string) {
  rmSync(folder, { recursive: true, force: true });
}

/** A Live2D model file naming a moc3, a texture, two expressions, a motion group, and display info. */
export function model3() {
  return {
    Version: 3,
    FileReferences: {
      Moc: "mochi.moc3",
      Textures: ["mochi.2048/texture_00.png"],
      Physics: "mochi.physics3.json",
      DisplayInfo: "mochi.cdi3.json",
      Expressions: [
        { Name: "smile", File: "exp/smile.exp3.json" },
        { Name: "blush", File: "exp/blush.exp3.json" },
      ],
      Motions: { Wave: [{ File: "motions/wave.motion3.json" }] },
    },
    Groups: [{ Target: "Parameter", Name: "EyeBlink", Ids: ["ParamEyeLOpen", "ParamEyeROpen"] }],
    HitAreas: [{ Id: "HitAreaHead", Name: "Head" }],
  };
}

/** The files of a Live2D model folder matching model3(), under `prefix`. */
export function live2dFiles(prefix = "model/"): Record<string, string | object | Uint8Array> {
  return {
    [`${prefix}mochi.model3.json`]: model3(),
    [`${prefix}mochi.moc3`]: moc3(),
    [`${prefix}mochi.2048/texture_00.png`]: png(2048, 2048),
    [`${prefix}mochi.physics3.json`]: { Version: 3 },
    [`${prefix}mochi.cdi3.json`]: {
      Version: 3,
      Parameters: [
        { Id: "ParamAngleX", GroupId: "", Name: "Angle X" },
        { Id: "ParamEyeSmile", GroupId: "", Name: "Eye smile" },
        { Id: "ParamEyeLOpen", GroupId: "", Name: "Eye L open" },
      ],
    },
    [`${prefix}exp/smile.exp3.json`]: { Type: "Live2D Expression", Parameters: [] },
    [`${prefix}exp/blush.exp3.json`]: { Type: "Live2D Expression", Parameters: [] },
    [`${prefix}motions/wave.motion3.json`]: { Version: 3 },
  };
}
