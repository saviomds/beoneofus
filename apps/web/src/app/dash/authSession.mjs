/* ── Shared dashboard auth-session model ───────────────────────────────────────
   One place that decides "is this visitor authenticated" and "what should the
   dashboard show" — imported by src/app/dash/layout.js and src/app/components/
   Sidebar.js so the two never disagree (the old split logic was the source of
   the "flash logged-in / flash logged-out" and spurious session-expired card).

   States: 'initializing' | 'authenticated' | 'guest' | 'session_expired'

   - initializing    first paint, real getSession() not resolved yet
   - authenticated    a live Supabase session exists
   - guest            no session and none is expected (never signed in, or a
                      stale token from a previous visit that we quietly drop)
   - session_expired  the visitor WAS signed in during this session and the
                      session then ended — worth surfacing a "sign in again" card
*/

/** Optimistic check: a cached token counts as authenticated until getSession says otherwise. */
export function isAuthenticated(session, hasCachedToken) {
  return Boolean(session || hasCachedToken);
}

/**
 * Reducer for the layout's auth state.
 * @param {'initializing'|'authenticated'|'guest'|'session_expired'} prev
 * @param {string} event  a Supabase auth event, or the synthetic 'GET_SESSION'
 *                         emitted after the initial getSession() resolves.
 * @param {object|null} session
 */
export function nextAuthState(prev, event, session) {
  // A live session always wins, whatever the previous state was.
  if (session) return 'authenticated';

  // No session from here on.
  switch (prev) {
    case 'authenticated': {
      // We rendered as authenticated and now there is no session.
      // GET_SESSION / INITIAL_SESSION = the optimistic cached token was stale
      // from a previous visit; the user did not get logged out mid-use, so
      // drop to guest quietly rather than alarming them.
      if (event === 'GET_SESSION' || event === 'INITIAL_SESSION') return 'guest';
      // SIGNED_OUT, a null TOKEN_REFRESHED (silent refresh failed), USER_UPDATED
      // with no session, etc. — the session genuinely ended mid-use.
      return 'session_expired';
    }
    case 'session_expired':
      return 'session_expired';
    default:
      // initializing / guest → guest
      return 'guest';
  }
}
