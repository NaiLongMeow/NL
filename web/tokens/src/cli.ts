#!/usr/bin/env node
/**
 * `nl-tokens` (or `pnpm tokens` at the repository root): writes every file
 * generated from design/tokens.json.
 *
 * The generated files are build outputs and are never committed. Every
 * build step that uses them runs this first: the scripts of the web
 * packages that depend on @nl/tokens (`nl-tokens && vite build`, and so on),
 * `pnpm install` (through this package's `prepare` script), and the Flutter
 * jobs in CI and in the release workflow. So a change to the token source
 * reaches every platform by building, without a step anyone can forget.
 *
 * Node runs this file directly (it strips the TypeScript types), so the
 * generator needs no build step of its own. It must depend on nothing but
 * Node's built-in modules: the Flutter jobs run it with plain Node, without
 * installing the workspace.
 *
 * Files are only rewritten when their content changes, so running this
 * before every script costs little and does not wake file watchers.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { TokenError } from "./dtcg.ts";
import { SOURCE, generate } from "./generate.ts";

const root = resolve(import.meta.dirname, "../../..");

try {
  const json: unknown = JSON.parse(readFileSync(resolve(root, SOURCE), "utf8"));
  for (const output of generate(json)) {
    const target = resolve(root, output.path);
    if (existsSync(target) && readFileSync(target, "utf8") === output.content) continue;
    mkdirSync(dirname(target), { recursive: true });
    // Write beside the target and rename over it, so that a build reading
    // the file at the same moment sees the old or the new version, never
    // half of one.
    const temporary = `${target}.${process.pid}.tmp`;
    writeFileSync(temporary, output.content);
    renameSync(temporary, target);
    console.log(`nl-tokens: wrote ${output.path}`);
  }
} catch (error) {
  if (error instanceof TokenError || error instanceof SyntaxError) {
    console.error(`nl-tokens: ${SOURCE}: ${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
