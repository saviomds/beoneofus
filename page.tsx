"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Code2, ArrowRight, LayoutDashboard, MessageSquare, Loader2, Eye, Star, Briefcase, Bot, FileText, X, Bell } from 'lucide-react';
import Link from 'next/link';
import { supabase } from './src/app/supabaseClient';

export default function MemberDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(true);
  const [resumeText, setResumeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let channel: any;
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/'); // Redirect unauthenticated users to the home/login page
      } else {
        setIsAuthenticated(true);
        
        // 1. Fetch user profile and 5 recent jobs
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const { data: jobs } = await supabase.from('jobs').select('*').limit(5);

        // Fetch user's submitted applications
        const { data: apps } = await supabase
          .from('job_applications')
          .select('*, jobs(*)')
          .eq('user_id', session.user.id)
          .neq('status', 'rejected')
          .order('created_at', { ascending: false });
        if (apps) setMyApplications(apps as any[]);

        // Fetch user's notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (notifs) setNotifications(notifs as any[]);

        // Set up real-time subscription for new notifications
        channel = supabase.channel('realtime-notifications')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
            (payload) => {
              setNotifications((prev) => [payload.new, ...prev]);
              setToastMessage('🔔 New notification received!');
              setTimeout(() => setToastMessage(''), 4000);
            }
          )
          .subscribe();

        if (profile && jobs && (jobs as any[]).length > 0) {
          try {
            // 2. Send to Job Matching API
            const res = await fetch('/api/match-jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userProfile: profile, jobList: jobs })
            });
            const data: any = await res.json();
            
            // 3. Merge the scores with the jobs and sort
            if (data.matches && Array.isArray(data.matches)) {
              const merged = (jobs as any[]).map(job => {
                const match = (data.matches as any[]).find((m: any) => m.job_id === job.id);
                return {
                  ...job,
                  match_score: match ? match.match_score : 0,
                  match_reason: match ? match.reason : ''
                };
              }).sort((a, b) => b.match_score - a.match_score).slice(0, 3); // Top 3 matches
              
              setMatchedJobs(merged);
            }
          } catch (error) {
            console.error("Job matching error:", error);
          }
        }
        setIsMatching(false);
      }
    };
    checkAuth();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const analyzeCV = async () => {
    if (!resumeText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText })
      });
      const data: any = await res.json();
      setCvAnalysis(data);

      // Automatically save extracted skills to the user's profile
      if (data.skills && Array.isArray(data.skills) && (data.skills as any[]).length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ skills: data.skills }) // Updates the skills column
            .eq('id', session.user.id);
            
          if (updateError) {
            console.error("Failed to save skills to profile:", updateError);
          } else {
            setToastMessage('Skills successfully saved to your profile!');
            setTimeout(() => setToastMessage(''), 3000);
          }
        }
      }
    } catch (error) {
      console.error("CV analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // Mark as read in DB and locally
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }

    // If accepted, fetch the full application and open the details modal
    if (notif.type === 'application_accepted' && notif.application_id) {
      const { data: app } = await supabase
        .from('job_applications')
        .select('*, jobs(*)')
        .eq('id', notif.application_id)
        .single();
      if (app) setSelectedApp(app);
    }
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-6 sm:p-10 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Talent Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Join a network where skills meet opportunity. Here are your latest matches.</p>
          </div>
          <Link href="/jobs" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 shrink-0">
            Browse Jobs <ArrowRight size={18} />
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Active Applications</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{myApplications.filter(a => a.status === 'pending').length} Pending</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Profile Views</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">12 This Week</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Star size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Reputation Score</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">98 / 100</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* My Applications Section */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={20} className="text-purple-500"/> My Applications</h2>
              </div>
              <div className="space-y-4">
                {myApplications.length > 0 ? myApplications.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500 transition-colors">
                    <div className="min-w-0 pr-4">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{app.jobs?.title || 'Unknown Role'}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{app.jobs?.company || 'Unknown Company'} • <span className={`font-bold ${app.status === 'accepted' ? 'text-green-500' : app.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>{app.status.toUpperCase()}</span></p>
                    </div>
                    {app.status === 'accepted' ? (
                      <button onClick={() => setSelectedApp(app)} className="shrink-0 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 rounded-lg text-sm font-bold transition-colors">View Details</button>
                    ) : app.status === 'pending' ? (
                      <span className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 rounded-lg text-sm font-bold">Under Review</span>
                    ) : (
                      <span className="shrink-0 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-sm font-bold">Closed</span>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl">No applications submitted yet.</p>
                )}
              </div>
            </div>

            {/* Recommended Opportunities */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Briefcase size={20} className="text-blue-500"/> Recommended Opportunities</h2>
              <button className="text-sm font-bold text-blue-600 hover:underline">View All Matches</button>
            </div>
            <div className="space-y-4">
                {isMatching ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse">
                        <div className="space-y-3 w-2/3">
                          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2"></div>
                          <div className="h-4 bg-gray-100 dark:bg-gray-800/80 rounded-md w-3/4"></div>
                          <div className="h-3 bg-gray-50 dark:bg-gray-800/50 rounded-md w-full mt-2"></div>
                        </div>
                        <div className="h-9 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                      </div>
                    ))}
                  </>
                ) : matchedJobs.length > 0 ? (
                  matchedJobs.map((job, idx) => (
                    <div key={job.id || idx} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{job.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{job.company} • {job.location || 'Remote'} • <span className="text-green-500 font-bold">{job.match_score}% Match</span></p>
                        {job.match_reason && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{job.match_reason}</p>}
                      </div>
                      <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-bold transition-colors">Apply</button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No jobs available to match against.</p>
                )}
            </div>
          </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px] flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Bot size={20} className="text-purple-500"/> AI CV Analysis</h2>
            
            {!cvAnalysis ? (
              <div className="flex-1 flex flex-col">
                <textarea 
                  className="w-full flex-1 min-h-[200px] p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                  placeholder="Paste your resume/CV text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <button 
                  onClick={analyzeCV}
                  disabled={isAnalyzing || !resumeText.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex justify-center items-center gap-2"
                >
                  {isAnalyzing ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><FileText size={18}/> Analyze CV</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">EXPERIENCE</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{cvAnalysis.experience_years} Years</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">TOP SKILLS</p>
                  <div className="flex flex-wrap gap-2">
                    {cvAnalysis.skills?.map((skill: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-white dark:bg-gray-800 text-xs font-semibold rounded-md border border-gray-200 dark:border-gray-700 dark:text-gray-200">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2">SUGGESTIONS</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-2">
                    {cvAnalysis.suggestions?.map((sug: string, i: number) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => setCvAnalysis(null)} className="mt-4 text-sm font-bold text-purple-600 hover:underline w-full text-center">Analyze Another CV</button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50">
          <CheckCircle2 size={20} className="text-green-100" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Acceptance Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedApp(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
              <X size={18} />
            </button>
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Offer Accepted!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Congratulations! Here are the details for the <strong className="text-gray-900 dark:text-white">{selectedApp.jobs?.title}</strong> role at {selectedApp.jobs?.company}.</p>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 mb-6 space-y-4 border border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-1">Message from Employer</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{selectedApp.acceptance_message || "We are thrilled to offer you the position! Please check your email for the official offer letter and onboarding steps."}</p>
              </div>
              {selectedApp.acceptance_config && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">Next Steps / Config</p>
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">{JSON.stringify(selectedApp.acceptance_config, null, 2)}</pre>
                </div>
              )}
            </div>
            
            <button onClick={() => setSelectedApp(null)} className="w-full py-3.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-white transition-colors shadow-lg active:scale-95">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}