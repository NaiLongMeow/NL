/**
 * Turns the token source into every generated file. Pure: reading and
 * writing files is the CLI's job (cli.ts), so tests can generate in memory.
 * Like the CLI, it may use nothing but Node's built-in modules (see cli.ts).
 */

import { parseTokens } from "./dtcg.ts";
import { buildDesign } from "./model.ts";
import { emitCss } from "./emit-css.ts";
import { emitTs } from "./emit-ts.ts";
import { emitDart } from "./emit-dart.ts";

/** The token source, relative to the repository root. */
export const SOURCE = "design/tokens.json";

/** Generated files, relative to the repository root. */
export const OUTPUTS = {
  css: "web/tokens/generated/tokens.css",
  ts: "web/tokens/generated/tokens.ts",
  dart: "apps/client/lib/src/theme/tokens.g.dart",
} as const;

export interface Output {
  /** Where the file goes, relative to the repository root. */
  path: string;
  content: string;
}

/** Generates every output from the parsed JSON of the token source. */
export function generate(json: unknown): Output[] {
  const design = buildDesign(parseTokens(json));
  return [
    { path: OUTPUTS.css, content: emitCss(design) },
    { path: OUTPUTS.ts, content: emitTs(design) },
    { path: OUTPUTS.dart, content: emitDart(design) },
  ];
}
