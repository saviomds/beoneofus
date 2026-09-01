# BeOneOfUs Platform — agent guide

Monorepo of two independently deployable apps. Work inside the relevant app directory.

## `apps/web` — beoneofus (Next.js 16)

> This is NOT the Next.js you know. This version has breaking changes — APIs,
> conventions, and file structure may differ from your training data. Read the
> relevant guide in `apps/web/node_modules/next/dist/docs/` before writing code.
> Heed deprecation notices.

- React 19, App Router, Supabase auth, deploys to Vercel (project Root Directory = `apps/web`).
- Its own `.gitignore` / `CLAUDE.md` / `AGENTS.md` still apply within the folder.

## `apps/core` — beoneofus core (Vite + Express)

- React 18 SPA (`src/`) + Node/Express API (`server/`) + shared code (`shared/`), one process.
- **JSON file store** is the database (`server/lib/db.ts` → `FileRepository`). Do not
  introduce a real DB without being asked; the `Repository<T>` seam is where that would go.
- Verification gate before declaring work done:
  `npm run typecheck && npm run lint && npm test && npm run build` (run in `apps/core`).
- After adding a collection: add it to `COLLECTIONS` in `server/lib/store/FileStore.ts`,
  a repo in `server/lib/db.ts`, then `npm run seed`.

## Cross-app rule

The two apps link to each other by env-driven URL only (`NEXT_PUBLIC_CORE_URL`,
`VITE_WEB_URL`). Do not import code across `apps/web` ↔ `apps/core`.
