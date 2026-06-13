---
name: Clerk v6 upgrade lessons
description: Breaking changes when moving to @clerk/react v6.9.1 — what changed from the v5 pre-release that was briefly available
---

## Key facts

- Clerk skipped stable v5. The only v5.x on npm is `5.54.0`, a broken pre-release whose `@clerk/react` imports symbols (`loadClerkUiScript`, `clerkUiScriptUrl`, `buildClerkUiScriptAttributes`) that don't exist in the co-published `@clerk/shared@3.47.7` dist. **Never use v5.x.**
- Stable is **`@clerk/react@6.9.1`** + **`@clerk/shared@4.17.1`** + **`@clerk/express@2.1.26`** + **`@clerk/themes@2.4.57`**.
- `@clerk/shared` must be listed in `onlyBuiltDependencies` (pnpm-workspace.yaml) so its `postinstall` script runs — but this alone does NOT fix the v5 broken dist; upgrading to v6 is the real fix.

## Breaking API changes (v5→v6)

| v5 pattern | v6 replacement |
|---|---|
| `<SignedIn>…</SignedIn>` | `<Show when="signed-in">…</Show>` |
| `<SignedOut>…</SignedOut>` | `<Show when="signed-out">…</Show>` |
| `<RedirectToSignIn />` | Navigate to `/sign-in` route manually |
| `afterSignInUrl` on `<SignIn>` | Removed — use `forceRedirectUrl` or let Clerk redirect to `/` |
| `colorInputBackground` variable | `colorInput` |
| `colorInputText` variable | `colorInputForeground` |
| `// @ts-expect-error` on `publishableKeyFromHost` | No longer needed — it's a real public export in v6 |

## Server-side import

`publishableKeyFromHost` lives in `@clerk/shared/keys` and must be imported there (the skill pattern). For TypeScript to resolve the types, `@clerk/shared` must be a **direct** dependency of the api-server package — it's a transitive dep of `@clerk/express` but TypeScript won't find the types without a direct declaration.

**Why:** `@clerk/express@2.1.26` lists `@clerk/shared: ^4.17.1` as a runtime dep, but pnpm's TS resolution only looks at declared deps of the workspace package doing the import.

**How to apply:** Add `"@clerk/shared": "^4.17.1"` to api-server's `package.json` `dependencies` whenever `import { publishableKeyFromHost } from "@clerk/shared/keys"` is used.
