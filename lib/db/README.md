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
3. Write a SQL migration file in `drizzle/` (e.g. `0015_my_change.sql`) using `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so it is safe to re-run.
4. Add the migration entry to `drizzle/meta/_journal.json` (copy the format of the last entry, incrementing `idx`).
5. Run `pnpm run typecheck` from the workspace root to verify the whole workspace compiles.
6. Apply the migration to dev:

```bash
# From the workspace root — applies every SQL file in lib/db/drizzle/ via psql
bash scripts/apply-migrations.sh
```

## Applying migrations (no-TTY environments)

`drizzle-kit push` requires a TTY for interactive prompts and fails immediately with
`EOF` when stdin is closed — which is the case in the post-merge hook, CI, and any
non-interactive shell. **Always use `psql` to apply migrations**, not `drizzle-kit push`.

```bash
# Apply all pending migrations (idempotent — safe to re-run)
bash scripts/apply-migrations.sh
```

### How the migration runner works

`scripts/apply-migrations.sh` maintains a `_trail_migrations` ledger table in the
database. On each run it:

1. Creates the ledger table if it doesn't exist.
2. **Bootstraps** existing databases — if the ledger is empty but the database already
   has tables (previously set up via `drizzle-kit push`), every SQL file currently in
   the migrations directory is seeded into the ledger so it is not re-applied.
3. Applies any migration file **not yet in the ledger** inside a `BEGIN`/`COMMIT`
   transaction with `ON_ERROR_STOP=1`. A failure stops the script immediately and rolls
   back the partial migration; the ledger row is not written, so the file will be
   retried on the next run.

This means the script is safe to run multiple times — already-applied files are always
skipped — and failures are never silently swallowed.

The post-merge hook (`scripts/post-merge.sh`) calls `apply-migrations.sh` automatically,
so every clean clone or CI environment gets a fully-migrated database without manual steps.

> **Never edit files in `dist/` by hand.** They are generated output and will be overwritten
> on the next `tsc --build` run.
