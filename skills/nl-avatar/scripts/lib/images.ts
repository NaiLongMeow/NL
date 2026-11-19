/**
 * Reads the size and frame count of PNG (and APNG), GIF, WebP, and JPEG
 * images from their headers, without decoding them and without any library,
 * so that the checker runs under plain Node. The checker uses it to tell an
 * agent how big each image is, whether it is animated, and whether a sprite
 * sheet holds the frames its manifest entry promises.
 */

export interface ImageInfo {
  format: "png" | "gif" | "webp" | "jpeg";
  width: number;
  height: number;
  /** 1 for a still image; the number of frames for an animated one. */
  frames: number;
}

/** The image's format, size, and frame count, or null when `bytes` is not an image this reader knows. */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  try {
    return readPng(bytes) ?? readGif(bytes) ?? readWebp(bytes) ?? readJpeg(bytes);
  } catch {
    // A truncated header reads past the end of the data; such a file is no image.
    return null;
  }
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function need(bytes: Uint8Array, end: number) {
  if (bytes.length < end) throw new RangeError("truncated");
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG: the size is in IHDR; an APNG has an acTL chunk before its image data, with the frame count. */
function readPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 8 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null;
  const data = view(bytes);
  need(bytes, 24);
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  const info: ImageInfo = { format: "png", width: data.getUint32(16), height: data.getUint32(20), frames: 1 };
  // Walk the chunks: length (4), type (4), data, CRC (4).
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = data.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    if (type === "acTL") {
      need(bytes, offset + 12);
      info.frames = Math.max(1, data.getUint32(offset + 8));
      break;
    }
    if (type === "IDAT" || type === "IEND") break;
    offset += 12 + length;
  }
  return info;
}

/** GIF: the size is in the logical screen descriptor; every image descriptor (0x2C) is a frame. */
function readGif(bytes: Uint8Array): ImageInfo | null {
  const signature = bytes.length >= 6 ? ascii(bytes, 0, 6) : "";
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  need(bytes, 13);
  const data = view(bytes);
  const info: ImageInfo = { format: "gif", width: data.getUint16(6, true), height: data.getUint16(8, true), frames: 0 };
  const flags = bytes[10]!;
  let offset = 13 + (flags & 0x80 ? 3 * 2 ** ((flags & 0x07) + 1) : 0);
  const skipSubBlocks = () => {
    for (;;) {
      need(bytes, offset + 1);
      const size = bytes[offset]!;
      offset += 1 + size;
      if (size === 0) return;
    }
  };
  while (offset < bytes.length) {
    const block = bytes[offset]!;
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      // Extension: label, then sub-blocks.
      offset += 2;
      skipSubBlocks();
    } else if (block === 0x2c) {
      need(bytes, offset + 10);
      info.frames += 1;
      const local = bytes[offset + 9]!;
      offset += 10 + (local & 0x80 ? 3 * 2 ** ((local & 0x07) + 1) : 0);
      offset += 1; // LZW minimum code size
      skipSubBlocks();
    } else {
      break;
    }
  }
  info.frames = Math.max(1, info.frames);
  return info;
}

/** WebP: lossy (VP8), lossless (VP8L), or extended (VP8X, which may be animated with ANMF frames). */
function readWebp(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const data = view(bytes);
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    need(bytes, 30);
    return { format: "webp", width: data.getUint16(26, true) & 0x3fff, height: data.getUint16(28, true) & 0x3fff, frames: 1 };
  }
  if (chunk === "VP8L") {
    need(bytes, 25);
    const bits = data.getUint32(21, true);
    return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, frames: 1 };
  }
  if (chunk === "VP8X") {
    need(bytes, 30);
    const width = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
    const height = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
    let frames = 0;
    if (bytes[20]! & 0x02) {
      // Animated: count the ANMF chunks that follow.
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const size = data.getUint32(offset + 4, true);
        if (ascii(bytes, offset, 4) === "ANMF") frames += 1;
        offset += 8 + size + (size % 2);
      }
    }
    return { format: "webp", width, height, frames: Math.max(1, frames) };
  }
  return null;
}

/** JPEG: the size is in the first start-of-frame marker. */
function readJpeg(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const data = view(bytes);
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) {
      offset += marker === 0xff ? 1 : 2;
      continue;
    }
    const length = data.getUint16(offset + 2);
    // SOF0 to SOF15, except DHT (C4), JPG (C8), and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      need(bytes, offset + 9);
      return { format: "jpeg", height: data.getUint16(offset + 5), width: data.getUint16(offset + 7), frames: 1 };
    }
    offset += 2 + length;
  }
  return null;
}
