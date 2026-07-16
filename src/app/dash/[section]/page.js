'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../supabaseClient';
import NewPost from '../../components/NewPost';

const TabSkeleton = () => (
  <div className="w-full h-full animate-pulse space-y-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-40"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-24"></div>
      </div>
    </div>
    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-700"></div>
    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-700"></div>
    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-700"></div>
  </div>
);

// ── Section content registry ────────────────────────────────────────────────
// Each entry is code-split (only loaded when that tab is active) and rendered
// client-only (ssr:false) since these components talk to Supabase/browser
// APIs directly. `loading` shows the skeleton ONLY while the chunk is
// downloading — unlike before, it is replaced by real content once loaded,
// not shown forever.
//
// CONFIRMED: MessagesContent resolves to src/app/dash/content/MessagesContent.js
// based on its own relative imports (../../supabaseClient, ../../../lib/i18n,
// ./ProfileContent, ./DashboardContext, ../../contexts/OnlineUsersContext) —
// all consistent with that file living at src/app/dash/content/MessagesContent.js.
const MessagesContent = dynamic(() => import('../content/MessagesContent'), {
  ssr: false,
  loading: () => <TabSkeleton />,
});

// TODO: add the real component + confirmed path for each of these, then
// uncomment. Guessing filenames here risks a build-breaking import, so they're
// left explicit rather than invented. Once you give me the paths I'll wire
// these directly instead of leaving TODOs.
// const HomeContent = dynamic(() => import('../content/HomeContent'), { ssr: false, loading: () => <TabSkeleton /> });
// const NotificationsContent = dynamic(() => import('../content/NotificationsContent'), { ssr: false, loading: () => <TabSkeleton /> });
// const ConnectionsContent = dynamic(() => import('../content/ConnectionsContent'), { ssr: false, loading: () => <TabSkeleton /> });
// const ProfileContent = dynamic(() => import('../content/ProfileContent'), { ssr: false, loading: () => <TabSkeleton /> });

// Sections this route knows how to render. Widened to match what
// BottomNav / Sidebar actually link to (home, messages, notifications,
// connections, profile) instead of the old list, which silently bounced
// notifications/connections/profile back to /dash/home on every visit.
const KNOWN_SECTIONS = ['home', 'messages', 'feed', 'notifications', 'connections', 'profile'];

// How long we'll wait on the initial getSession() check before giving up and
// treating the user as signed-out, rather than leaving `sessionChecked` false
// (and any UI gated on it stuck) forever if the call stalls.
const SESSION_CHECK_TIMEOUT_MS = 6000;

export default function DashSection() {
  const { section } = useParams();
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setSession(null);
        setSessionChecked(true);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setSession(session);
        setSessionChecked(true);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setSession(null);
        setSessionChecked(true);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionChecked(true);
    });

    return () => {
      clearTimeout(timer);
      authListener.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (section && !KNOWN_SECTIONS.includes(section)) {
      router.replace('/dash/home');
    }
  }, [section, router]);

  const isFullHeight = section === 'messages' || section === 'ai';
  const outerCls = isFullHeight
    ? 'w-full h-full overflow-hidden'
    : 'w-full h-full overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6';

  return (
    <div className={outerCls}>
      {section === 'feed' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-400 mb-4">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Network Feed</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 font-medium">Broadcast your updates to the ecosystem.</p>
          </div>

          {!sessionChecked ? (
            <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-[2rem] border border-gray-200 dark:border-gray-700 animate-pulse" />
          ) : session ? (
            <NewPost />
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-center shadow-sm mb-4">
              <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Join the conversation</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">Sign in to share code, broadcast updates, and connect.</p>
              <button onClick={() => router.push('/auth')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-xl transition-all text-sm shadow-sm active:scale-95">
                Sign In to Post
              </button>
            </div>
          )}
        </div>
      )}

      <div className="w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
        {section === 'messages' && <MessagesContent />}

        {/* Wire these in once the real components/paths are confirmed — see
            the commented dynamic imports above. Until then they intentionally
            fall through to the skeleton below rather than crashing on a
            missing import. */}
        {/* {section === 'home' && <HomeContent />} */}
        {/* {section === 'notifications' && <NotificationsContent />} */}
        {/* {section === 'connections' && <ConnectionsContent />} */}
        {/* {section === 'profile' && <ProfileContent />} */}

        {!['messages'].includes(section) && <TabSkeleton />}
      </div>
    </div>
  );
}