'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import NewPost from '../components/NewPost';
import { useDashboard } from './contect/DashboardContext';
import dynamic from 'next/dynamic';

// Generic loading skeleton to display while tab components are being dynamically fetched
const TabSkeleton = () => (
  <div className="w-full h-full animate-pulse space-y-6">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 rounded-lg w-40"></div>
        <div className="h-3 bg-gray-200 rounded-lg w-24"></div>
      </div>
    </div>
    <div className="w-full h-40 bg-gray-100 rounded-[2rem] border border-gray-200"></div>
    <div className="w-full h-40 bg-gray-100 rounded-[2rem] border border-gray-200"></div>
    <div className="w-full h-40 bg-gray-100 rounded-[2rem] border border-gray-200"></div>
  </div>
);

const FeedContent = dynamic(() => import('./contect/FeedContent'), { loading: () => <TabSkeleton /> });
const GroupsContent = dynamic(() => import('./contect/GroupsContent'), { loading: () => <TabSkeleton /> });
const MessagesContent = dynamic(() => import('./contect/MessagesContent'), { loading: () => <TabSkeleton /> });
const BookmarksContent = dynamic(() => import('./contect/BookmarksContent'), { loading: () => <TabSkeleton /> });
const MoreContent = dynamic(() => import('./contect/MoreContent'), { loading: () => <TabSkeleton /> });
const NotificationsContent = dynamic(() => import('./contect/NotificationsContent'), { loading: () => <TabSkeleton /> });
const SettingsContent = dynamic(() => import('./contect/SettingsContent'), { loading: () => <TabSkeleton /> });
const ProfileContent = dynamic(() => import('./contect/ProfileContent'), { loading: () => <TabSkeleton /> });
const DocsContent = dynamic(() => import('./contect/DocsContent'), { loading: () => <TabSkeleton /> });

function DashboardTabHandler() {
  const { setActiveSection } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const section = searchParams.get('section') || searchParams.get('tab');
    if (section && setActiveSection) {
      setActiveSection(section);
      // Clear the param from URL so we aren't trapped when clicking other sidebar links
      router.replace('/dash', { scroll: false });
    }
  }, [searchParams, setActiveSection, router]);

  return null;
}

export default function Dashboard() {
  const { activeSection } = useDashboard();
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription?.unsubscribe();
  }, []);

  // Preload heavy tabs in the background when the browser is idle
  useEffect(() => {
    const preloadTabs = () => {
      // Manually calling import() fetches and caches the JS chunks
      import('./contect/GroupsContent');
      import('./contect/MessagesContent');
      import('./contect/MoreContent');
      import('./contect/NotificationsContent');
      import('./contect/ProfileContent');
      import('./contect/SettingsContent');
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadTabs);
      } else {
        setTimeout(preloadTabs, 2000);
      }
    }
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'feed':
        return <FeedContent />;
      case 'groups':
        return <GroupsContent />;
      case 'messages':
        return <MessagesContent />;
      case 'bookmarks':
        return <BookmarksContent />;
      case 'more':
        return <MoreContent />;
      case 'notifications':
        return <NotificationsContent />;
      case 'settings':
        return <SettingsContent />;
      case 'profile':
        return <ProfileContent />;
      case 'docs':
        return <DocsContent />;
      default:
        return <FeedContent />;
    }
  };

  return (
    <div className={`w-full h-full overflow-x-hidden transition-all ${activeSection === 'docs' ? 'p-2 md:p-4 lg:p-6' : 'p-4 md:p-6 lg:p-8'}`}>
      {/* Suspense boundary fixes Next.js useSearchParams de-opt warning */}
      <Suspense fallback={null}>
        <DashboardTabHandler />
      </Suspense>

      {/* Only show NewPost for feed section */}
      {activeSection === 'feed' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Network Feed</h1>
            <p className="text-gray-600 text-sm mt-1 font-medium">Broadcast your updates to the ecosystem.</p>
          </div>

          {/* 1. New Post Area or Login Prompt */}
          {session ? (
            <NewPost />
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm mt-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Join the conversation</h3>
              <p className="text-gray-600 mb-4 text-sm font-medium">Sign in to share your code, broadcast updates, and connect with the community.</p>
              <button onClick={() => router.push('/auth')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-sm">
                Sign In to Post
              </button>
            </div>
          )}
  
        
        </div>
      )}

      {/* 3. Dynamic Content Based on Active Section */}
      <div key={activeSection} className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
        {renderContent()}
      </div>
    </div>
  );
}