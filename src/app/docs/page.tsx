"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Terminal, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  Hash, 
  ShieldCheck, 
  Zap, 
  Bot, 
  BookOpen, 
  ExternalLink,
  Cpu,
  Briefcase,
  Network
} from "lucide-react";

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("introduction");

  // Automatically update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "introduction";
      
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 100) {
          current = section.getAttribute("id") || "introduction";
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    {
      title: "Getting Started",
      links: [
        { name: "Introduction", id: "introduction" },
        { name: "Initialize Node", id: "initialize-node" },
      ]
    },
    {
      title: "Core Concepts",
      links: [
        { name: "Network & Handshakes", id: "network-handshakes" },
        { name: "Secured Workspaces", id: "secured-workspaces" },
        { name: "Global Community", id: "global-community" },
      ]
    },
    {
      title: "Features",
      links: [
        { name: "beoneofus AI", id: "beoneofus-ai" },
        { name: "Opportunities", id: "opportunities" },
        { name: "Admin Terminal", id: "admin-terminal" },
      ]
    }
  ];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Fixed Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-black text-xl tracking-tighter flex items-center gap-2">
            <Terminal className="text-blue-600 dark:text-blue-500" size={24} />
            <span>beone<span className="text-blue-600 dark:text-blue-500">of</span>us</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            <ChevronRight size={16} />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">Documentation</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative group w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search documentation..." 
              className="w-full bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="hidden sm:inline-block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 text-[10px] font-mono text-gray-500">Ctrl</kbd>
              <kbd className="hidden sm:inline-block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 text-[10px] font-mono text-gray-500">K</kbd>
            </div>
          </div>
          <Link href="/dash" className="hidden md:flex text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <button className="md:hidden p-2 text-gray-600 dark:text-gray-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="max-w-[90rem] mx-auto flex pt-16">
        {/* Left Sidebar Navigation */}
        <aside className={`fixed inset-y-0 left-0 pt-16 z-40 w-72 bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-gray-800 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out overflow-y-auto no-scrollbar`}>
          <div className="p-6">
            <div className="md:hidden mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-gray-100 dark:bg-gray-900 border border-transparent rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <nav className="space-y-8">
              {navItems.map((group, idx) => (
                <div key={idx}>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">{group.title}</h4>
                  <ul className="space-y-2 border-l border-gray-200 dark:border-gray-800 ml-2 pl-4">
                    {group.links.map((link) => (
                      <li key={link.id}>
                        <button 
                          onClick={() => scrollToSection(link.id)}
                          className={`text-sm w-full text-left transition-colors ${activeSection === link.id ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                        >
                          {link.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 md:px-12 py-10 md:ml-72 lg:mr-64">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              <BookOpen size={14} /> Documentation v1.0
            </div>

            {/* Introduction */}
            <section id="introduction" className="mb-16 scroll-mt-24">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-4">Introduction</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                Welcome to the official documentation for <strong className="text-gray-900 dark:text-white">beoneofus</strong>. This platform is designed as the ultimate network for developers, facilitating encrypted handshakes, public broadcast pages, secured workspaces, and AI-driven workflow assistance.
              </p>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl my-8">
                <h4 className="font-bold flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100"><Zap size={18} className="text-amber-500" /> What makes this platform different?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Unlike traditional social networks, <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-200 text-xs">beoneofus</code> treats every user as a Node. Interaction requires mutual consent (Handshakes), workspaces are securely isolated, and an integrated AI agent is available to assist you in real-time across the entire application.
                </p>
              </div>
            </section>

            {/* Initialize Node */}
            <section id="initialize-node" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Cpu size={24} className="text-blue-500" /> Initialize Your Node
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your Node is your identity. When you first sign up, you must configure your node to establish your presence on the network.
              </p>
              <ul className="list-disc list-inside space-y-3 text-gray-600 dark:text-gray-400 ml-4 mb-6 leading-relaxed">
                <li><strong>Username & Headline:</strong> Choose a unique handle and describe your current role or tech stack.</li>
                <li><strong>Work Status:</strong> Set your status to <code className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1 rounded text-xs">Open to work</code> or <code className="text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-1 rounded text-xs">Hiring</code> to broadcast your availability.</li>
                <li><strong>External Links:</strong> Connect your GitHub and personal website to verify your developer footprint.</li>
              </ul>
              <div className="bg-[#0d1117] rounded-xl p-4 overflow-x-auto border border-gray-800">
                <pre className="text-sm text-gray-300 font-mono">
                  <span className="text-blue-400">const</span> <span className="text-yellow-300">node</span> = <span className="text-blue-400">await</span> beoneofus.<span className="text-green-300">initialize</span>({`{`}{'\n'}
                  {'  '}username: <span className="text-orange-300">{`'John Joe'`}</span>,{'\n'}
                  {'  '}status: <span className="text-orange-300">{`'Full Stack Architect'`}</span>,{'\n'}
                  {'  '}verified: <span className="text-blue-400">true</span>{'\n'}
                  {`}`});
                </pre>
              </div>
            </section>

            {/* Network & Handshakes */}
            <section id="network-handshakes" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Network size={24} className="text-emerald-500" /> Network & Handshakes
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The platform prevents spam by strictly enforcing a mutual consent protocol for direct networking. This process is called a <strong>Handshake</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="border border-gray-200 dark:border-gray-800 p-5 rounded-2xl bg-white dark:bg-gray-900">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">1. Initiate</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Find a developer in the Discover tab and send a connection request. Your status changes to <em>Pending</em>.</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-800 p-5 rounded-2xl bg-white dark:bg-gray-900">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">2. Acknowledge</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">The recipient reviews your request in their Notifications. Once accepted, a secure channel opens.</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Once a handshake is established, both nodes can securely exchange direct messages, share code snippets, and invite each other to private workspaces.
              </p>
            </section>

            {/* Secured Workspaces */}
            <section id="secured-workspaces" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Hash size={24} className="text-purple-500" /> Secured Workspaces
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Workspaces (Channels) are collaborative environments where teams can share messages, images, and code snippets. 
              </p>
              <ul className="space-y-4 mb-6">
                <li className="flex gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><ShieldCheck size={14} /></div>
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100 text-sm block">Private Workspaces</strong>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Requires an explicit invite from the Workspace Administrator. Perfect for internal teams or stealth projects.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Hash size={14} /></div>
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100 text-sm block">Public Workspaces</strong>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Open to all nodes on the network. Excellent for open-source discussions, framework help, and community building.</span>
                  </div>
                </li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-4 rounded-r-lg text-sm text-blue-800 dark:text-blue-200">
                <strong>Pro Tip:</strong> You can react to messages in workspaces using the 👍 button, and reply to specific messages to create threaded context.
              </div>
            </section>

            {/* Global Community */}
            <section id="global-community" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                 Global Community Feed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The Feed is the town square of beoneofus. Here, you can broadcast updates, share code snippets with syntax highlighting, and engage in technical code reviews. 
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The feed is categorized into intuitive tabs: <strong>Following</strong> (nodes you have handshakes with), <strong>Featured</strong> (highly liked content), <strong>Rising</strong> (trending content), and <strong>Code Review</strong> (posts specifically containing code snippets).
              </p>
            </section>

            {/* beoneofus AI */}
            <section id="beoneofus-ai" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Bot size={24} className="text-blue-500" /> beoneofus AI Assistant
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Your built-in technical co-pilot. The AI assistant is context-aware and deeply integrated into various parts of the platform to accelerate your workflow.
              </p>
              
              <div className="space-y-6 mt-6">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-2"><Bot size={16}/> Floating Assistant</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Available anywhere on the platform via the bottom right spark icon. Use it to ask coding questions, generate boilerplate, or debug errors while you browse.</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-2"><Search size={16}/> Feed Integrations</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">On any feed post, you can click the AI buttons to instantly <strong>Summarize</strong> long posts into bullet points, <strong>Analyze Code</strong> for security vulnerabilities, or generate a <strong>Suggested Reply</strong>.</p>
                </div>
              </div>
            </section>

            {/* Opportunities */}
            <section id="opportunities" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Briefcase size={24} className="text-amber-500" /> Opportunities (Jobs)
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                beoneofus streamlines technical hiring. Any node can post a job opportunity from their profile page. 
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                When users apply to your job, you can view their application directly in your Profile tab under {`"View Applicants"`}. You can Accept or Decline applications, which automatically triggers a notification and an email to the applicant.
              </p>
            </section>

            {/* Admin Terminal */}
            <section id="admin-terminal" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Terminal size={24} className="text-red-500" /> Admin Terminal
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Nodes with <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">is_admin: true</code> clearance have access to the Admin Dashboard via the <strong>Resources</strong> section.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4 mb-6 text-sm">
                <li>Review and approve verification requests (grants the blue checkmark).</li>
                <li>Manage network users, including the ability to permanently delete nodes.</li>
                <li>Monitor AI interactions in real-time via AI Logs.</li>
                <li>Track and oversee all job applications circulating on the network.</li>
              </ul>
            </section>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-8 mt-16 border-t border-gray-200 dark:border-gray-800">
              <Link href="/how_it_works" className="text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                <ChevronRight size={16} className="rotate-180" /> How It Works
              </Link>
              <Link href="/dash" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors flex items-center gap-1">
                Open Dashboard <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Table of Contents */}
        <aside className="hidden lg:block w-64 shrink-0 pt-16 pr-8">
          <div className="sticky top-24">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-100 mb-4">On this page</h4>
            <ul className="space-y-2.5 border-l border-gray-200 dark:border-gray-800 pl-4">
              {navItems.flatMap(group => group.links).map((link) => (
                <li key={`toc-${link.id}`}>
                  <button 
                    onClick={() => scrollToSection(link.id)}
                    className={`text-xs text-left transition-colors w-full ${activeSection === link.id ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-gray-100 mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="https://github.com" target="_blank" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2 transition-colors">
                    <ExternalLink size={14} /> Source Code
                  </Link>
                </li>
                <li>
                  <Link href="/dash?tool=support" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2 transition-colors">
                    <ExternalLink size={14} /> Open Support Ticket
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
