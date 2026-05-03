"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Editor from "@monaco-editor/react";
import {
  Loader2, FileCode2, Plus, Save, ChevronLeft, Square,
  FolderClosed, FolderOpen, File, X, TerminalSquare, Pencil,
  Play, Terminal, Download, UploadCloud, Globe, Trash2, AlertCircle, Search
} from "lucide-react";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
let _idCounter = 1;
const uid = () => String(_idCounter++);

const getLanguage = (filename) => {
  if (!filename) return "plaintext";
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    html: 'html', css: 'css', json: 'json', md: 'markdown', py: 'python',
    java: 'java', cpp: 'cpp', cc: 'cpp', c: 'cpp', go: 'go', rs: 'rust', sql: 'sql' };
  return map[ext] || 'plaintext';
};

// Build a virtual file tree from flat file list
const buildFileTree = (files, search) => {
  const filtered = search
    ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  const root = { children: [] };

  filtered.forEach(file => {
    const parts = file.name.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      let dir = node.children.find(c => c.isDir && c.name === parts[i]);
      if (!dir) {
        dir = { name: parts[i], isDir: true, path: parts.slice(0, i + 1).join('/'), children: [] };
        node.children.push(dir);
      }
      node = dir;
    }
    node.children.push({ ...file, isDir: false, title: parts[parts.length - 1] });
  });

  const sort = (node) => {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return (a.isDir ? a.name : a.title).localeCompare(b.isDir ? b.name : b.title);
    });
    node.children.filter(c => c.isDir).forEach(sort);
  };
  sort(root);

  return root.children;
};

// ---------------------------------------------------------------------------
// Default starter files
// ---------------------------------------------------------------------------
const DEFAULT_FILES = [
  { id: uid(), name: 'index.js', content: '// Welcome to Mini IDE\nconsole.log("Hello, world!");\n\nconst add = (a, b) => a + b;\nconsole.log("2 + 3 =", add(2, 3));\n' },
  { id: uid(), name: 'src/utils.js', content: 'export const greet = (name) => `Hello, ${name}!`;\n\nexport const sum = (...nums) => nums.reduce((a, b) => a + b, 0);\n' },
  { id: uid(), name: 'README.md', content: '# Mini IDE\n\nA lightweight in-browser code editor.\n\n## Features\n- File tree with folders\n- Monaco editor\n- Simulated terminal\n- Drag & drop file upload\n' },
];

