#!/usr/bin/env node
/**
 * check-lib-dists.test.mjs
 *
 * Self-contained integration test for scripts/check-lib-dists.mjs.
 *
 * Scenarios covered:
 *   1. lib with no tsconfig.json        → warns, exits 0
 *   2. lib with tsconfig but no composite → warns, exits 0
 *   3. lib with a stale .d.ts           → errors, exits 1
 *   4. lib with everything correct       → passes, exits 0
 *
 * Usage:
 *   node scripts/check-lib-dists.test.mjs
 *   (or via: pnpm run check:libs:test)
 */

import {
  mkdirSync,
  writeFileSync,
  utimesSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "check-lib-dists.mjs");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? `\n     ${detail}` : ""}`);
    failed++;
  }
}

/** Run the dist-check script with DIST_CHECK_ROOT pointing at rootDir. */
function run(rootDir) {
  return spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, DIST_CHECK_ROOT: rootDir },
    encoding: "utf8",
  });
}

/** Write text to a file, creating parent dirs as needed. */
function write(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

/** Set a file's mtime to a specific Date. */
function touch(filePath, date) {
  utimesSync(filePath, date, date);
}

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

/**
 * Build a minimal root fixture tree under a unique temp dir and return its path.
 * The caller receives the root dir; refs should be relative paths like "./lib/foo".
 */
function makeFixtureRoot(label) {
  const root = join(tmpdir(), `dist-check-test-${label}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  return root;
}

/** Write the root tsconfig.json with the given references. */
function writeRootTsconfig(rootDir, refPaths) {
  const cfg = {
    compileOnSave: false,
    files: [],
    references: refPaths.map((p) => ({ path: p })),
  };
  write(join(rootDir, "tsconfig.json"), JSON.stringify(cfg, null, 2));
}

/** Minimal composite tsconfig for a lib. */
function compositeLibTsconfig(extras = {}) {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: true,
        outDir: "dist",
        rootDir: "src",
        ...extras,
      },
      include: ["src"],
    },
    null,
    2
  );
}

// ---------------------------------------------------------------------------
// Scenario 1: lib with no tsconfig.json
// ---------------------------------------------------------------------------

console.log("\nScenario 1: lib with no tsconfig.json → warns, exits 0");
{
  const root = makeFixtureRoot("no-tsconfig");
  writeRootTsconfig(root, ["./lib/no-tsconfig"]);
  // Deliberately do NOT create lib/no-tsconfig/tsconfig.json — just the dir.
  mkdirSync(join(root, "lib", "no-tsconfig"), { recursive: true });

  const result = run(root);

  assert(
    "exits with code 0",
    result.status === 0,
    `exit code was ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
  );
  assert(
    "emits a SKIP warning mentioning the lib",
    result.stderr.includes("SKIP") &&
      result.stderr.includes("no-tsconfig"),
    `stderr: ${result.stderr}`
  );
  assert(
    "does not print ERROR",
    !result.stderr.includes("ERROR"),
    `stderr contained ERROR: ${result.stderr}`
  );

  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Scenario 2: lib with tsconfig but no composite
// ---------------------------------------------------------------------------

console.log(
  "\nScenario 2: lib with tsconfig but no composite → warns, exits 0"
);
{
  const root = makeFixtureRoot("no-composite");
  writeRootTsconfig(root, ["./lib/no-composite"]);

  const libDir = join(root, "lib", "no-composite");
  mkdirSync(libDir, { recursive: true });
  // tsconfig has outDir but no composite.
  write(
    join(libDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          declaration: true,
          outDir: "dist",
          rootDir: "src",
        },
        include: ["src"],
      },
      null,
      2
    )
  );

  const result = run(root);

  assert(
    "exits with code 0",
    result.status === 0,
    `exit code was ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
  );
  assert(
    "emits a SKIP warning mentioning composite",
    result.stderr.includes("SKIP") && result.stderr.includes("composite"),
    `stderr: ${result.stderr}`
  );
  assert(
    "does not print ERROR",
    !result.stderr.includes("ERROR"),
    `stderr contained ERROR: ${result.stderr}`
  );

  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Scenario 3: lib with a stale .d.ts → errors, exits 1
// ---------------------------------------------------------------------------

console.log("\nScenario 3: lib with stale .d.ts → errors, exits 1");
{
  const root = makeFixtureRoot("stale");
  writeRootTsconfig(root, ["./lib/stale"]);

  const libDir = join(root, "lib", "stale");
  mkdirSync(libDir, { recursive: true });
  write(join(libDir, "tsconfig.json"), compositeLibTsconfig());

  // Create source file.
  const srcFile = join(libDir, "src", "index.ts");
  write(srcFile, "export const x = 1;\n");

  // Create the declaration file but give it an older mtime than the source.
  const declFile = join(libDir, "dist", "index.d.ts");
  write(declFile, "export declare const x = 1;\n");

  const past = new Date(Date.now() - 10_000); // 10 seconds ago
  touch(declFile, past);

  // Make source file newer than the declaration.
  const now = new Date();
  touch(srcFile, now);

  const result = run(root);

  assert(
    "exits with code 1",
    result.status === 1,
    `exit code was ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
  );
  assert(
    "stdout/stderr mentions ERROR and Stale",
    (result.stdout + result.stderr).includes("ERROR") &&
      (result.stdout + result.stderr).includes("Stale"),
    `output: ${result.stdout}${result.stderr}`
  );
  assert(
    "identifies the stale lib",
    (result.stdout + result.stderr).includes("stale"),
    `output: ${result.stdout}${result.stderr}`
  );

  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Scenario 4: lib with correct, fresh .d.ts → passes, exits 0
// ---------------------------------------------------------------------------

console.log("\nScenario 4: lib with fresh .d.ts → passes, exits 0");
{
  const root = makeFixtureRoot("ok");
  writeRootTsconfig(root, ["./lib/ok"]);

  const libDir = join(root, "lib", "ok");
  mkdirSync(libDir, { recursive: true });
  write(join(libDir, "tsconfig.json"), compositeLibTsconfig());

  // Create source file with an older mtime.
  const srcFile = join(libDir, "src", "index.ts");
  write(srcFile, "export const greeting = 'hello';\n");

  const past = new Date(Date.now() - 10_000);
  touch(srcFile, past);

  // Create the declaration file with a newer mtime.
  const declFile = join(libDir, "dist", "index.d.ts");
  write(declFile, "export declare const greeting = 'hello';\n");

  const now = new Date();
  touch(declFile, now);

  const result = run(root);

  assert(
    "exits with code 0",
    result.status === 0,
    `exit code was ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
  );
  assert(
    "prints OK for the lib",
    result.stdout.includes("OK"),
    `stdout: ${result.stdout}`
  );
  assert(
    "does not print ERROR",
    !(result.stdout + result.stderr).includes("ERROR"),
    `output: ${result.stdout}${result.stderr}`
  );

  rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(50)}`);
console.log(`check-lib-dists tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
