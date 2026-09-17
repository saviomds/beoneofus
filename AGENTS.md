# beoneofus web — agent guide

`apps/web` — beoneofus (Next.js 16)

> This is NOT the Next.js you know. This version has breaking changes — APIs,
> conventions, and file structure may differ from your training data. Read the
> relevant guide in `apps/web/node_modules/next/dist/docs/` before writing code.
> Heed deprecation notices.

- React 19, App Router, Supabase auth, deploys to Vercel (project Root Directory = `apps/web`).
- Its own `.gitignore` / `CLAUDE.md` / `AGENTS.md` still apply within the folder.

## Related project

`beoneofus core` (the education & government portal) is no longer part of this
repo — it now lives independently at `C:\Users\Dell\beoneofus-core`. The two
are fully disconnected: no cross-links, no shared env vars, no code imports
between the two projects.
