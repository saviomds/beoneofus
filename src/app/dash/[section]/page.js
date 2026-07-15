'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
    if (section && section !== 'home' && section !== 'messages' && section !== 'feed') {
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

          {session ? (
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
        <TabSkeleton />
      </div>
    </div>
  );
}
