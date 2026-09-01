# Institution Onboarding

**There is no public school registration.** Institution access is invitation-only
(spec §4–6). `server/services/invitationService.ts`.

```
ADMIN or GOVERNMENT
      │  POST /api/invitations
      ▼
Invitation  INV-2026-00001
  tokenHash = sha256(token)      ← the raw token is returned ONCE, never stored
  organizationName, organizationType, institutionLevels
  recipientName, recipientEmail
  expiresAt (14 days), status: PENDING, single-use
      │  link: /register/institution?token=<opaque token>
      ▼
Authorized representative opens the link (public page)
  GET /api/invite/:token  → PublicInvitation (name, type, expiry, status only)
      │  POST /api/invite/:token/accept { password, representative details… }
      ▼
Creates:  Organization (status: PENDING)  +  institution-admin User (role 'school')
Marks the invitation ACCEPTED (cannot be reused)
Notifies the issuer; audits INVITATION_ACCEPTED
      │
      ▼
ADMIN approves:  POST /api/organizations/:id/status { status: 'ACTIVE' }
      │  (GOVERNMENT can approve institutions in its jurisdiction)
      ▼
Organization ACTIVE  →  the institution admin can now sign in
```

## Guarantees (spec §5)

- The token is **opaque and unpredictable** (`nanoid(24)`), never in logs or the
  DB (only its sha256).
- **Single-use** — status flips to `ACCEPTED` on acceptance; re-use → 422.
- **Expiring** — past `expiresAt` → auto-marked `EXPIRED` → 422.
- **Revocable** — `POST /api/invitations/:id/revoke` → `REVOKED` → 422.
- **Tied to one organization** — name/type/levels are fixed at issue time.
- The new admin **cannot sign in while the org is PENDING** (auth checks org status).

## UI

- **Admin → Invitations** and **Government → Authorize Institutions** (same
  `InvitationManager` component): issue, copy link, revoke, see status.
- **Admin → Institutions**: approve / suspend / reactivate / archive.
- `/register/institution?token=…`: the public acceptance form.

## Demo

Seed ships a PENDING invitation with token **`demo-pending-invite-token-0001`**
(for *Nyamata College of Science*) and one already-`ACCEPTED` invitation
(→ Green Hills Academy). See DEMO-ACCOUNTS.md for the full click-through.
