"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const OnlineUsersCtx = createContext(new Set());

export function OnlineUsersProvider({ children }) {
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    // supabase is null when the public env vars are missing (see supabaseClient.js).
    if (!supabase) return;
    let ch;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || cancelled) return;
      ch = supabase.channel("online-users", {
        config: { presence: { key: session.user.id } },
      });
      ch.on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(ch.presenceState())));
      }).subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() });
      });
    });
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch); };
  }, []);

  return <OnlineUsersCtx.Provider value={onlineIds}>{children}</OnlineUsersCtx.Provider>;
}

export const useOnlineUsers = () => useContext(OnlineUsersCtx);
