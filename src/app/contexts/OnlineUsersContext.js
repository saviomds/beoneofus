"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const OnlineUsersCtx = createContext(new Set());

export function OnlineUsersProvider({ children }) {
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    let ch;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      ch = supabase.channel("online-users", {
        config: { presence: { key: session.user.id } },
      });
      ch.on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(ch.presenceState())));
      }).subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ online_at: new Date().toISOString() });
      });
    });
    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  return <OnlineUsersCtx.Provider value={onlineIds}>{children}</OnlineUsersCtx.Provider>;
}

export const useOnlineUsers = () => useContext(OnlineUsersCtx);