// ---------------------------------------------------------------------------
// Simulated terminal output for running files (no WebContainer dependency)
// ---------------------------------------------------------------------------
const simulateRun = (file, allFiles) => {
  if (!file) return ['[error] No file selected.'];
  const lang = getLanguage(file.name);
  const lines = [];
  lines.push(`$ run ${file.name}`);
  if (lang === 'javascript') {
    const consoleLogs = [];
    // Extract console.log calls simply
    const logRe = /console\.log\(([^)]+)\)/g;
    let m;
    while ((m = logRe.exec(file.content)) !== null) {
      consoleLogs.push(`  ${m[1].replace(/['"]/g, '')}`);
    }
    if (consoleLogs.length) {
      consoleLogs.forEach(l => lines.push(l));
    } else {
      lines.push('  (no console.log output detected)');
    }
  } else if (lang === 'python') {
    const printRe = /print\(([^)]+)\)/g;
    let m;
    while ((m = printRe.exec(file.content)) !== null) {
      lines.push(`  ${m[1].replace(/['"]/g, '')}`);
    }
  } else if (lang === 'html') {
    lines.push('  [HTML] Open Preview tab to view rendered output.');
  } else {
    lines.push(`  [${lang}] Simulated execution complete.`);
  }
  lines.push(`[done] Process exited with code 0`);
  return lines;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ProjectIDE({ projectTitle = "My Project", onBack }) {
  // ---- Files ----------------------------------------------------------------
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState(DEFAULT_FILES[0].id);
  const [fileContent, setFileContent] = useState(DEFAULT_FILES[0].content);

  // ---- UI -------------------------------------------------------------------
  const [fileSearch, setFileSearch] = useState("");
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [activeTab, setActiveTab] = useState("console"); // "console" | "preview"
  const [terminalLines, setTerminalLines] = useState([
    '> Mini IDE ready. Select a file and press Run.',
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // ---- File CRUD UI states --------------------------------------------------
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileName, setEditFileName] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); // file | null

  // ---- Drag & Drop ----------------------------------------------------------
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // ---- Folder expand --------------------------------------------------------
  const [expandedFolders, setExpandedFolders] = useState({ src: true });

  // ---- Editor ---------------------------------------------------------------
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Keep refs in sync so event-listener callbacks always read the latest values
  // without being re-registered every render.
  const activeFileIdRef = useRef(activeFileId);
  const fileContentRef = useRef(fileContent);
  useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);
  useEffect(() => { fileContentRef.current = fileContent; }, [fileContent]);

  // Scroll terminal to bottom whenever new lines are added
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  // Cmd/Ctrl+S → save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(activeFileIdRef.current, fileContentRef.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Derived state --------------------------------------------------------
  const activeFile = files.find(f => f.id === activeFileId) ?? null;

  const fileTree = useMemo(() => buildFileTree(files, fileSearch), [files, fileSearch]);

  // ---- Handlers -------------------------------------------------------------
  const handleFileClick = useCallback((file) => {
    setActiveFileId(file.id);
    setFileContent(file.content ?? "");
    setEditingFileId(null);
  }, []);

  const handleEditorChange = useCallback((value) => {
    const val = value ?? "";
    setFileContent(val);
    setFiles(prev => prev.map(f => f.id === activeFileIdRef.current ? { ...f, content: val } : f));
  }, []);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      allowJs: true,
      jsx: 2,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  }, []);

  const handleSave = useCallback((id, content) => {
    if (!id) return;
    setIsSaving(true);
    // In-memory save; persist to files array
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
    setTimeout(() => setIsSaving(false), 400); // simulate async
  }, []);

  const handleRunCode = useCallback(() => {
    if (!activeFile) return;
    setIsRunning(true);
    setActiveTab("console");
    const current = files.find(f => f.id === activeFileIdRef.current);
    if (!current) { setIsRunning(false); return; }

    // Save first, then simulate run
    setFiles(prev => prev.map(f => f.id === current.id ? { ...f, content: fileContentRef.current } : f));
    const lines = simulateRun({ ...current, content: fileContentRef.current }, files);
    setTerminalLines(prev => [...prev, '', ...lines]);
    setIsRunning(false);
  }, [activeFile, files]);

  const handleInterrupt = useCallback(() => {
    setTerminalLines(prev => [...prev, '^C', '[interrupted]']);
    setIsRunning(false);
  }, []);

  const handleClearTerminal = useCallback(() => setTerminalLines([]), []);

  // ---- File Creation --------------------------------------------------------
  const handleCreateFile = useCallback((e) => {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) return;
    const newFile = { id: uid(), name, content: "" };
    setFiles(prev => [...prev, newFile]);
    setNewFileName("");
    setIsCreatingFile(false);
    handleFileClick(newFile);
    // Auto-expand folder if nested
    const parts = name.split('/');
    if (parts.length > 1) {
      const newExpanded = {};
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = i === 0 ? parts[i] : `${path}/${parts[i]}`;
        newExpanded[path] = true;
      }
      setExpandedFolders(prev => ({ ...prev, ...newExpanded }));
    }
  }, [newFileName, handleFileClick]);

  // ---- Rename ---------------------------------------------------------------
  const startRenaming = useCallback((e, file) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditFileName(file.name);
  }, []);

  const handleRenameSubmit = useCallback((e, id) => {
    e?.preventDefault();
    const trimmed = editFileName.trim();
    if (!trimmed) { setEditingFileId(null); return; }
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: trimmed } : f));
    setEditingFileId(null);
  }, [editFileName]);

  // ---- Delete ---------------------------------------------------------------
  const openDeleteModal = useCallback((e, id) => {
    e.stopPropagation();
    const file = files.find(f => f.id === id);
    if (file) setDeleteModal(file);
  }, [files]);

  const confirmDelete = useCallback(() => {
    if (!deleteModal) return;
    setFiles(prev => prev.filter(f => f.id !== deleteModal.id));
    if (activeFileId === deleteModal.id) {
      const remaining = files.filter(f => f.id !== deleteModal.id);
      if (remaining.length > 0) {
        handleFileClick(remaining[0]);
      } else {
        setActiveFileId(null);
        setFileContent("");
      }
    }
    setDeleteModal(null);
  }, [deleteModal, activeFileId, files, handleFileClick]);

  // ---- Drag & Drop ----------------------------------------------------------
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);
  const handleDragOver = useCallback((e) => e.preventDefault(), []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [];
    const newExpanded = {};

    for (const rawFile of droppedFiles) {
      try {
        const text = await rawFile.text();
        const filePath = rawFile.webkitRelativePath || rawFile.name;
        const parts = filePath.split('/');
        if (parts.length > 1) newExpanded[parts[0]] = true;
        newFiles.push({ id: uid(), name: filePath, content: text });
      } catch (err) {
        console.error("Failed to read file:", rawFile.name, err);
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setExpandedFolders(prev => ({ ...prev, ...newExpanded }));
      handleFileClick(newFiles[0]);
    }
  }, [handleFileClick]);

  // ---- Download ZIP (uses JSZip if available, else CSV fallback) ------------
  const handleDownload = useCallback(() => {
    // Simple text download of active file
    if (!activeFile) return;
    const blob = new Blob([activeFile.content || ""], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeFile]);

  // ---- Terminal Resize -------------------------------------------------------
  const startTerminalDrag = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;
    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      setTerminalHeight(h => Math.max(80, Math.min(startHeight + delta, window.innerHeight * 0.75)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [terminalHeight]);

  // ---- Folder toggle ---------------------------------------------------------
  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  // ---- Tree Renderer ---------------------------------------------------------
  const renderTree = useCallback((nodes, depth = 0) => {
    return nodes.map(node => {
      const pad = depth * 12 + 8;
      if (node.isDir) {
        const isOpen = !!expandedFolders[node.path];
        return (
          <div key={`dir-${node.path}`}>
            <div
              className="flex items-center gap-2 py-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2d2e] cursor-pointer transition-colors"
              style={{ paddingLeft: pad, paddingRight: 8 }}
              onClick={() => toggleFolder(node.path)}
            >
              {isOpen
                ? <FolderOpen size={15} className="text-blue-500 shrink-0" />
                : <FolderClosed size={15} className="text-gray-400 shrink-0" />}
              <span className="truncate select-none font-medium text-xs">{node.name}</span>
            </div>
            {isOpen && renderTree(node.children, depth + 1)}
          </div>
        );
      }

      const file = node;
      const isActive = activeFileId === file.id;
      return (
        <div
          key={`file-${file.id}`}
          className={`group flex items-center justify-between py-1.5 rounded text-xs transition-colors ${
            isActive
              ? 'bg-blue-100 dark:bg-[#37373d] text-blue-700 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2d2e]'
          }`}
          style={{ paddingLeft: pad, paddingRight: 4 }}
        >
          {editingFileId === file.id ? (
            <form
              onSubmit={(e) => handleRenameSubmit(e, file.id)}
              className="flex items-center gap-1.5 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <FileCode2 size={14} className="text-blue-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={editFileName}
                onChange={e => setEditFileName(e.target.value)}
                onBlur={(e) => handleRenameSubmit(e, file.id)}
                onKeyDown={(e) => e.key === 'Escape' && setEditingFileId(null)}
                className="flex-1 bg-white dark:bg-[#3c3c3c] border border-blue-500 rounded px-1 py-0.5 text-xs text-gray-900 dark:text-gray-100 outline-none min-w-0"
              />
            </form>
          ) : (
            <>
              <button
                onClick={() => handleFileClick(file)}
                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
              >
                <FileCode2 size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="truncate">{file.title}</span>
              </button>
              <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 transition-opacity gap-0.5">
                <button
                  onClick={(e) => startRenaming(e, file)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => openDeleteModal(e, file.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      );
    });
  // Deps: everything the renderer reads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, editingFileId, editFileName, expandedFolders, handleFileClick, handleRenameSubmit, openDeleteModal, startRenaming, toggleFolder]);

  // ---- Preview HTML ---------------------------------------------------------
  const previewSrcDoc = useMemo(() => {
    if (!activeFile) return "";
    if (getLanguage(activeFile.name) === 'html') return fileContent;
    return `<pre style="font-family:monospace;padding:1rem;white-space:pre-wrap">${fileContent.replace(/</g,'&lt;')}</pre>`;
  }, [activeFile, fileContent]);

  // ===========================================================================
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col w-full h-screen bg-gray-100 dark:bg-[#1e1e1e] relative overflow-hidden"
    >
      {/* ---- Delete Modal ---- */}
      {deleteModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                <AlertCircle className="text-red-500" size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Delete File</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Delete <span className="font-semibold text-gray-700 dark:text-gray-200 break-all">{deleteModal.name}</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Drag Overlay ---- */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-none flex flex-col items-center justify-center pointer-events-none">
          <UploadCloud size={56} className="text-blue-500 mb-3 animate-bounce" />
          <p className="text-2xl font-black text-blue-600">Drop files to upload</p>
        </div>
      )}

      {/* ====== HEADER ====== */}
      <header className="flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <TerminalSquare size={18} className="text-blue-500" />
          <h1 className="font-bold text-sm text-gray-900 dark:text-gray-100 hidden sm:block">{projectTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!activeFile}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={handleInterrupt}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            <Square size={12} className="fill-current" /> Stop
          </button>
          <button
            onClick={handleRunCode}
            disabled={!activeFile || isRunning}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run
          </button>
          <button
            onClick={() => handleSave(activeFileId, fileContent)}
            disabled={!activeFileId || isSaving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </header>

      {/* ====== BODY ====== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ---- Sidebar ---- */}
        <aside className="w-56 bg-gray-50 dark:bg-[#252526] border-r border-gray-200 dark:border-[#3c3c3c] flex flex-col shrink-0">
          {/* Sidebar Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-[#3c3c3c] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Explorer</span>
            <button
              onClick={() => { setIsCreatingFile(true); setNewFileName(""); }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-[#3c3c3c] rounded text-gray-500 dark:text-gray-300 transition"
              title="New File"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Search */}
          <div className="px-2 py-1.5 border-b border-gray-200 dark:border-[#3c3c3c]">
            <div className="flex items-center gap-1.5 bg-gray-200 dark:bg-[#3c3c3c] rounded px-2 py-1">
              <Search size={12} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search files..."
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400"
              />
              {fileSearch && (
                <button onClick={() => setFileSearch("")} className="text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {/* New file input */}
            {isCreatingFile && (
              <form onSubmit={handleCreateFile} className="flex items-center gap-1.5 px-2 py-1">
                <File size={13} className="text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onBlur={() => { if (!newFileName) setIsCreatingFile(false); }}
                  onKeyDown={e => e.key === 'Escape' && setIsCreatingFile(false)}
                  placeholder="src/file.js"
                  className="flex-1 bg-white dark:bg-[#3c3c3c] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-gray-100 outline-none"
                />
              </form>
            )}

            {renderTree(fileTree)}

            {files.length === 0 && !isCreatingFile && (
              <p className="text-xs text-gray-400 p-2 text-center">No files. Click + to create one.</p>
            )}
          </div>
        </aside>

        {/* ---- Editor + Terminal ---- */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Active file tab bar */}
          <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] shrink-0 min-h-[34px] px-1 gap-0.5 overflow-x-auto">
            {activeFile ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] text-gray-200 text-xs rounded-t border-t-2 border-t-blue-500">
                <FileCode2 size={13} className="text-blue-400" />
                <span>{activeFile.name.split('/').pop()}</span>
                {isSaving && <Loader2 size={11} className="animate-spin text-blue-400 ml-1" />}
              </div>
            ) : (
              <span className="text-xs text-gray-500 px-3 py-1.5">No file open</span>
            )}
          </div>

          {/* Monaco Editor — flex-1 to fill remaining space above terminal */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e]">
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguage(activeFile.name)}
                theme="vs-dark"
                value={fileContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: "on",
                  padding: { top: 12, bottom: 12 },
                  scrollBeyondLastLine: false,
                  lineNumbersMinChars: 3,
                  folding: true,
                  tabSize: 2,
                  automaticLayout: true, // FIX: auto-recalculates layout on resize
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <TerminalSquare size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Select or create a file to start coding.</p>
                <button
                  onClick={() => setIsCreatingFile(true)}
                  className="mt-3 text-xs text-blue-500 hover:underline"
                >
                  Create a new file
                </button>
              </div>
            )}
          </div>

          {/* ---- Resize Handle ---- */}
          <div
            className="h-1.5 bg-[#3c3c3c] hover:bg-blue-500 cursor-row-resize transition-colors shrink-0"
            onMouseDown={startTerminalDrag}
            title="Drag to resize terminal"
          />

          {/* ---- Terminal / Preview Panel ---- */}
          <div
            className="bg-[#0d0d0d] flex flex-col shrink-0 overflow-hidden"
            style={{ height: terminalHeight }}
          >
            {/* Tab Bar */}
            <div className="flex items-center bg-[#1e1e1e] border-b border-[#3c3c3c] shrink-0">
              <button
                onClick={() => setActiveTab("console")}
                className={`px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "console"
                    ? "text-gray-100 border-blue-500"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                <Terminal size={13} /> Console
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "preview"
                    ? "text-gray-100 border-blue-500"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                <Globe size={13} /> Preview
              </button>
              <div className="flex-1" />
              <button
                onClick={handleClearTerminal}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
                title="Clear console"
              >
                <X size={13} />
              </button>
            </div>

            {/* Console */}
            {activeTab === "console" && (
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-green-400 leading-relaxed">
                {terminalLines.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${
                    line.startsWith('[error]') ? 'text-red-400' :
                    line.startsWith('[done]') ? 'text-blue-400' :
                    line.startsWith('>') ? 'text-gray-400' :
                    line.startsWith('$') ? 'text-yellow-400' :
                    line.startsWith('[interrupted]') ? 'text-orange-400' :
                    'text-green-400'
                  }`}>{line}</div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            )}

            {/* Preview */}
            {activeTab === "preview" && (
              <div className="flex-1 bg-white overflow-hidden">
                {activeFile && getLanguage(activeFile.name) === 'html' ? (
                  <iframe
                    key={activeFile.id} // re-mount when file changes
                    srcDoc={previewSrcDoc}
                    className="w-full h-full border-none"
                    title="Preview"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-500 text-sm gap-2">
                    <Globe size={28} className="opacity-20" />
                    <p className="text-xs">
                      {activeFile ? "Open an HTML file to preview it here." : "No file selected."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}