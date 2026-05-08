'use client';

import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import NewPost from '../../components/NewPost';
import { useRouter } from 'next/navigation';

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

const contentMap = {
  feed:          dynamic(() => import('../contect/FeedContent'),          { loading: () => <TabSkeleton /> }),
  connections:   dynamic(() => import('../contect/ConnectionsContent'),   { loading: () => <TabSkeleton /> }),
  groups:        dynamic(() => import('../contect/GroupsContent'),        { loading: () => <TabSkeleton /> }),
  pages:         dynamic(() => import('../contect/PagesContent'),         { loading: () => <TabSkeleton /> }),
  messages:      dynamic(() => import('../contect/MessagesContent'),      { loading: () => <TabSkeleton /> }),
  bookmarks:     dynamic(() => import('../contect/BookmarksContent'),     { loading: () => <TabSkeleton /> }),
  more:          dynamic(() => import('../contect/MoreContent'),          { loading: () => <TabSkeleton /> }),
  notifications: dynamic(() => import('../contect/NotificationsContent'), { loading: () => <TabSkeleton /> }),
  settings:      dynamic(() => import('../contect/SettingsContent'),      { loading: () => <TabSkeleton /> }),
  profile:       dynamic(() => import('../contect/ProfileContent'),       { loading: () => <TabSkeleton /> }),
  docs:          dynamic(() => import('../contect/DocsContent'),          { loading: () => <TabSkeleton /> }),
};

export default function DashSection() {
  const { section } = useParams();
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => authListener.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    const preload = () => {
      import('../contect/ConnectionsContent');
      import('../contect/GroupsContent');
      import('../contect/MessagesContent');
      import('../contect/NotificationsContent');
      import('../contect/ProfileContent');
      import('../contect/SettingsContent');
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) requestIdleCallback(preload);
      else setTimeout(preload, 2000);
    }
  }, []);

  const Content = contentMap[section];
  if (!Content) notFound();

  return (
    <div className={`w-full h-full overflow-x-hidden transition-all ${section === 'docs' ? 'p-2 md:p-4 lg:p-6' : 'p-4 md:p-6 lg:p-8'}`}>
      {section === 'feed' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tighter">Network Feed</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 font-medium">Broadcast your updates to the ecosystem.</p>
          </div>

          {session ? (
            <NewPost />
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center shadow-sm mt-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Join the conversation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm font-medium">Sign in to share your code, broadcast updates, and connect with the community.</p>
              <button onClick={() => router.push('/auth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-sm">
                Sign In to Post
              </button>
            </div>
          )}
        </div>
      )}

      <div key={section} className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
        <Content />
      </div>
    </div>
  );
}
