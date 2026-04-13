'use client';

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
      default:
        return <FeedContent />;
    }
  };

  return (
    <div className="w-full h-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* Only show NewPost for feed section */}
      {activeSection === 'feed' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-3xl font-black text-white tracking-tighter">Network Feed</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Broadcast your updates to the ecosystem.</p>
          </div>

          {/* 1. New Post Area */}
          <NewPost />
          
          {/* 2. Tabs Navigation */}
          <div className="flex gap-6 border-b border-white/5 mt-8 mb-6">
            <button className="text-white border-b-2 border-blue-500 pb-3 text-sm font-bold flex items-center gap-2 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></span>
              Following
            </button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-white transition-all border-b-2 border-transparent hover:border-white/10">Featured</button>
            <button className="text-gray-500 pb-3 text-sm font-bold hover:text-white transition-all border-b-2 border-transparent hover:border-white/10">Rising</button>
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