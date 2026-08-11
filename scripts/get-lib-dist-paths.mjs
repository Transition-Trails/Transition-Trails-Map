#!/usr/bin/env node
/*
 * get-lib-dist-paths.mjs
 *
 * Reads the root tsconfig.json "references" array and prints each lib's
 * expected dist/ directory, one path per line, so the CI cache step can
 * discover them dynamically instead of relying on a hard-coded glob
 * (lib/star/dist) that silently misses nested paths such as
 * lib/integrations/foo/dist.
 *
 * When the GITHUB_OUTPUT environment variable is set (i.e. inside a GitHub
 * Actions step) the paths are written in the multiline Actions output format
 * under the key "paths".  Otherwise they are printed to stdout, which is
 * useful for local debugging:
 *
 *   node scripts/get-lib-dist-paths.mjs
 *
 * Exit codes:
 *   0  paths written / printed successfully
 *   1  tsconfig.json could not be read or parsed
 */

import { readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "..");

// Re-use the TypeScript compiler's own comment-stripping JSON parser so that
// tsconfig files with single-line comments are handled correctly.
const require = createRequire(import.meta.url);
const ts = require("typescript");

// ---------------------------------------------------------------------------
// Read root tsconfig.json
// ---------------------------------------------------------------------------

const tsconfigPath = resolve(WORKSPACE_ROOT, "tsconfig.json");
let rootConfig;
try {
  const raw = readFileSync(tsconfigPath, "utf8");
  const { config, error } = ts.parseConfigFileTextToJson(tsconfigPath, raw);
  if (error) {
    console.error(
      `ERROR: Could not parse tsconfig.json: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}`
    );
    process.exit(1);
  }
  rootConfig = config;
} catch (err) {
  console.error(`ERROR: Could not read tsconfig.json: ${err.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build the list of dist/ paths from the references array
// ---------------------------------------------------------------------------

const references = rootConfig.references ?? [];

if (references.length === 0) {
  console.warn("WARNING: No references found in root tsconfig.json -- no dist paths to emit.");
  process.exit(0);
}

// Strip leading "./" so paths like "./lib/db" become "lib/db/dist"
const distPaths = references.map((r) => r.path.replace(/^\.\//, "") + "/dist");

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (process.env.GITHUB_OUTPUT) {
  // GitHub Actions multiline output format:
  //   paths<<DELIMITER
  //   lib/db/dist
  //   lib/api-zod/dist
  //   DELIMITER
  const delimiter = "EOF_LIB_DIST_PATHS";
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `paths<<${delimiter}\n${distPaths.join("\n")}\n${delimiter}\n`
  );
  console.log(`Wrote ${distPaths.length} lib dist path(s) to GITHUB_OUTPUT:`);
  for (const p of distPaths) {
    console.log(`  ${p}`);
  }
} else {
  // Local usage: just print one path per line.
  console.log(distPaths.join("\n"));
}
