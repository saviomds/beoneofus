# Disaster Recovery

Startup runs `runRecovery()` **before** the HTTP server accepts connections
(`server/index.ts`). It never deletes data and never blind-reseeds.

## Failure scenarios (spec §26, §61–63)

| Scenario | Behaviour |
|---|---|
| **Clean restart** (data present) | Recovery: journal check, integrity check, relationship check → `HEALTHY` → serve. **No reseed.** |
| **First ever boot** (empty `/data`) | Seed from `server/data/seed`, take a `baseline` backup, then recover + serve. |
| **Crash between tmp-write and rename** | Atomic rename never landed → collection file is the prior valid version → journal entry stays `pending` → recovery marks it resolved. **No data loss; the client retries the operation.** |
| **Crash after rename, before `committed` marker** | Collection file is the new version → recovery sees the record matches `after` → marks committed. |
| **Corrupted collection file** (bad JSON or checksum mismatch) | Status → `RECOVERY`. Restore that collection from the newest backup containing it; re-check. |
| **Corruption with no usable backup** | Write `health.json`, throw `RecoveryError`, **process exits non-zero**. Operator restores from `/data/backups` or investigates. Nothing is overwritten. |
| **Orphaned references** (missing org / class / user) | Reported as `relationshipWarnings`; status `WARNING`; server still starts. |
| **Failed deployment / rollback** | Data volume is untouched by deploys. Roll the code back and restart — recovery brings state up cleanly. |
| **Concurrent updates to one record** | Per-collection mutex serialises writes; `expectedVersion` mismatch → `409`, so no lost update. |
| **Duplicate id on create** | `ConflictError` (409); the store is not mutated. |

## Operator runbook

```bash
# Inspect health without starting the app
cat data/system/health.json

# List backups
ls data/backups

# Manual restore (offline): stop the server, copy a backup's files into data/, restart
cp data/backups/<id>/*.json data/
node --import tsx server/index.ts     # recovery verifies before serving

# In-app: Admin → System Health → "Re-run integrity check"; Admin → Backups → "Restore"
```

## Test coverage

`server/test/platform.test.ts`:
- *"corrupting a collection file triggers recovery from backup on next boot"*
- *"an interrupted write leaves the previous valid file intact (atomic rename)"*
- *"the journal records every write and can be replayed"* (no dangling tx)
- *"backup → mutate → restore returns the data and keeps a safety backup"*
- *"a stale versioned update is rejected with 409 (no lost write)"*
