'use client';

import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect, useState, Suspense } from 'react';
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

const contentMap = {
  home:          dynamic(() => import('../content/HomeDashContent'),      { loading: () => <TabSkeleton /> }),
  ai:            dynamic(() => import('../content/AiAssistantContent'),   { loading: () => <TabSkeleton /> }),
  feed:          dynamic(() => import('../content/FeedContent'),          { loading: () => <TabSkeleton /> }),
  connections:   dynamic(() => import('../content/ConnectionsContent'),   { loading: () => <TabSkeleton /> }),
  groups:        dynamic(() => import('../content/GroupsContent'),        { loading: () => <TabSkeleton /> }),
  pages:         dynamic(() => import('../content/PagesContent'),         { loading: () => <TabSkeleton /> }),
  messages:      dynamic(() => import('../content/MessagesContent'),      { loading: () => <TabSkeleton /> }),
  bookmarks:     dynamic(() => import('../content/BookmarksContent'),     { loading: () => <TabSkeleton /> }),
  more:          dynamic(() => import('../content/MoreContent'),          { loading: () => <TabSkeleton /> }),
  notifications: dynamic(() => import('../content/NotificationsContent'), { loading: () => <TabSkeleton /> }),
  settings:      dynamic(() => import('../content/SettingsContent'),      { loading: () => <TabSkeleton /> }),
  profile:       dynamic(() => import('../content/ProfileContent'),       { loading: () => <TabSkeleton /> }),
  docs:          dynamic(() => import('../content/DocsContent'),          { loading: () => <TabSkeleton /> }),
  premium:       dynamic(() => import('../content/PremiumContent'),       { loading: () => <TabSkeleton /> }),
  coaching:      dynamic(() => import('../content/CoachingContent'),      { loading: () => <TabSkeleton /> }),
  events:        dynamic(() => import('../content/EventsContent'),        { loading: () => <TabSkeleton /> }),
  marketplace:   dynamic(() => import('../content/MarketplaceContent'),   { loading: () => <TabSkeleton /> }),
  partnerships:  dynamic(() => import('../content/PartnershipsContent'),  { loading: () => <TabSkeleton /> }),
  mentorship:    dynamic(() => import('../content/MentorshipContent'),    { loading: () => <TabSkeleton /> }),
  blog:          dynamic(() => import('../content/BlogContent'),          { loading: () => <TabSkeleton /> }),
  learn:         dynamic(() => import('../content/LearnContent'),         { loading: () => <TabSkeleton /> }),
  analytics:     dynamic(() => import('../content/AnalyticsContent'),     { loading: () => <TabSkeleton /> }),
  services:      dynamic(() => import('../content/ServicesContent'),      { loading: () => <TabSkeleton /> }),
  interview:     dynamic(() => import('../content/InterviewContent'),     { loading: () => <TabSkeleton /> }),
  pathways:      dynamic(() => import('../content/PathwaysContent'),      { loading: () => <TabSkeleton /> }),
  leaderboard:   dynamic(() => import('../content/LeaderboardContent'),   { loading: () => <TabSkeleton /> }),
  contracts:     dynamic(() => import('../content/ContractsContent'),      { loading: () => <TabSkeleton /> }),
  search:        dynamic(() => import('../content/SearchContent'),         { loading: () => <TabSkeleton /> }),
  resume:        dynamic(() => import('../content/ResumeContent'),         { loading: () => <TabSkeleton /> }),
  jobs:          dynamic(() => import('../content/JobsContent'),           { loading: () => <TabSkeleton /> }),
  mentors:       dynamic(() => import('../content/MentorsContent'),         { loading: () => <TabSkeleton /> }),
  'career-ai':   dynamic(() => import('../content/CareerAIContent'),       { loading: () => <TabSkeleton /> }),
  matches:       dynamic(() => import('../content/MatchesContent'),        { loading: () => <TabSkeleton /> }),
  projects:      dynamic(() => import('../content/ProjectMarketplaceContent'), { loading: () => <TabSkeleton /> }),
  freelance:     dynamic(() => import('../content/FreelanceContent'),      { loading: () => <TabSkeleton /> }),
  companies:     dynamic(() => import('../content/CompaniesContent'),      { loading: () => <TabSkeleton /> }),
  skills:        dynamic(() => import('../content/SkillsContent'),         { loading: () => <TabSkeleton /> }),
  startups:      dynamic(() => import('../content/StartupsContent'),       { loading: () => <TabSkeleton /> }),
  'tech-hub':    dynamic(() => import('../content/TechHubContent'),        { loading: () => <TabSkeleton /> }),
  'company-pages': dynamic(() => import('../content/PagesContent'),       { loading: () => <TabSkeleton /> }),
  discuss:       dynamic(() => import('../content/MessagesContent'),       { loading: () => <TabSkeleton /> }),
  discover:      dynamic(() => import('../content/DiscoverContent'),       { loading: () => <TabSkeleton /> }),
  apply:         dynamic(() => import('../content/JobsContent'),           { loading: () => <TabSkeleton /> }),
  admin:         dynamic(() => import('../content/AdminContent'),          { loading: () => <TabSkeleton /> }),
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
      import('../content/ConnectionsContent');
      import('../content/GroupsContent');
      import('../content/MessagesContent');
      import('../content/NotificationsContent');
      import('../content/ProfileContent');
      import('../content/SettingsContent');
    };
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) requestIdleCallback(preload);
      else setTimeout(preload, 2000);
    }
  }, []);

  const Content = contentMap[section];
  // Redirect unknown sections to home instead of calling notFound()
  // in a client component (can cause hydration issues)
  useEffect(() => {
    if (section && !contentMap[section]) router.replace('/dash/home');
  }, [section]);
  if (!Content) return <TabSkeleton />;

  /* messages takes full height without page-level padding */
  const isFullHeight = section === 'messages' || section === 'ai';
  const outerCls = isFullHeight
    ? 'w-full h-full overflow-hidden'
    : `w-full h-full overflow-x-hidden ${section === 'docs' ? 'p-3 md:p-5' : section === 'home' ? 'p-3 sm:p-4 md:p-5 lg:p-6' : 'p-3 sm:p-4 md:p-5 lg:p-6'}`;

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

      <div key={section} className="w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
        <Suspense fallback={<TabSkeleton />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}
