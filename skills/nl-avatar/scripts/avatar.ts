#!/usr/bin/env node
/**
 * The nl-avatar skill's command line. Run it with Node 22.18 or later, which
 * runs TypeScript files directly:
 *
 *   node scripts/avatar.ts inspect <folder>      what images and Live2D models a folder holds (JSON)
 *   node scripts/avatar.ts check <folder>        check a pack; add --json for machine-readable output
 *   node scripts/avatar.ts install <folder>      check, then copy into NL's avatars folder
 *                                                (--to <avatars folder>, --replace)
 *   node scripts/avatar.ts where                 print NL's avatars folder on this computer
 *
 * Exit codes: 0 success, 1 the pack has errors, 2 wrong usage or a failure
 * to read or write files.
 */

import { existsSync, statSync } from "node:fs";
import { checkFolder, defaultAvatarsFolder, inspectFolder, installFolder, InstallError } from "./lib/pack.ts";
import type { Issue } from "./lib/format.ts";

const USAGE = `Usage:
  node avatar.ts inspect <folder>
  node avatar.ts check <folder> [--json]
  node avatar.ts install <folder> [--to <avatars folder>] [--replace]
  node avatar.ts where`;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function folderArgument(args: string[]): string {
  const folder = args.find((arg) => !arg.startsWith("--"));
  if (!folder) fail(USAGE);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) fail(`Not a folder: ${folder}`);
  return folder.replace(/[\\/]+$/, "");
}

function printIssues(issues: Issue[]) {
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  for (const issue of issues) {
    console.log(`${issue.level === "error" ? "error  " : "warning"}  ${issue.at || "(pack)"}  [${issue.code}]  ${issue.message}`);
  }
  console.log(errors === 0 ? `OK: no errors, ${warnings} warning${warnings === 1 ? "" : "s"}.` : `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`);
}

const [command, ...args] = process.argv.slice(2);
try {
  switch (command) {
    case "inspect": {
      console.log(JSON.stringify(inspectFolder(folderArgument(args)), null, 2));
      break;
    }
    case "check": {
      const result = checkFolder(folderArgument(args));
      if (args.includes("--json")) console.log(JSON.stringify({ ok: result.manifest !== null, issues: result.issues }, null, 2));
      else printIssues(result.issues);
      process.exitCode = result.manifest ? 0 : 1;
      break;
    }
    case "install": {
      const to = args.indexOf("--to");
      const target = to >= 0 ? args[to + 1] : defaultAvatarsFolder();
      if (!target) fail(USAGE);
      const folder = folderArgument(args.filter((_, index) => index !== to + 1 || to < 0));
      try {
        const installed = installFolder(folder, target.replace(/[\\/]+$/, ""), { replace: args.includes("--replace") });
        printIssues(installed.result.issues);
        console.log(`Installed "${installed.id}" at ${installed.path}. In NL, open Settings > Pet and press Reload if the list is open.`);
      } catch (error) {
        if (!(error instanceof InstallError)) throw error;
        printIssues(error.result.issues);
        console.error(error.message);
        process.exitCode = 1;
      }
      break;
    }
    case "where": {
      console.log(defaultAvatarsFolder());
      break;
    }
    default:
      fail(USAGE);
  }
} catch (error) {
  fail(`Failed: ${error instanceof Error ? error.message : String(error)}`);
}
