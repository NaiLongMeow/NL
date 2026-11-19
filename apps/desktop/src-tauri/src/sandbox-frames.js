// Runs at the start of every document in every frame of the app's windows,
// before the document's own scripts (avatars.rs, `sandbox_guard`).
//
// A code avatar runs in a frame with sandbox="allow-scripts", which gives it
// an opaque origin, and every frame it can make has an opaque origin too.
// Its content-security policy keeps every request it makes inside its own
// pack, but no policy covers WebRTC: Chromium and WebKit ignore the proposed
// `webrtc` directive, so a peer connection could still reach any host. This
// takes away the ways to make one before any of the avatar's scripts run.
// The app's own pages never have an opaque origin and keep them.
(function (global) {
  if (global.origin !== "null") return;
  for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCIceTransport"]) {
    delete global[name];
  }
})(globalThis);
