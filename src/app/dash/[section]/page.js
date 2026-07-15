'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../supabaseClient';
import NewPost from '../../components/NewPost';

const HomeDashContent = dynamic(() => import('../content/HomeDashContent'), { ssr: false, loading: () => <TabSkeleton /> });
const AiAssistantContent = dynamic(() => import('../content/AiAssistantContent'), { ssr: false, loading: () => <TabSkeleton /> });
const FeedContent = dynamic(() => import('../content/FeedContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ConnectionsContent = dynamic(() => import('../content/ConnectionsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const GroupsContent = dynamic(() => import('../content/GroupsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const PagesContent = dynamic(() => import('../content/PagesContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MessagesContent = dynamic(() => import('../content/MessagesContent'), { ssr: false, loading: () => <TabSkeleton /> });
const BookmarksContent = dynamic(() => import('../content/BookmarksContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MoreContent = dynamic(() => import('../content/MoreContent'), { ssr: false, loading: () => <TabSkeleton /> });
const NotificationsContent = dynamic(() => import('../content/NotificationsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const SettingsContent = dynamic(() => import('../content/SettingsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ProfileContent = dynamic(() => import('../content/ProfileContent'), { ssr: false, loading: () => <TabSkeleton /> });
const DocsContent = dynamic(() => import('../content/DocsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const PremiumContent = dynamic(() => import('../content/PremiumContent'), { ssr: false, loading: () => <TabSkeleton /> });
const CoachingContent = dynamic(() => import('../content/CoachingContent'), { ssr: false, loading: () => <TabSkeleton /> });
const EventsContent = dynamic(() => import('../content/EventsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MarketplaceContent = dynamic(() => import('../content/MarketplaceContent'), { ssr: false, loading: () => <TabSkeleton /> });
const PartnershipsContent = dynamic(() => import('../content/PartnershipsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MentorshipContent = dynamic(() => import('../content/MentorshipContent'), { ssr: false, loading: () => <TabSkeleton /> });
const BlogContent = dynamic(() => import('../content/BlogContent'), { ssr: false, loading: () => <TabSkeleton /> });
const LearnContent = dynamic(() => import('../content/LearnContent'), { ssr: false, loading: () => <TabSkeleton /> });
const AnalyticsContent = dynamic(() => import('../content/AnalyticsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ServicesContent = dynamic(() => import('../content/ServicesContent'), { ssr: false, loading: () => <TabSkeleton /> });
const InterviewContent = dynamic(() => import('../content/InterviewContent'), { ssr: false, loading: () => <TabSkeleton /> });
const PathwaysContent = dynamic(() => import('../content/PathwaysContent'), { ssr: false, loading: () => <TabSkeleton /> });
const LeaderboardContent = dynamic(() => import('../content/LeaderboardContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ContractsContent = dynamic(() => import('../content/ContractsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const SearchContent = dynamic(() => import('../content/SearchContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ResumeContent = dynamic(() => import('../content/ResumeContent'), { ssr: false, loading: () => <TabSkeleton /> });
const JobsContent = dynamic(() => import('../content/JobsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MentorsContent = dynamic(() => import('../content/MentorsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const CareerAIContent = dynamic(() => import('../content/CareerAIContent'), { ssr: false, loading: () => <TabSkeleton /> });
const MatchesContent = dynamic(() => import('../content/MatchesContent'), { ssr: false, loading: () => <TabSkeleton /> });
const ProjectMarketplaceContent = dynamic(() => import('../content/ProjectMarketplaceContent'), { ssr: false, loading: () => <TabSkeleton /> });
const FreelanceContent = dynamic(() => import('../content/FreelanceContent'), { ssr: false, loading: () => <TabSkeleton /> });
const CompaniesContent = dynamic(() => import('../content/CompaniesContent'), { ssr: false, loading: () => <TabSkeleton /> });
const SkillsContent = dynamic(() => import('../content/SkillsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const StartupsContent = dynamic(() => import('../content/StartupsContent'), { ssr: false, loading: () => <TabSkeleton /> });
const TechHubContent = dynamic(() => import('../content/TechHubContent'), { ssr: false, loading: () => <TabSkeleton /> });
const AdminContent = dynamic(() => import('../content/AdminContent'), { ssr: false, loading: () => <TabSkeleton /> });

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
  home: HomeDashContent,
  ai: AiAssistantContent,
  feed: FeedContent,
  connections: ConnectionsContent,
  groups: GroupsContent,
  pages: PagesContent,
  messages: MessagesContent,
  bookmarks: BookmarksContent,
  more: MoreContent,
  notifications: NotificationsContent,
  settings: SettingsContent,
  profile: ProfileContent,
  docs: DocsContent,
  premium: PremiumContent,
  coaching: CoachingContent,
  events: EventsContent,
  marketplace: MarketplaceContent,
  partnerships: PartnershipsContent,
  mentorship: MentorshipContent,
  blog: BlogContent,
  learn: LearnContent,
  analytics: AnalyticsContent,
  services: ServicesContent,
  interview: InterviewContent,
  pathways: PathwaysContent,
  leaderboard: LeaderboardContent,
  contracts: ContractsContent,
  search: SearchContent,
  resume: ResumeContent,
  jobs: JobsContent,
  mentors: MentorsContent,
  'career-ai': CareerAIContent,
  matches: MatchesContent,
  projects: ProjectMarketplaceContent,
  freelance: FreelanceContent,
  companies: CompaniesContent,
  skills: SkillsContent,
  startups: StartupsContent,
  'tech-hub': TechHubContent,
  'company-pages': PagesContent,
  discuss: MessagesContent,
  discover: dynamic(() => import('../content/DiscoverContent'), { ssr: false, loading: () => <TabSkeleton /> }),
  apply: JobsContent,
  admin: AdminContent,
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
  }, [section, router]);
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
