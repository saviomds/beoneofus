"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal, ArrowLeft, Search, Star, GitBranch, Code2, ChevronRight, X, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import FloatingAiAssistant from "../components/FloatingAiAssistant";

export default function ExploreProjects() {
  const projects = [
    { name: "Nexus Engine", desc: "A high-performance runtime for distributed edge computing.", lang: "Rust", stars: "4.2k", forks: "342", author: "@sys_admin", updated: "2 days ago" },
    { name: "React Flow", desc: "Interactive node-based UI builder with rich animations.", lang: "TypeScript", stars: "12k", forks: "1.1k", author: "@frontend_guru", updated: "4 hours ago" },
    { name: "beoneofus-core", desc: "Open-source standards for the beoneofus communication protocol.", lang: "JavaScript", stars: "850", forks: "42", author: "@beoneofus_team", updated: "Just now" },
    { name: "HyperDB", desc: "In-memory database optimized for real-time applications.", lang: "C++", stars: "3.1k", forks: "210", author: "@db_master", updated: "1 week ago" },
    { name: "Tailwind Toolkit", desc: "A collection of accessible, pre-built Tailwind CSS components.", lang: "CSS", stars: "5.6k", forks: "890", author: "@ui_designer", updated: "3 days ago" },
    { name: "Go Auth", desc: "Zero-dependency JWT authentication middleware.", lang: "Go", stars: "1.2k", forks: "95", author: "@sec_ops", updated: "1 month ago" },
  ];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.lang.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <nav className="fixed top-0 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-500" size={28} />
            <span>beone<span className="text-blue-600">of</span>us</span>
          </Link>
          <Link href="/" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">Explore Projects</h1>
          <p className="text-lg text-gray-600 font-medium max-w-2xl">Discover open-source repositories, trending libraries, and collaborative workspaces across the network.</p>
        </div>

        <div className="relative group shadow-sm rounded-2xl mb-10 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for technologies, frameworks, or project names..." 
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-gray-300"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((proj, i) => (
              <div key={i} onClick={() => setSelectedProject(proj)} className="bg-white border border-gray-200 rounded-[2rem] p-6 hover:border-blue-500/50 hover:shadow-lg transition-all group cursor-pointer flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                  <Code2 size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {proj.lang}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{proj.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">{proj.desc}</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"><Star size={16} /> {proj.stars}</span>
                  <span className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"><GitBranch size={16} /> {proj.forks}</span>
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white border border-gray-200 rounded-[2rem] p-12 text-center shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-6">We could not find any repositories matching your search query.</p>
              <p className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl inline-block">Pro tip: Ask beoneofus AI in the bottom right corner for robust suggestions!</p>
            </div>
          )}
        </div>

        <div className="mt-16 text-center bg-blue-600 text-white rounded-[2.5rem] p-10 md:p-16 shadow-xl shadow-blue-600/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Have a project of your own?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">Share your code, build in public, and get real-time feedback from top engineers on the platform.</p>
            <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-xl text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-lg">
              Start Building Now <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-10 text-center text-gray-500 text-xs font-mono uppercase tracking-widest relative z-10 bg-white">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 shadow-sm">
                   <Code2 size={28} />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{selectedProject.name}</h2>
                   <p className="text-sm font-bold text-gray-500">Maintained by <span className="text-blue-600 cursor-pointer hover:underline">{selectedProject.author}</span></p>
                 </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                  {selectedProject.lang}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <Star size={16} /> {selectedProject.stars}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <GitBranch size={16} /> {selectedProject.forks}
                </span>
                <span className="text-xs font-bold text-gray-500 ml-auto bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hidden sm:block">
                  Updated {selectedProject.updated}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">About this project</h3>
              <p className="text-gray-600 leading-relaxed mb-8">
                {selectedProject.desc} This repository serves as a foundational element for building scalable architectures. It actively welcomes contributions from the beoneofus developer community. Connect with the maintainers to learn more about the roadmap and open issues.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95">
                  <ExternalLink size={18} /> View Repository
                </button>
                <button 
                  onClick={() => handleOpenWorkspace(selectedProject)}
                  disabled={isCreating}
                  className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
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
