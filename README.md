# BeOneOfUs Web

**beoneofus** — public "Global Opportunity Ecosystem": profiles, opportunities, community,
marketplace, IDE.

| Path | Stack | Deploy target |
|------|-------|---------------|
| [`apps/web`](apps/web) | Next.js 16 · React 19 · Supabase auth | Vercel (Root Directory = `apps/web`) |

## Related project

**beoneofus core** — the role-based education & government portal (student / teacher /
school / guardian / government / admin) — used to live in this repo under `apps/core`
and has been split out into its own independent project at
`C:\Users\Dell\beoneofus-core` (own git history, own `package.json`, own deploy).

- **Cross-links only.** This app has an "Education & Government portal" link to core;
  core has a "Back to beoneofus" link back. Each app keeps its own authentication — a
  single sign-on bridge is a future phase.
- URLs are environment-driven, never hard-coded: `NEXT_PUBLIC_CORE_URL` (default
  `http://localhost:5173`) points at core; core's `VITE_WEB_URL` points back here.

## Working locally

```bash
npm install       # root: no-op besides the install:all convenience script
npm run dev       # starts apps/web
```

Per-app scripts live in `apps/web/package.json`. To run beoneofus core alongside this
app, `cd` into `C:\Users\Dell\beoneofus-core` and run its own `npm run dev` separately.
