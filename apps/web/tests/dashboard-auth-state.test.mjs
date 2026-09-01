import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthenticated, nextAuthState } from '../src/app/dash/authSession.mjs';

test('isAuthenticated: a cached token counts until getSession says otherwise', () => {
  assert.equal(isAuthenticated(null, true), true);
  assert.equal(isAuthenticated(undefined, true), true);
  assert.equal(isAuthenticated({ user: { id: 'x' } }, false), true);
  assert.equal(isAuthenticated(null, false), false);
});

test('nextAuthState: a live session always resolves to authenticated', () => {
  const s = { user: { id: 'x' } };
  for (const prev of ['initializing', 'authenticated', 'guest', 'session_expired']) {
    for (const ev of ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'GET_SESSION']) {
      assert.equal(nextAuthState(prev, ev, s), 'authenticated', `${prev}/${ev}`);
    }
  }
});

test('nextAuthState: first check with no session → guest, never session_expired', () => {
  assert.equal(nextAuthState('initializing', 'GET_SESSION', null), 'guest');
  assert.equal(nextAuthState('initializing', 'INITIAL_SESSION', null), 'guest');
});

test('nextAuthState: a stale optimistic token is dropped quietly to guest', () => {
  // layout rendered `authenticated` from hasCachedSession(); the real check /
  // INITIAL_SESSION comes back empty → guest, not an alarming card.
  assert.equal(nextAuthState('authenticated', 'GET_SESSION', null), 'guest');
  assert.equal(nextAuthState('authenticated', 'INITIAL_SESSION', null), 'guest');
});

test('nextAuthState: losing a session mid-use surfaces session_expired', () => {
  assert.equal(nextAuthState('authenticated', 'SIGNED_OUT', null), 'session_expired');
  assert.equal(nextAuthState('authenticated', 'TOKEN_REFRESHED', null), 'session_expired');
  assert.equal(nextAuthState('authenticated', 'USER_UPDATED', null), 'session_expired');
});

test('nextAuthState: guest / expired states stay put without a session', () => {
  assert.equal(nextAuthState('guest', 'SIGNED_OUT', null), 'guest');
  assert.equal(nextAuthState('session_expired', 'TOKEN_REFRESHED', null), 'session_expired');
});
