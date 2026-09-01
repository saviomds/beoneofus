# Deployment

The app is a single Node process that serves the API and the built client.

## Build & run

```bash
npm ci
npm run build          # tsc (client) + tsc (server) + vite build → dist/
npm start              # tsx server/index.ts, serves dist/ + /api on $PORT (default 3001)
```

`npm start` runs the TypeScript server directly via `tsx`. To run pure Node,
compile the server (`tsc -p tsconfig.server.json --outDir dist-server` with
`noEmit:false`) and `node dist-server/index.js`.

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `NODE_ENV` | — | set `production` in prod |
| `BOU_DATA_DIR` | `<repo>/data` | **mount a persistent, backed-up volume here** |
| `COOKIE_SECURE` | `false` | set `true` when served over HTTPS (behind a TLS proxy) |

## Reverse proxy (recommended)

Put nginx/Caddy in front for TLS termination, then set `COOKIE_SECURE=true`.
Forward `X-Forwarded-For` (the app has `trust proxy` on) so audit IPs and rate
limiting are accurate. Add HSTS / CSP / `X-Content-Type-Options` headers at the
proxy.

## The data volume

`$BOU_DATA_DIR` holds `*.json`, `system/journal.log`, `system/health.json` and
`backups/`. It **must** be a persistent volume:

- On first boot the app seeds it from `server/data/seed`.
- On every subsequent boot the app runs recovery and **never** re-seeds or wipes.
- Back the volume up at the infrastructure level in addition to the app's own
  daily snapshots (which live inside the same volume).
- To reset a demo environment: stop the app, delete the volume contents, restart.

## Health

- `GET /api/system/health` (admin session) — storage status, integrity, journal,
  backups, active sessions.
- The process exits non-zero if startup recovery finds unrecoverable corruption —
  wire this to your orchestrator's restart/alert policy; do **not** auto-wipe.

## Scaling / going to a real DB

JSON + a single process is fine for a pilot. Before production load, implement
`SqlRepository` and swap it in `server/lib/db.ts` (see [MIGRATION.md](./MIGRATION.md)).
Services, routes and the client are unchanged.
