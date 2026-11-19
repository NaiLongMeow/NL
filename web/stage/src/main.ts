/**
 * Standalone stage page, for the mobile app's webview later and for trying
 * a pack in a browser now. It shows the pack whose folder URL is in the
 * `pack` query parameter, in the `mode` asked for (`light`, the default, or
 * `live2d`, which also needs `runtime`, the URL of a Live2D runtime folder),
 * in the `state` given (`idle` by default). For example, with `pnpm dev`:
 *
 *   /?pack=/@fs/C:/packs/mochi/&mode=light&state=working
 */

import { checkManifest, STATES, type State } from "@nl/avatar-skill/format";
import { mountLight, mountLive2D } from "./index";

async function show(container: HTMLElement, params: URLSearchParams) {
  const pack = params.get("pack");
  if (!pack) return;
  const base = pack.endsWith("/") ? pack : `${pack}/`;
  const url = (path: string) => base + path.split("/").map(encodeURIComponent).join("/");
  const manifest = await (await fetch(url("avatar.json"))).json();
  // The page has no file list, so file references are not checked here; the rest is.
  const { issues } = checkManifest(manifest, { has: () => true } as unknown as ReadonlySet<string>);
  for (const issue of issues) console.warn(`${issue.at}: ${issue.message}`);
  const state = (STATES as readonly string[]).includes(params.get("state") ?? "") ? (params.get("state") as State) : "idle";
  if (params.get("mode") === "live2d" && manifest.live2d) {
    const runtime = params.get("runtime") ?? "";
    const runtimeBase = runtime.endsWith("/") ? runtime : `${runtime}/`;
    const view = await mountLive2D(container, { rendition: manifest.live2d, url, runtimeUrl: (path) => runtimeBase + path });
    view.setState(state);
  } else if (manifest.light) {
    mountLight(container, { rendition: manifest.light, url }).setState(state);
  }
}

const stage = document.querySelector<HTMLElement>("#stage");
if (stage) void show(stage, new URLSearchParams(location.search)).catch((error) => console.error(error));
