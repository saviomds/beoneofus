"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { supabase } from "../supabaseClient";
import { 
  Loader2, FileCode2, Plus, Save, ChevronLeft, 
  FolderClosed, File, X, TerminalSquare, Pencil, Play, Terminal 
} from "lucide-react";
import { WebContainer } from '@webcontainer/api';

export default function ProjectIDE({ projectId }) {
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Editor States
  const [activeFileId, setActiveFileId] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New File States
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // Rename File States
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileName, setEditFileName] = useState("");

  // Execution States
  const [webcontainerInstance, setWebcontainerInstance] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const contentRef = useRef(fileContent);
  const activeFileIdRef = useRef(activeFileId);

  useEffect(() => {
    contentRef.current = fileContent;
    activeFileIdRef.current = activeFileId;
  }, [fileContent, activeFileId]);

  useEffect(() => {
    fetchProjectData();

    // Cmd/Ctrl + S hotkey for saving
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileIdRef.current) {
          saveFile(activeFileIdRef.current, contentRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectId]);

  // Boot WebContainer on mount (Requires COOP/COEP headers in next.config.js)
  useEffect(() => {
    async function bootWebContainer() {
      try {
        if (!webcontainerInstance) {
          const instance = await WebContainer.boot();
          setWebcontainerInstance(instance);
        }
      } catch (err) {
        console.warn("WebContainer boot failed. Did you add COOP/COEP headers?", err);
      }
    }
    bootWebContainer();
  }, []);

  const fetchProjectData = async () => {
    if (!projectId) {
      setLoading(false);
      return; // Safety check
    }

    try {
      // Ensure session is loaded so RLS doesn't block the request on direct navigation
      await supabase.auth.getSession();

      // Fetch Project
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projError) throw projError;
      setProject(projData);

      // Fetch Files
      const { data: filesData, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (filesError) throw filesError;
      
      setFiles(filesData || []);
      
      // Auto-select first file if available
      if (filesData?.length > 0) {
        handleFileClick(filesData[0]);
      }
    } catch (err) {
      console.error("Project load error:", err);
      alert("Failed to load project workspace: " + (err?.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file) => {
    setActiveFileId(file.id);
    setFileContent(file.content || "");
  };

  const saveFile = async (id, content) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ content })
        .eq('id', id);
        
      if (error) throw error;
      setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    try {
      const { data: newFile, error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          name: newFileName,
          content: "",
          is_folder: false
        })
        .select()
        .single();
        
      if (error) throw error;
      setFiles([...files, newFile]);
      setNewFileName("");
      setIsCreatingFile(false);
      handleFileClick(newFile);
    } catch (err) {
      alert("Failed to create file: " + err.message);
    }
  };

  const startRenaming = (e, file) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditFileName(file.name);
  };

  const handleRenameFile = async (e, id) => {
    e?.preventDefault();
    const fileToRename = files.find(f => f.id === id);
    if (!editFileName.trim() || editFileName === fileToRename?.name) {
      setEditingFileId(null);
      return;
    }

    try {
      const newName = editFileName;
      setEditingFileId(null); // Optimistic UI update
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      
      const { error } = await supabase
        .from('project_files')
        .update({ name: newName })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      alert("Failed to rename file: " + err.message);
      fetchProjectData(); // Revert on failure
    }
  };

  const getLanguage = (filename) => {
    if (!filename) return "plaintext";
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.java')) return 'java';
    if (filename.endsWith('.cpp') || filename.endsWith('.cc') || filename.endsWith('.c')) return 'cpp';
    if (filename.endsWith('.go')) return 'go';
    if (filename.endsWith('.rs')) return 'rust';
    if (filename.endsWith('.sql')) return 'sql';
    return 'plaintext';
  };

  const handleRunCode = async () => {
    if (!webcontainerInstance || !activeFile) {
      setTerminalOutput(prev => [...prev, "> System: WebContainer is not ready. Make sure headers are configured."]);
      return;
    }
    setIsRunning(true);
    setTerminalOutput([]);
    try {
      // Mount the current file to the virtual file system
      await webcontainerInstance.mount({ [activeFile.name]: { file: { contents: fileContent } } });
      
      // Execute the file using Node.js
      const process = await webcontainerInstance.spawn('node', [activeFile.name]);
      
      // Stream the output to our console state
      process.output.pipeTo(new WritableStream({
        write(data) { setTerminalOutput(prev => [...prev, data]); }
      }));
      
      await process.exit;
    } catch (err) {
      setTerminalOutput(prev => [...prev, `> Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) return <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  if (!project) return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
      <TerminalSquare size={48} className="opacity-20 text-red-500" />
      <p className="font-bold text-xl text-gray-900 dark:text-gray-100">Project Not Found</p>
      <p className="text-sm">It may have been deleted, or you donot have authorization to view this node.</p>
      <button onClick={() => router.push('/projects')} className="text-blue-500 hover:underline font-bold">Return to Dashboard</button>
    </div>
  );

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto p-4 sm:px-6 pb-6 animate-in fade-in zoom-in-95 duration-300">
      {/* IDE Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-t-2xl p-3 px-5 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/projects')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <TerminalSquare size={20} className="text-blue-500" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100">{project.title}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRunCode}
            disabled={!activeFile || isRunning}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run Node.js
          </button>
          <button 
            onClick={() => saveFile(activeFileId, fileContent)}
            disabled={!activeFileId || isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save (Cmd+S)
          </button>
        </div>
      </div>

      {/* IDE Body */}
      <div className="flex-1 flex border border-t-0 border-gray-200 dark:border-gray-800 rounded-b-2xl overflow-hidden bg-[#1e1e1e]">
        
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-[#252526] border-r border-gray-200 dark:border-[#3c3c3c] flex flex-col">
          <div className="p-3 border-b border-gray-200 dark:border-[#3c3c3c] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Explorer</span>
            <button onClick={() => setIsCreatingFile(true)} className="p-1 hover:bg-gray-200 dark:hover:bg-[#3c3c3c] rounded text-gray-500 dark:text-gray-300">
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isCreatingFile && (
              <form onSubmit={handleCreateFile} className="flex items-center gap-2 p-1 px-2">
                <File size={14} className="text-gray-400" />
                <input autoFocus type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)} onBlur={() => !newFileName && setIsCreatingFile(false)} placeholder="filename.js" className="flex-1 bg-white dark:bg-[#3c3c3c] border border-blue-500 rounded px-2 py-1 text-xs text-gray-900 dark:text-gray-100 outline-none" />
              </form>
            )}
            
            {files.map(file => (
              <div key={file.id} className={`group flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${activeFileId === file.id ? 'bg-blue-100 dark:bg-[#37373d] text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2d2e]'}`}>
                {editingFileId === file.id ? (
                  <form onSubmit={(e) => handleRenameFile(e, file.id)} className="flex items-center gap-2 w-full">
                    <FileCode2 size={16} className="text-blue-500 shrink-0" />
                    <input autoFocus type="text" value={editFileName} onChange={e => setEditFileName(e.target.value)} onBlur={(e) => handleRenameFile(e, file.id)} className="flex-1 bg-white dark:bg-[#3c3c3c] border border-blue-500 rounded px-1 py-0.5 text-xs text-gray-900 dark:text-gray-100 outline-none w-full min-w-0" />
                  </form>
                ) : (
                  <>
                    <button onClick={() => handleFileClick(file)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <FileCode2 size={16} className={`shrink-0 ${activeFileId === file.id ? "text-blue-500" : "text-gray-400"}`} />
                      <span className="truncate">{file.name}</span>
                    </button>
                    <button onClick={(e) => startRenaming(e, file)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-opacity shrink-0" title="Rename File">
                      <Pencil size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {files.length === 0 && !isCreatingFile && (
              <p className="text-xs text-gray-500 p-2 text-center">No files yet.</p>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
          {activeFile ? (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 min-h-0">
                <Editor height="100%" language={getLanguage(activeFile.name)} theme="vs-dark" value={fileContent} onChange={setFileContent} options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: "on", padding: { top: 16 } }} />
              </div>
              {/* Output Terminal Area */}
              <div className="h-48 bg-[#0d0d0d] border-t border-[#3c3c3c] p-3 overflow-y-auto font-mono text-xs flex flex-col">
                <div className="flex items-center gap-2 text-gray-500 mb-2 uppercase tracking-widest font-bold shrink-0">
                  <Terminal size={14} /> Console Output
                </div>
                {terminalOutput.map((line, i) => (<div key={i} className="text-gray-300 break-words">{line}</div>))}
                {terminalOutput.length === 0 && <span className="text-gray-600 italic">Ready to execute...</span>}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <TerminalSquare size={48} className="mb-4 opacity-20" />
              <p>Select or create a file to start coding.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}