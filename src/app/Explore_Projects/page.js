"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, ArrowLeft, Search, Star, GitBranch, Code2, ChevronRight, X, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import FloatingAiAssistant from "../components/FloatingAiAssistant";

export default function ExploreProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        // Fallback to beautiful mock data if the table doesn't exist yet
        if (error?.message?.includes('Could not find the table')) {
          console.warn('Projects table not found in Supabase. Falling back to mock data.');
          setProjects([
            { id: 1, name: 'beoneofus-core', desc: 'The core network protocol for developer communication.', lang: 'Rust', stars: 1240, forks: 342, author: '@system' },
            { id: 2, name: 'nextjs-dashboard', desc: 'A modern, responsive admin dashboard built with Next.js App Router and Tailwind CSS.', lang: 'TypeScript', stars: 856, forks: 124, author: '@frontend-team' },
            { id: 3, name: 'local-ai-assistant', desc: 'Local LLM integration for automated code review and secure generation.', lang: 'Python', stars: 2156, forks: 567, author: '@ai-research' },
            { id: 4, name: 'auth-microservice', desc: 'A high-performance JWT authentication microservice.', lang: 'Go', stars: 432, forks: 89, author: '@security-ops' },
            { id: 5, name: 'mobile-app-react-native', desc: 'Cross-platform mobile application for the network.', lang: 'JavaScript', stars: 320, forks: 45, author: '@mobile-devs' },
            { id: 6, name: 'database-cache-layer', desc: 'In-memory caching layer built on top of Redis.', lang: 'C++', stars: 678, forks: 112, author: '@backend-team' }
          ]);
        } else {
          console.error('Error fetching projects:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.desc || p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.lang || p.language || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenWorkspace = async (project) => {
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const { data: newGroup, error: groupError } = await supabase.from('groups').insert({
        name: project.name,
        description: project.desc,
        is_private: false,
        created_by: session.user.id
      }).select().single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: session.user.id,
        role: 'admin'
      });

      if (memberError) {
        await supabase.from('groups').delete().eq('id', newGroup.id);
        throw memberError;
      }

      router.push('/dash?section=groups');
    } catch (error) {
      console.error(error);
      alert("Failed to create workspace: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Terminal className="text-blue-500 dark:text-blue-400" size={28} />
            <span>beone<span className="text-blue-600 dark:text-blue-400">of</span>us</span>
          </Link>
          <Link href="/" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-gray-100">Explore Projects</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl">Discover open-source repositories, trending libraries, and collaborative workspaces across the network.</p>
        </div>

        <div className="relative group shadow-sm rounded-2xl mb-10 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for technologies, frameworks, or project names..." 
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300 dark:hover:border-gray-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Loading projects...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((proj, i) => (
              <div key={proj.id || i} onClick={() => setSelectedProject(proj)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg transition-all group cursor-pointer flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <Code2 size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                  {proj.lang || proj.language || "Unknown"}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{proj.name}</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6 flex-1">{proj.desc || proj.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"><Star size={16} /> {proj.stars || 0}</span>
                  <span className="flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"><GitBranch size={16} /> {proj.forks || 0}</span>
                </div>
                <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-12 text-center shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No projects found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">We could not find any repositories matching your search query.</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl inline-block">Pro tip: Ask beoneofus AI in the bottom right corner for robust suggestions!</p>
            </div>
          )}
        </div>

        <div className="mt-16 text-center bg-blue-600 text-white rounded-[2.5rem] p-10 md:p-16 shadow-xl shadow-blue-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Have a project of your own?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">Share your code, build in public, and get real-time feedback from top engineers on the platform.</p>
            <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-4 rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg">
              Start Building Now <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-10 text-center text-gray-500 dark:text-gray-400 text-xs font-mono uppercase tracking-widest relative z-10 bg-transparent">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shrink-0 shadow-sm">
                   <Code2 size={28} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">{selectedProject.name}</h2>
                   <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Maintained by <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">{selectedProject.author || "@community"}</span></p>
                 </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  {selectedProject.lang || selectedProject.language || "Unknown"}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <Star size={16} /> {selectedProject.stars || 0}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
                  <GitBranch size={16} /> {selectedProject.forks || 0}
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-auto bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hidden sm:block">
                  Updated {selectedProject.updated || (selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString() : 'Recently')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">About this project</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                {selectedProject.desc || selectedProject.description} This repository serves as a foundational element for building scalable architectures. It actively welcomes contributions from the beoneofus developer community. Connect with the maintainers to learn more about the roadmap and open issues.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95">
                  <ExternalLink size={18} /> View Repository
                </button>
                <button 
                  onClick={() => handleOpenWorkspace(selectedProject)}
                  disabled={isCreating}
                  className="flex-1 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Terminal size={18} />} Open in Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <FloatingAiAssistant />
    </div>
  );
}
