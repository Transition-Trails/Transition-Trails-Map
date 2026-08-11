#!/usr/bin/env node
/**
 * check-lib-dists.mjs
 *
 * Per-file freshness check for composite TypeScript lib packages.
 *
 * - Discovers which libs to check by reading the root tsconfig.json "references".
 * - Uses TypeScript's own compiler API (readConfigFile + parseJsonConfigFileContent
 *   + getOutputFileNames) so that extended configs and rootDir/outDir are resolved
 *   correctly even if values are inherited.
 * - For each source .ts file it verifies that the paired .d.ts declaration:
 *     1. Exists in dist/
 *     2. Was modified MORE recently than the source file (mtime comparison)
 * - Fails loudly, naming both the lib and the specific stale/missing source file.
 *
 * Exit codes:
 *   0  all composite declaration-emitting libs are up to date
 *   1  one or more source files have a missing or stale paired .d.ts
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "..");

// Load TypeScript compiler API from the workspace's own typescript package.
const require = createRequire(import.meta.url);
const ts = require("typescript");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read + parse a JSON file, stripping single-line // comments (tsconfig style). */
function readJson(filePath) {
  const raw = readFileSync(filePath, "utf8");
  // TypeScript ships its own comment-stripping parser; use it.
  const { config, error } = ts.parseConfigFileTextToJson(filePath, raw);
  if (error) {
    throw new Error(
      `Failed to parse ${filePath}: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}`
    );
  }
  return config;
}

/** Return resolved TS compiler options for a lib tsconfig.json path. */
function resolveCompilerOptions(tsconfigPath) {
  const configDir = dirname(tsconfigPath);
  const jsonConfig = readJson(tsconfigPath);
  const host = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    getCurrentDirectory: () => configDir,
  };
  const parsed = ts.parseJsonConfigFileContent(
    jsonConfig,
    host,
    configDir,
    undefined,
    tsconfigPath
  );
  return { parsed, configDir };
}

/** Walk a directory recursively and return all file paths matching a predicate. */
function walk(dir, pred) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, pred));
    } else if (pred(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** mtime in ms for a path, or -1 if the path does not exist. */
function mtime(filePath) {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Per-lib check
// ---------------------------------------------------------------------------

/**
 * Check one lib. Returns { errors: string[], skipped: boolean }.
 * errors is empty on success or skip; skipped=true means the lib was not checked.
 */
function checkLib(refPath) {
  const libDir = resolve(WORKSPACE_ROOT, refPath.replace(/^\.\//, ""));
  const tsconfigPath = join(libDir, "tsconfig.json");

  if (!ts.sys.fileExists(tsconfigPath)) {
    console.warn(
      `SKIP  [${refPath}]: no tsconfig.json found — lib will not be dist-checked.`
    );
    return { errors: [], skipped: true };
  }

  let parsed, configDir;
  try {
    ({ parsed, configDir } = resolveCompilerOptions(tsconfigPath));
  } catch (err) {
    return { errors: [`[${refPath}] Could not parse tsconfig.json: ${err.message}`], skipped: false };
  }

  const opts = parsed.options;

  // Only check composite projects that emit declarations into an outDir.
  if (!opts.composite && !opts.outDir) {
    console.warn(
      `SKIP  [${refPath}]: tsconfig.json is missing both composite:true and outDir — lib will not be dist-checked.`
    );
    return { errors: [], skipped: true };
  }
  if (!opts.composite) {
    console.warn(
      `SKIP  [${refPath}]: tsconfig.json is missing composite:true — lib will not be dist-checked.`
    );
    return { errors: [], skipped: true };
  }
  if (!opts.outDir) {
    console.warn(
      `SKIP  [${refPath}]: tsconfig.json is missing outDir — lib will not be dist-checked.`
    );
    return { errors: [], skipped: true };
  }

  // Collect all input .ts source files (exclude .d.ts files themselves).
  const sourceFiles = parsed.fileNames.filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".d.ts")
  );

  if (sourceFiles.length === 0) {
    return { errors: [`[${refPath}] No source .ts files found — nothing to check.`], skipped: false };
  }

  const errors = [];
  let checkedCount = 0;

  for (const srcFile of sourceFiles) {
    // Use TypeScript's own output-name resolver for this source file.
    // getOutputFileNames returns all outputs for a given input (e.g. .d.ts + .d.ts.map).
    const outputs = ts.getOutputFileNames(parsed, srcFile, false);
    // We only care about the .d.ts output (not the .d.ts.map).
    const declOutput = outputs.find((o) => o.endsWith(".d.ts") && !o.endsWith(".d.ts.map"));

    if (!declOutput) {
      // No declaration output expected for this source (e.g. a .js helper that
      // somehow made it into fileNames) — skip.
      continue;
    }

    checkedCount++;
    const srcMtime = mtime(srcFile);
    const declMtime = mtime(declOutput);

    if (declMtime === -1) {
      const rel = relative(WORKSPACE_ROOT, declOutput);
      errors.push(
        `[${refPath}] Missing declaration: ${rel}\n` +
          `         Expected output for source: ${relative(WORKSPACE_ROOT, srcFile)}\n` +
          `         Run \`pnpm run typecheck:libs\` to rebuild.`
      );
      continue;
    }

    if (srcMtime > declMtime) {
      const srcRel = relative(WORKSPACE_ROOT, srcFile);
      const declRel = relative(WORKSPACE_ROOT, declOutput);
      errors.push(
        `[${refPath}] Stale declaration: ${declRel}\n` +
          `         Source is newer:    ${srcRel}\n` +
          `         Run \`pnpm run typecheck:libs\` (or \`typecheck:libs:force\` for timestamp drift) to refresh.`
      );
    }
  }

  if (errors.length === 0) {
    const dtsCount = sourceFiles.filter(
      (f) => ts.getOutputFileNames(parsed, f, false).some((o) => o.endsWith(".d.ts") && !o.endsWith(".d.ts.map"))
    ).length;
    console.log(`OK    [${refPath}]: ${dtsCount} .d.ts file(s) checked — all up to date.`);
  }

  return { errors, skipped: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const rootTsconfig = join(WORKSPACE_ROOT, "tsconfig.json");
let rootConfig;
try {
  rootConfig = readJson(rootTsconfig);
} catch (err) {
  console.error(`ERROR: Cannot read root tsconfig.json: ${err.message}`);
  process.exit(1);
}

const references = (rootConfig.references ?? []).map((r) => r.path);

if (references.length === 0) {
  console.warn("WARNING: No references found in root tsconfig.json — nothing to check.");
  process.exit(0);
}

let totalErrors = 0;
let totalChecked = 0;
let totalSkipped = 0;

for (const refPath of references) {
  const { errors: errs, skipped } = checkLib(refPath);
  if (skipped) {
    totalSkipped++;
  } else if (errs.length > 0) {
    for (const e of errs) {
      console.error(`ERROR ${e}`);
    }
    totalErrors += errs.length;
  } else {
    totalChecked++;
  }
}

if (totalErrors > 0) {
  console.error(
    `\nOne or more lib packages have missing or stale declarations. Fix the errors above before running artifact typechecks.`
  );
  process.exit(1);
}

const skippedNote = totalSkipped > 0 ? `, ${totalSkipped} skipped (missing tsconfig or composite config)` : "";
console.log(
  `\nAll ${totalChecked} composite lib package(s) have fresh, complete dist/ declarations${skippedNote}.`
);
