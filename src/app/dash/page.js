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
      default:
        return <FeedContent />;
    }
  };

  return (
    <div className="p-6">
      {/* Only show NewPost for feed section */}
      {activeSection === 'feed' && (
        <>
          {/* 1. New Post Area */}
          <NewPost />
          {/* 2. Tabs Navigation */}
          <div className="flex gap-8 border-b border-white/5 mb-6">
            <button className="text-white border-b-2 border-brand-orange pb-4 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange"></span>
              Following
            </button>
            <button className="text-gray-500 pb-4 hover:text-gray-300 transition">Featured</button>
            <button className="text-gray-500 pb-4 hover:text-gray-300 transition">Rising</button>
          </div>
        </>
      )}

      {/* 3. Dynamic Content Based on Active Section */}
      {renderContent()}
    </div>
  );
}