# Authentication & Sessions

Server-side, in `server/services/authService.ts` + `server/middleware/auth.ts`.

## Login

1. `POST /api/auth/login { code, password }`.
2. The code prefix (`BOU-STU`, `BOU-ORG`, `BOU-GOV`, …) is a hint only — the
   `users` record is the authority for role, org and permissions.
3. **Account lockout:** if `lockedUntil` is in the future → 403.
4. **Password:** verified with Node's built-in `scrypt`
   (`passwordSalt` + `passwordHash` on the record). Plaintext never exists on the
   server or in the bundle. On failure, `failedLogins++`; at 5, `lockedUntil` =
   now + 10 min. On success it resets to 0.
5. **Status gates:** the user must be `active`; an institution user's
   `Organization` must be `ACTIVE` (a freshly-onboarded PENDING institution
   cannot sign in until an admin approves it).
6. **Government code rotation:** for `role === 'government'` the `code` is
   regenerated (`rotateCodeValue`) on every successful login, audited
   `ACCESS_CODE_ROTATED`. The previous code stops working immediately. The new
   code is returned in the payload and shown on the dashboard / Settings.
7. A `authSessions` row is created and its id set as an **httpOnly** cookie
   (`bou_sid`, `SameSite=Lax`; `Secure` only when `COOKIE_SECURE=true`, i.e.
   behind TLS). 8-hour TTL, slid forward on activity.
8. Audit: `LOGIN`, `LOGIN_FAILED`, `LOGIN_BLOCKED`.

Rate limit: `/api/auth/*` is IP-throttled (40/min; disabled under `NODE_ENV=test`).
The per-account lockout is the real brute-force defence.

## Session resolution

`attachUser` middleware runs on every request: reads `bou_sid`, loads the
session + user, checks expiry and `status === 'active'`, slides the expiry, sets
`req.user` / `req.session`. `GET /api/auth/me` returns
`{ user, permissions, organization, impersonating, expiresAt }` — the client
`AuthContext` calls it on mount and every 60s.

## Password change

`POST /api/auth/change-password { currentPassword, newPassword }` — verifies the
current password, min 6 chars, re-hashes, audits `PASSWORD_CHANGED`. Available to
every role under **Settings → Security**.

## Forgot password

`POST /api/auth/forgot-password { code }` returns a one-time token **shown on
screen** (no email is sent in this demo) and audits the request.

## Admin support view

`POST /api/auth/support-view { targetId }` (needs `support.impersonate`) creates
a session for the target user with `impersonatorId` set; the client shows a
persistent amber banner + Exit. `POST /api/auth/end-support-view` clears it. Both
are audited (`SUPPORT_VIEW_STARTED` / `_ENDED`). No password is exposed.

## Guards

`server/middleware/auth.ts`: `requireAuth`, `requirePermission(perm)`,
`requireRole(...roles)`. Client route guards (`src/components/auth/guards.tsx`)
mirror these for UX only.
