# BeOneOfUs Platform

A monorepo holding the two apps that make up the BeOneOfUs platform. They ship and
deploy independently and each keeps its own login; they are tied together by shared
branding and a cross-link in each app's navigation.

| Path | App | Stack | Deploy target |
|------|-----|-------|---------------|
| [`apps/web`](apps/web) | **beoneofus** — public "Global Opportunity Ecosystem": profiles, opportunities, community, marketplace, IDE | Next.js 16 · React 19 · Supabase auth | Vercel (Root Directory = `apps/web`) |
| [`apps/core`](apps/core) | **beoneofus core** — role-based education & government portal: student / teacher / school / guardian / government / admin | Vite · React 18 · Node/Express · JSON file store | Self-hosted VPS, TLS via Caddy, data on an encrypted volume (see [`apps/core/DEPLOYMENT.md`](apps/core/DEPLOYMENT.md)) |

## How they connect

- **Cross-links only.** `apps/web` has an "Education & Government portal" link to
  `apps/core`; `apps/core` has a "Back to beoneofus" link back. Each app keeps its own
  authentication — a single sign-on bridge is a future phase.
- **Shared brand.** Same wordmark ("BeOneOfUs") and a shared primary accent
  (`#0b90f5` web `beone-orange` ↔ `#2f5fe8` core `--brand`; both blue — keep in sync when
  either changes).
- URLs are environment-driven, never hard-coded:
  - `apps/web` → `NEXT_PUBLIC_CORE_URL` (default `http://localhost:5173`)
  - `apps/core` → `VITE_WEB_URL` (default `http://localhost:3000`)

## Working locally

```bash
npm install            # root: installs `concurrently`
npm run install:all    # installs deps for both apps
npm run dev            # web on :3000, core on :5173 (+ API on :3001), together
```

Per-app scripts: `npm run dev:web` · `npm run dev:core` · `npm run build:web` ·
`npm run build:core` · `npm run test:core` · `npm run lint`.

## Repo notes

- **No npm workspaces.** `apps/web` (React 19) and `apps/core` (React 18) keep separate
  `node_modules` and lockfiles; the root `package.json` only orchestrates.
- `apps/web` history was moved under `apps/web/` during the monorepo restructure — use
  `git log --follow <path>` to trace a file across the move. A full pre-restructure
  history backup lives in `_backup_beoneofus_history.bundle` (git-ignored).
- `apps/core/data/` (the JSON store) is never committed; it is seeded from
  `apps/core/server/data/seed` on first boot and lives on the deployment's encrypted volume.
