# NanoLoc Agent Handoff

Last updated: 2026-06-04

This document is for an agent taking over NanoLoc development on `wymacmini`.

## Repository

- Local source machine path: `/Users/huxiao/Public/GitHub/NanoLoc`
- Intended remote path on `wymacmini`: `/Users/admin/Public/ajteter/NanoLoc`
- Git remote: `https://github.com/ajteter/NanoLoc.git`
- Current branch: `0.3.0`
- Current status at handoff: clean against `origin/0.3.0`

## Project Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 6
- SQLite for local development
- Tailwind CSS v4
- Radix/shadcn-style UI components
- NextAuth v5 beta
- Package manager: `pnpm`

Important files:

- `package.json`
- `pnpm-lock.yaml`
- `prisma/schema.prisma`
- `prisma/dev.db`
- `src/app/projects/[id]/page.tsx`
- `src/app/projects/[id]/components/TermRow.tsx`
- `src/lib/services/storage.service.ts`
- `src/lib/ai/br-client.ts`

## Local Cleanup Context

On the source MacBook, `node_modules` and `.next` were deleted to save space.

Do not assume dependencies are installed after copying/cloning. Recreate them on the machine that will run the app:

```bash
pnpm install --frozen-lockfile
```

If pnpm incorrectly reports "Already up to date" while `node_modules` is missing, force relinking:

```bash
pnpm install --frozen-lockfile --force
```

Running the app will recreate `.next`.

## Setup Commands

From the project root:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm dev
```

Build:

```bash
pnpm run build
```

Lint:

```bash
pnpm run lint
```

TypeScript check:

```bash
pnpm exec tsc --noEmit
```

If pnpm has issues on a restricted machine, direct binaries can be used after install:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
```

## Current Validation Baseline

Before cleanup, these checks were run locally:

- `./node_modules/.bin/tsc --noEmit`: passed
- `./node_modules/.bin/eslint .`: failed on existing lint issues

Known lint baseline:

- Existing `@typescript-eslint/no-explicit-any` errors in several files
- Existing unused-variable warnings
- Do not treat the current lint baseline as clean unless those unrelated issues are intentionally fixed

There is currently no test script and no detected Jest/Vitest/Playwright/Cypress test setup.

## Requirement Documents

Primary requirement note:

- `note 0604.txt`

Detailed assessment report:

- `note 0604 evaluation.md`

The assessment recommends splitting the work into stages.

## Recommended First Development Scope

Implement only the first-stage requirements first:

1. CSV export encoding/BOM verification and fixes if needed
2. Add `Remarks`/`remark` column to CSV export
3. Fix translation results that contain newline-followed `|||`
4. Add pin/unpin behavior for the base-language column in the project detail translation table
5. Preserve the base-language column pin state within the current project page across pagination, search, and refresh

Do not include these larger items in the same pass:

- Type system and data-contract refactor
- Language configuration parsing refactor
- App self-localization
- Large-scale multilingual performance optimization
- Duplicate-content check feature

## Suggested Verification For First Stage

Run:

```bash
git status --short
pnpm exec tsc --noEmit
pnpm run build
```

Run lint and report whether any new issues were introduced:

```bash
pnpm run lint
```

CSV checks:

- Downloaded file starts with UTF-8 BOM bytes: `EF BB BF`
- `ñ`, `ç`, `ã`, `¡` display correctly in common CSV consumers
- `Remarks` column exists and values are correct
- CSV escaping still works for commas, double quotes, and newlines

Translation bug checks:

- Simulate or reproduce AI output containing line breaks and `|||`
- Confirm stored/displayed translation no longer contains protocol/separator residue
- Avoid over-cleaning legitimate user content unless the product rule explicitly says to remove all `|||`

UI checks:

- Project detail table scrolls horizontally
- Base-language column can be pinned and unpinned
- Pinned base-language column remains visible while horizontally scrolling
- State persists across pagination
- State persists across search
- State persists after refresh
- State is scoped per project
- Read mode, edit mode, and create-row mode do not have sticky-column offset mismatch

## Remote Execution Notes

Preferred approach on `wymacmini`:

1. Clone the repository rather than copying the whole local folder.
2. Checkout `0.3.0`.
3. Ensure `note 0604.txt` and `note 0604 evaluation.md` are present.
4. Install dependencies on `wymacmini`.
5. Run development and validation there.

Do not copy `node_modules` or `.next` from another machine.

