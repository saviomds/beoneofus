"use client";

import { useState } from "react";
import { 
  BookOpen, 
  Terminal, 
  Users, 
  Shield, 
  Cpu, 
  MessageSquare, 
  ChevronDown, 
  Zap, 
  Code2, 
  Bookmark,
  AlertTriangle,
} from "lucide-react";

const DOC_SECTIONS = [
  {
    id: "intro",
    title: "System Overview",
    icon: <Terminal size={18} />,
    badge: "v1.0",
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p>
          <strong className="text-gray-900">beoneofus</strong> is a highly interactive, developer-centric social networking and collaboration platform. Built with a clean aesthetic, it connects developers globally.
        </p>
        <p>
          The network is powered by an edge-ready Next.js architecture and heavily leverages Supabase for real-time Postgres packet syncing, secure edge functions, and continuous data streams.
        </p>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-600 mt-4">
          <Zap size={18} className="mb-2" />
          <p className="text-xs font-bold tracking-wide">MISSION DIRECTIVE:</p>
          <p className="text-xs mt-1 opacity-80">Connect top-tier developer nodes globally. Share code. Establish secure handshakes. Build the future.</p>
        </div>
      </div>
    )
  },
  {
    id: "nodes",
    title: "Nodes & Identity",
    icon: <Cpu size={18} />,
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p>Your <strong>Node</strong> is your verified identity on the network.</p>
        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-500">
          <li><strong className="text-gray-900">Username & Avatar:</strong> Customize how other developers perceive you on the platform.</li>
          <li><strong className="text-gray-900">Node Status:</strong> A bio indicating your current system state (e.g., {`Active`}, {`In Maintenance`}).</li>
          <li><strong className="text-gray-900">Security Clearance:</strong> Represents your verification level and registration data.</li>
        </ul>
      </div>
    )
  },
  {
    id: "handshakes",
    title: "Network Handshakes",
    icon: <Zap size={18} />,
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p>To open a direct peer-to-peer (P2P) communication channel, you must establish a <strong>Handshake</strong>.</p>
        <p>When you send a request, the receiving node must <em>authorize the link</em>. Until then, the connection remains in a pending {`Syncing`} state.</p>
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600 mt-4 shadow-sm">
          <AlertTriangle size={18} className="mb-2" />
          <p className="text-xs font-bold tracking-wide uppercase">Critical Alert: Severing Connections</p>
          <p className="text-xs mt-1 opacity-80">If a user becomes hostile, you can immediately <strong className="text-red-600">Sever the Connection</strong> (Block). This locks the channel and prevents future transmissions.</p>
        </div>
      </div>
    )
  },
  {
    id: "workspaces",
    title: "Secured Workspaces",
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p><strong>Secured Workspaces</strong> (Channels) are collaborative environments for multiple nodes.</p>
        <p>Administrators can create Public or Private workspaces. Access to a private workspace requires an exact username invitation or an approved Join Request.</p>
        <p>Inside a workspace, members have access to a real-time, encrypted-style chat interface to broadcast text and image payloads.</p>
      </div>
    )
  },
  {
    id: "feed",
    title: "The Public Feed",
    icon: <Code2 size={18} />,
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p>The <strong>Feed</strong> is the main broadcast terminal of the beoneofus network.</p>
        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-500">
          <li>Share text updates and media.</li>
          <li>Inject formatted <strong>Code Snippets</strong> for code reviews.</li>
          <li>Like and Comment on transmissions from other nodes.</li>
          <li>Generate a <strong>Post Protocol Link</strong> to copy and share specific feed items.</li>
        </ul>
      </div>
    )
  },
  {
    id: "bookmarks",
    title: "Data Bookmarks",
    icon: <Bookmark size={18} />,
    content: (
      <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
        <p>Save important snippets, code blocks, or discussions to your personal <strong>Bookmarks</strong>.</p>
        <p>Bookmarks are categorized locally as {`Code`} or {`General`} and update in real-time if new comments are added to the original transmission.</p>
      </div>
    )
  }
];

export default function DocsContent() {
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0]);

  return (
    <div className="w-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[calc(100vh-120px)] h-full">
      {/* Header */}
      <div className="mb-6 md:mb-8 shrink-0 flex flex-col gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <BookOpen className="text-blue-500 w-6 h-6 md:w-8 md:h-8 shrink-0" />
            <span className="truncate sm:whitespace-normal">Platform Docs</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium truncate sm:whitespace-normal">Official reference manual for the beoneofus network.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 min-h-0">
        {/* Native Select Navigation */}
        <div className="relative w-full shrink-0">
          <select
            value={activeSection.id}
            onChange={(e) => setActiveSection(DOC_SECTIONS.find(s => s.id === e.target.value) || DOC_SECTIONS[0])}
            className="w-full p-4 pr-12 rounded-2xl bg-white border border-gray-300 text-gray-900 font-bold appearance-none focus:outline-none focus:border-blue-500 hover:border-gray-400 transition-colors shadow-sm cursor-pointer"
          >
            {DOC_SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <ChevronDown size={20} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-[2rem] relative overflow-hidden flex flex-col shadow-lg">
          {/* Cyberpunk Top Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-transparent opacity-50" />
          
          <div className="p-8 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                {activeSection.icon}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-gray-900">{activeSection.title}</h2>
                  {activeSection.badge && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-gray-200">
                      {activeSection.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mt-1">Documentation Protocol</p>
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeSection.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}