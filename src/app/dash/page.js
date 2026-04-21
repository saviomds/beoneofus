'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NewPost from '../components/NewPost';
import { useDashboard } from './contect/DashboardContext';
import FeedContent from './contect/FeedContent';
import GroupsContent from './contect/GroupsContent';
import MessagesContent from './contect/MessagesContent';
import BookmarksContent from './contect/BookmarksContent';
import MoreContent from './contect/MoreContent';
import NotificationsContent from './contect/NotificationsContent';
import SettingsContent from './contect/SettingsContent';
import ProfileContent from './contect/ProfileContent';
import DocsContent from './contect/DocsContent';

function DashboardTabHandler() {
  const { setActiveSection } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && setActiveSection) {
      setActiveSection(tab);
      // Clear the tab from URL so we aren't trapped when clicking other sidebar links
      router.replace('/dash', { scroll: false });
    }
  }, [searchParams, setActiveSection, router]);

  return null;
}

export default function Dashboard() {
  const { activeSection } = useDashboard();

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

          {/* 1. New Post Area */}
          <NewPost />
          
          {/* 2. Tabs Navigation */}
          <div className="flex gap-6 border-b border-gray-200 mt-8 mb-6">
            <button className="text-blue-600 border-b-2 border-blue-600 pb-3 text-sm font-bold flex items-center gap-2 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Following
            </button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-gray-900 transition-all border-b-2 border-transparent hover:border-gray-300">Featured</button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-gray-900 transition-all border-b-2 border-transparent hover:border-gray-300">Rising</button>
          </div>
        </div>
      )}

      {/* 3. Dynamic Content Based on Active Section */}
      <div className="w-full h-full">
        {renderContent()}
      </div>
    </div>
  );
}