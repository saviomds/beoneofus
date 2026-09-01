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

---

## Private self-hosted deployment (recommended)

The JSON store stays the database. It lives on an **encrypted, backed-up volume on a
VPS you control** — no third-party DB, no shared managed Postgres. TLS is terminated by
Caddy; only 80/443 face the internet. Files in this folder:

| File | Purpose |
|---|---|
| `Dockerfile` | single Node 22 image: `npm ci` → `npm run build` → `npm start` |
| `docker-compose.yml` | `core` (internal only) + `caddy` (80/443, auto-TLS) |
| `Caddyfile` | reverse proxy + HSTS/CSP-ish headers, forwards `X-Forwarded-For` |
| `.env.example` | copy to `.env` on the host |
| `deploy/backup.sh` / `deploy/restore.sh` | off-box **age-encrypted** backups + restore drill |

### 1. Provision the box

- A small VPS (e.g. Hetzner CX22, EU region) — 2 vCPU / 4 GB is plenty for a pilot.
- Attach a **separate data volume** (don't put data on the root disk).

### 2. Encrypt the data volume

```bash
apt install cryptsetup
cryptsetup luksFormat /dev/sdb
cryptsetup luksOpen /dev/sdb bou-data
mkfs.ext4 /dev/mapper/bou-data
mkdir -p /srv/bou/data
mount /dev/mapper/bou-data /srv/bou/data
```

Unlock trade-off, pick one and document it for your team:
- **Keyfile on the root disk** (`/etc/crypttab` + keyfile) — auto-mounts on reboot;
  protects against a stolen *detached* volume, not a stolen running box.
- **Manual unlock on boot** (SSH in, `cryptsetup luksOpen`, `docker compose up`) —
  protects against a stolen box; needs a human on every reboot.

### 3. Harden

```bash
ufw default deny incoming && ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
apt install unattended-upgrades fail2ban
```

### 4. Run

```bash
apt install docker.io docker-compose-plugin
git clone <this-repo> /srv/bou/app && cd /srv/bou/app/apps/core
cp .env.example .env && edit .env           # SITE_ADDRESS, VITE_WEB_URL, backup vars
export BOU_HOST_DATA_DIR=/srv/bou/data
docker compose --env-file .env up -d --build
```

First boot seeds `/srv/bou/data` from `server/data/seed`. Every later boot runs recovery
and **never** re-seeds or wipes (`server/index.ts`).

### 5. DNS + TLS

Point `education.b1overs.com` (A/AAAA) at the VPS. Caddy issues the certificate on
first request. Set `VITE_WEB_URL` to the public site so the "Back to beoneofus" link
works (it is baked in at image build time — rebuild if you change it).

### 6. Backups

```bash
age-keygen -o ~/bou-backup.age-key           # keep the PRIVATE key OFF this box
grep public ~/bou-backup.age-key             # -> BACKUP_AGE_RECIPIENT in .env
rclone config                                # -> BACKUP_RCLONE_DEST (B2/S3/…)
crontab -e
# 15 2 * * *  cd /srv/bou/app/apps/core && ./deploy/backup.sh >> /var/log/bou-backup.log 2>&1
```

Run `deploy/restore.sh <archive> /tmp/restore-check ~/bou-backup.age-key` now and
monthly — a backup you have never restored is not a backup. The app's own daily
snapshots live *inside* the volume (`data/backups/`); `backup.sh` is the off-box copy.

### 7. Monitoring

- `docker compose ps` / `docker inspect` — the container `HEALTHCHECK` is a TCP probe.
- `GET /api/system/health` (admin session) for storage integrity + journal state.
- The process exits non-zero on unrecoverable corruption — `restart: unless-stopped`
  will loop it; alert on a crash-looping container and restore from backup.
