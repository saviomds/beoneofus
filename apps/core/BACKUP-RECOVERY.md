# Backup & Recovery

## Storage engine (`server/lib/store/`)

| File | Role |
|---|---|
| `FileStore.ts` | atomic writes (`tmp → fsync → rename`), per-collection `AsyncMutex`, sha256 checksums, seeding |
| `journal.ts` | append-only NDJSON transaction log (`/data/system/journal.log`) |
| `backup.ts` | `snapshot(label)`, `restore(id)`, `restoreCollection`, `pruneBackups` |
| `recovery.ts` | `runRecovery()` — the startup routine; `HealthReport` |
| `checksum.ts` | `wrap` / `verify` collection files |

## Every write

```
mutex.acquire()
 → read rows → apply mutation
 → journal: { txId, op, collection, recordId, before, after, status:'pending' }
 → write <file>.json.tmp → fsync → rename  (atomic on the same FS)
 → journal: { txId, status:'committed' }
```

A crash at any point leaves the collection file either fully old or fully new —
never half-written. A `pending` entry with no `committed` marker is an
*incomplete transaction* that recovery resolves.

## Backups

- `/data/backups/<ISO>-<label>/` — a copy of every collection file (except
  `authSessions`) + the journal + a `manifest.json` (counts, fingerprint).
- **Automatic:** a `baseline` snapshot after the first clean boot; a `daily`
  snapshot on a 24h timer (keeps the last 30); a `pre-restore` snapshot before
  every restore.
- **Manual:** `POST /api/system/backups` (admin) — the **Backups** page.

## Restore

`POST /api/system/restore { backupId, confirm: "RESTORE" }` (admin):
1. take a `pre-restore` safety snapshot of the current state,
2. copy the backup's files over the live ones,
3. re-run recovery,
4. audit `BACKUP_RESTORED`.

A restore is therefore itself reversible (restore the `pre-restore` snapshot).
Live sessions are **not** part of backups, so a restore does not sign anyone out.

## Startup recovery (`runRecovery`, before `listen()`)

1. **Journal replay** — for each incomplete transaction, check whether the
   record on disk matches `after` (committed) or not (the atomic rename never
   happened → no data loss, just mark resolved). Finalise every dangling tx.
2. **Integrity** — parse + checksum every collection. A corrupt file is restored
   from the newest backup that contains it; re-checked. If still unrecoverable →
   write `health.json`, throw `RecoveryError`, **exit** (never serve bad data,
   never blind-reseed).
3. **Relationship validation** — orphan `organizationId` / dangling `classId` etc.
   are reported as warnings (status `WARNING`), not fatal.
4. Compact the journal, write `/data/system/health.json`.

`GET /api/system/health` surfaces all of this; `POST /api/system/recheck`
re-runs it on demand.

See [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) for the failure-scenario matrix.
