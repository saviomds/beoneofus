'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { shouldApplySessionSnapshot } from '../authSession.mjs';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [targetChatUser, setTargetChatUser] = useState(null);

  // ── Shared auth session ────────────────────────────────────────────────────
  // ONE source of truth for "who is signed in" across every dashboard section.
  // Previously each content component (FeedContent, the feed page, Stories, …)
  // ran its own `supabase.auth.getSession()` on mount. That single call races
  // with the client hydrating the session from cookies / a token refresh, so a
  // null result would stick — the sidebar showed you logged in while the feed
  // treated you as a guest ("can only see comments"). Here we seed from
  // getSession() AND keep it live via onAuthStateChange, exactly like the
  // sidebar, so every consumer agrees.
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const authEventSeenRef = useRef(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventSeenRef.current = true;
      setSession(nextSession ?? null);
      setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const snapshot = data?.session ?? null;
      if (shouldApplySessionSnapshot(authEventSeenRef.current)) {
        setSession(snapshot);
      }
      setSessionReady(true);
    }).catch(() => { if (active) setSessionReady(true); });

    return () => { active = false; sub.subscription?.unsubscribe(); };
  }, []);

  return (
    <DashboardContext.Provider
      value={{ targetChatUser, setTargetChatUser, session, sessionReady, userId: session?.user?.id ?? null }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
