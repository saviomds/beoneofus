"use client";

import { useState, useEffect } from "react";
import { Plus, FolderDot, X, Loader2, Pencil, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/navigation";

export default function ProjectsContent() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState(null);
  const router = useRouter();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        await fetchProjects(session.user.id);
      } else {
        setLoading(false);
        router.push('/auth'); // Redirect to login if unauthenticated
      }
    };
    init();
  }, []);

  const fetchProjects = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', userId) // Securely filter for user's projects only
        .order('created_at', { ascending: false });
      if (!error && data) setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setTitle("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (e, project) => {
    e.stopPropagation(); // Prevents the card click event from routing
    setModalMode("edit");
    setActiveProjectId(project.id);
    setTitle(project.title);
    setDescription(project.description || "");
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      showToast("Project deleted successfully", "success");
      fetchProjects(currentUserId);
    } catch (err) {
      showToast("Failed to delete project: " + err.message, "error");
    }
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!title.trim() || !currentUserId) return;
    setIsProcessing(true);
    try {
      if (modalMode === "create") {
        const { error } = await supabase.from('projects').insert({ title, description, created_by: currentUserId });
        if (error) throw error;
        showToast("Project created successfully!", "success");
      } else {
        const { error } = await supabase.from('projects').update({ title, description }).eq('id', activeProjectId);
        if (error) throw error;
        showToast("Project updated successfully!", "success");
      }
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      fetchProjects(currentUserId); // Refresh the list
    } catch (err) {
      showToast(`Failed to ${modalMode} project. ` + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">b1overs Projects</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Your mini code workspace</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-sm active:scale-95"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : projects.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-[2rem] shadow-sm">
          <FolderDot size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-bold mb-2 text-lg">No projects found.</p>
          <p className="text-sm text-gray-500 text-center max-w-sm">Create your first b1overs project to start coding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[1.5rem] p-5 hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <FolderDot size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg line-clamp-1">{project.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description || "No description provided."}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => openEditModal(e, project)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit Project">
                    <Pencil size={18} />
                  </button>
                  <button onClick={(e) => handleDeleteProject(e, project.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete Project">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{modalMode === "create" ? "Create New Project" : "Edit Project"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleSubmitProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Project Name</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. My Awesome App" className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of your project..." className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessing} className="flex-1 flex justify-center py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : (modalMode === "create" ? "Create Project" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[150] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          toast.type === "error" 
            ? "bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400" 
            : "bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400"
        }`}>
          {toast.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}