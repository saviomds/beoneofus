"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "../../supabaseClient";
import {
  Shield, ShieldCheck, BadgeCheck, UserCircle,
  Crown, Lock, Loader2,
} from "lucide-react";
import OrgVerificationPanel from "./more/OrgVerificationPanel";

// Heavy workspaces — only the active one is fetched/parsed.
const PanelSkeleton = () => (
  <div className="animate-pulse space-y-4 py-2">
    <div className="h-11 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
  </div>
);

// Personal dashboard — shared component (also the source for the old More tool).
const UserDashboardTool = dynamic(() => import("./more/UserDashboardTool"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
// Standalone founder-dashboard page, embedded as a workspace. It renders its own
// layout and allows admins through without redirecting.
const FounderDashboard = dynamic(() => import("../../founder-dashboard/page"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});

// The "Admin Panel" workspace was merged into /founder-dashboard's "Admin
// Console" tab (see founder-dashboard/page.tsx) so it isn't duplicated here.
const WORKSPACES = [
  { id: "verify",  label: "Verification", short: "Verify",  Icon: BadgeCheck, desc: "Organization trust & verification review" },
  { id: "founder", label: "Founder",      short: "Founder", Icon: Crown,      desc: "Team, founder applications & operations" },
  { id: "me",      label: "My Dashboard", short: "Me",      Icon: UserCircle, desc: "Your tasks, applications & notifications" },
];

function AdminConsoleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(null); // null = checking
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerifs, setPendingVerifs] = useState(0);

  const wsParam = searchParams?.get("ws");
  const ws = WORKSPACES.some((w) => w.id === wsParam) ? wsParam : WORKSPACES[0].id;

  const setWorkspace = useCallback((id) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("ws", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Admin gate (UI only — every admin API is independently server-gated).
  // With cookie-based @supabase/ssr, getSession() can briefly return null during
  // hydration. Decide "denied" only from onAuthStateChange (which reliably emits
  // INITIAL_SESSION once hydrated), and use getSession purely as a fast positive
  // path — so a signed-in admin never gets locked to a stale "Access Denied".
  useEffect(() => {
    let cancelled = false;

    const decide = async (session) => {
      if (cancelled) return;
      if (!session?.user) { setUserId(null); setIsAdmin(false); setLoading(false); return; }
      setUserId(session.user.id);
      const { data: prof } = await supabase
        .from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
      if (cancelled) return;
      setIsAdmin(!!prof?.is_admin);
      setLoading(false);
    };

    // Fast path: an already-stored session decides immediately (positive only).
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) decide(session); });

    // Source of truth: INITIAL_SESSION on hydration, plus SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => decide(session));

    return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); };
  }, []);

  // Pending-verification badge (cheap head count; refreshes when returning to console).
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (!cancelled) setPendingVerifs(count || 0);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, ws]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <Lock size={28} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          You don&apos;t have admin privileges. Contact the platform owner for access.
        </p>
      </div>
    );
  }

  const active = WORKSPACES.find((w) => w.id === ws) || WORKSPACES[0];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shrink-0">
            <Shield size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">Admin Console</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{active.desc}</p>
          </div>
        </div>
        <span className="hidden sm:flex text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full items-center gap-1.5 shrink-0">
          <ShieldCheck size={11} /> Admin Access
        </span>
      </div>

      {/* Workspace switcher — sticky, scrolls on mobile */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 mb-5 bg-gray-50/80 dark:bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60">
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-2xl overflow-x-auto shadow-sm">
          {WORKSPACES.map((w) => {
            const activeWs = w.id === ws;
            const badge = w.id === "verify" ? pendingVerifs : 0;
            return (
              <button
                key={w.id}
                onClick={() => setWorkspace(w.id)}
                aria-current={activeWs ? "page" : undefined}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-1 justify-center min-w-fit ${
                  activeWs
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <w.Icon size={15} />
                <span className="hidden sm:inline">{w.label}</span>
                <span className="sm:hidden">{w.short}</span>
                {badge > 0 && (
                  <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active workspace */}
      <div key={ws} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
        {ws === "verify" && (
          <OrgVerificationPanel onCount={setPendingVerifs} />
        )}
        {ws === "founder" && (
          // Full-bleed: the founder dashboard brings its own padding & background,
          // so cancel the dash gutters to avoid double margins / cramped width.
          <div className="-mx-3 sm:-mx-4 md:-mx-5 lg:-mx-6 overflow-x-hidden">
            <FounderDashboard />
          </div>
        )}
        {ws === "me" && <UserDashboardTool currentUserId={userId} />}
      </div>
    </div>
  );
}

// useSearchParams requires a Suspense boundary in Next.
export default function AdminContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-red-500" /></div>}>
      <AdminConsoleInner />
    </Suspense>
  );
}
