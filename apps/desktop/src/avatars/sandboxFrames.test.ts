import { describe, expect, it } from "vitest";
// The script the app runs at the start of every frame (src-tauri/src/avatars.rs, `sandbox_guard`).
import script from "../../src-tauri/src/sandbox-frames.js?raw";

const WEBRTC = ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCIceTransport"];

/** Runs the script against a stand-in for a frame's global object with the given origin. */
function runIn(origin: string) {
  const global: Record<string, unknown> = { origin, RTCSessionDescription: class {} };
  for (const name of WEBRTC) global[name] = class {};
  new Function("globalThis", script)(global);
  return global;
}

describe("sandbox-frames.js", () => {
  it("takes the ways to open a peer connection away from frames with an opaque origin", () => {
    const frame = runIn("null");
    for (const name of WEBRTC) expect(frame, name).not.toHaveProperty(name);
    // Only what can open a connection goes; the rest of the page is untouched.
    expect(frame).toHaveProperty("RTCSessionDescription");
  });

  it("leaves the app's own pages alone", () => {
    for (const origin of ["http://tauri.localhost", "tauri://localhost", "http://localhost:1420"]) {
      const page = runIn(origin);
      for (const name of WEBRTC) expect(page, `${origin} ${name}`).toHaveProperty(name);
    }
  });
});
