# TODO

Open items from the architecture design in [docs/architecture.md](../docs/architecture.md#待定事项).

- [ ] Choose the default open avatar format (VRM is the leading candidate; Live2D stays an optional pack, see [live2d-asset-packs](memory/live2d-asset-packs.md)).
- [ ] Evaluate iroh against WebRTC (str0m or webrtc-rs with coturn) for node-to-node transport.
- [ ] Build a minimal Flutter demo to check that agents can set up and build the iOS toolchain without stalling ([client-stack-decision](memory/client-stack-decision.md) depends on it).
- [ ] Settle the Live2D Expandable Application license terms before shipping Live2D support.
- [ ] Enable branch protection on main in GitHub (require PRs and passing CI); AGENTS.md states the rule but nothing enforces it yet.
