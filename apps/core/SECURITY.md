# Security

## Controls in place

| Area | Control |
|---|---|
| **Tenant isolation** | Enforced in every service (`scopeRows` / `assertTenant`), not the browser. Route params re-checked against the loaded record. Cross-tenant access → `403 TENANT_FORBIDDEN`. |
| **AuthZ** | Permission checks (`assertPermission` / `requirePermission`) separate from tenant checks; both required. |
| **Passwords** | `scrypt` (Node built-in) with per-user salt. No plaintext anywhere. Demo password only for seeded accounts. |
| **Sessions** | Server-side `authSessions`, opaque random id in an **httpOnly** cookie, `SameSite=Lax`, `Secure` behind TLS, 8h TTL with sliding expiry, revocable. |
| **Brute force** | Per-account lockout (5 fails → 10 min) + coarse IP rate-limit on `/api/auth/*`. |
| **Input** | JSON body limit 1 MB; services validate required fields, statuses, min password length; unknown fields on updates are stripped (`id`, `organizationId`, `version`, `passwordHash` can never be patched through the API). |
| **Output** | `toSafeUser` strips `passwordHash` / `passwordSalt` from every user returned. Mentor **private notes** are stripped for students and non-owning teachers. Government analytics are aggregate-only. |
| **Audit** | Every mutation writes an append-only `auditLogs` row (`actorId`, `organizationId`, `action`, `targetId`, `result`, `ip`, `metadata`). No update/delete route for audit. |
| **Recovery-safety** | Restart never wipes/reseeds. Corruption halts startup rather than serving bad data. Restore always takes a safety backup first and needs a typed confirmation. |
| **Headers** | `trust proxy` for correct client IPs; static client served with Express defaults. Add a reverse proxy for HSTS/CSP in production (see DEPLOYMENT.md). |

## Known limitations (browser-/single-process demo)

- Single Node process → the write mutex is in-process. For multi-process add
  `proper-lockfile` around `FileStore.mutate`.
- No CSRF token: mitigated by `SameSite=Lax` + JSON-only content type + no
  cookie-auth on GET side-effects. Add a token if cross-site POSTs are ever needed.
- `fsync`+rename gives best-effort durability; true guarantees depend on the OS/FS.
- Rate-limit state is in-memory (resets on restart).
- No email/SMS: password-reset and onboarding show tokens/codes on screen.

## Reporting

This is a demo. For a real deployment, run `npm audit`, put the app behind a TLS
proxy with `COOKIE_SECURE=true`, mount `/data` on a backed-up volume, and move
the storage layer to Postgres (MIGRATION.md) before handling real student data.
