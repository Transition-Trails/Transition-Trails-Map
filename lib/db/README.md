# @workspace/db

Shared Drizzle ORM schema and database client used by all server-side artifacts in Trail OS.

## Structure

```
lib/db/
├── src/
│   ├── index.ts          # Re-exports client + schema
│   └── schema/           # Drizzle table definitions
├── dist/                 # Compiled type declarations (emitDeclarationOnly)
├── tsconfig.json         # Composite TypeScript project
└── tsconfig.tsbuildinfo  # Incremental build state
```

## How the build works

`lib/db` is a **composite TypeScript project** (`"composite": true` in `tsconfig.json`).
It emits only type declarations (`emitDeclarationOnly: true`) into `dist/` — no runtime
JS is emitted because the consuming artifacts (e.g. `api-server`) import the source
directly through the pnpm workspace symlink.

The root `tsconfig.json` lists `lib/db` (and other lib packages) as project references:

```json
{
  "references": [
    { "path": "./lib/db" },
    ...
  ]
}
```

This means `tsc --build` at the workspace root rebuilds every referenced lib package
before checking anything else. The root `typecheck` script runs that step first:

```
pnpm run typecheck:libs   →  tsc --build (rebuilds lib/db, lib/api-zod, etc.)
pnpm -r ... typecheck     →  artifact-level checks (see fresh declarations)
```

## Why this matters

If `dist/` contains stale declarations — for example after `git pull` adds a new column to
`schema/` but `dist/` wasn't rebuilt — downstream packages will type-check against the old
shape. Errors from missing columns will be silently hidden, and valid code that uses the new
column will fail with a spurious "property does not exist" error.

Running `pnpm run typecheck` at the workspace root always resolves this because
`typecheck:libs` runs first.

## Forcing a full rebuild

`tsc --build` uses `tsconfig.tsbuildinfo` to skip files that haven't changed. In rare cases
(corrupted buildinfo, checkout switching branches, filesystem timestamp drift) the cached
state can be wrong. To bypass it entirely:

```bash
# From the workspace root — force-rebuilds every lib before checking artifacts
pnpm run typecheck:libs:force

# Or target just lib/db
cd lib/db && tsc --build --force
```

## Adding a new table or column

1. Edit (or create) the relevant file under `src/schema/`.
2. Export it from `src/index.ts` if it's a new table.
3. Run `pnpm run typecheck` from the workspace root to verify the whole workspace compiles.
4. Run the Drizzle migration: `pnpm --filter @workspace/api-server run db:push` (dev) or apply the migration in production via the deployment checklist.

> **Never edit files in `dist/` by hand.** They are generated output and will be overwritten
> on the next `tsc --build` run.
