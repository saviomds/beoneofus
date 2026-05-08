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
  LayoutDashboard,
  MessageSquare,
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
        { name: "Talent Dashboard", id: "talent-dashboard" },
      ]
    },
    {
      title: "Core Features",
      links: [
        { name: "Connections & Calls", id: "connections-calls" },
        { name: "Job Matching & Applications", id: "job-matching" },
      ]
    },
    {
      title: "AI Capabilities",
      links: [
        { name: "AI CV Analysis", id: "cv-analysis" },
        { name: "Smart Messaging", id: "smart-messaging" },
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
                Welcome to the official documentation for <strong className="text-gray-900 dark:text-white">BeOneOfUs</strong>. This platform is designed as the ultimate network where skills meet opportunity, facilitating secure connections, real-time communication, AI-driven CV analysis, and smart job matching.
              </p>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl my-8">
                <h4 className="font-bold flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100"><Zap size={18} className="text-amber-500" /> What makes this platform different?</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-gray-200 text-xs">BeOneOfUs</code> is built for modern talent and founders. It features real-time WebRTC calling, AI-powered resume parsing, and a connection request system ensuring that your interactions are mutual and meaningful.
                </p>
              </div>
            </section>

            {/* Talent Dashboard */}
            <section id="talent-dashboard" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <LayoutDashboard size={24} className="text-blue-500" /> Talent Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The Talent Dashboard is your central hub for managing your career and opportunities on BeOneOfUs.
              </p>
              <ul className="list-disc list-inside space-y-3 text-gray-600 dark:text-gray-400 ml-4 mb-6 leading-relaxed">
                <li><strong>Active Applications:</strong> Track the status of your submitted job applications (Pending, Accepted, Rejected).</li>
                <li><strong>Profile Stats:</strong> View your weekly profile views and overall reputation score.</li>
                <li><strong>Real-time Notifications:</strong> Get instantly notified when your connection requests are accepted or when you receive a message.</li>
              </ul>
            </section>

            {/* Connections & Calls */}
            <section id="connections-calls" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Network size={24} className="text-emerald-500" /> Connections & Calls
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The platform strictly enforces a mutual consent protocol for direct networking. This process requires a <strong>Connection Request</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="border border-gray-200 dark:border-gray-800 p-5 rounded-2xl bg-white dark:bg-gray-900">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">1. Send Request</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Find a user and send a connection request. Your status changes to <em>Waiting</em>.</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-800 p-5 rounded-2xl bg-white dark:bg-gray-900">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">2. Connect</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Once accepted, a secure channel opens for chatting and calling.</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Connected users can initiate <strong>WebRTC Voice and Video calls</strong> directly from the chat interface, enabling seamless collaboration without leaving the platform.
              </p>
            </section>

            {/* Job Matching */}
            <section id="job-matching" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Briefcase size={24} className="text-amber-500" /> Job Matching & Applications
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Finding the right opportunity is powered by our proprietary matching algorithm.
              </p>
              <ul className="space-y-4 mb-6">
                <li className="flex gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"><Briefcase size={14} /></div>
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100 text-sm block">Recommended Opportunities</strong>
                    <span className="text-sm text-gray-500 dark:text-gray-400">The platform automatically analyzes your profile against available jobs, providing a match score (%) and a specific reason why you&apos;re a good fit.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"><ShieldCheck size={14} /></div>
                  <div>
                    <strong className="text-gray-900 dark:text-gray-100 text-sm block">Application Tracking</strong>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Keep an eye on roles you&apos;ve applied for. Get full details including messages from the employer and next steps configurations when accepted.</span>
                  </div>
                </li>
              </ul>
            </section>

            {/* AI CV Analysis */}
            <section id="cv-analysis" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <Bot size={24} className="text-purple-500" /> AI CV Analysis
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Paste your resume text into the AI CV Analyzer to get instant, actionable insights.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 mb-6 space-y-4 border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-1">What the AI Extracts</p>
                  <ul className="list-disc list-inside text-sm text-gray-800 dark:text-gray-200 space-y-2">
                    <li><strong>Years of Experience:</strong> Accurately calculates your total experience.</li>
                    <li><strong>Top Skills:</strong> Identifies and formats your core competencies.</li>
                    <li><strong>Suggestions:</strong> Provides tailored advice on how to improve your CV.</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Extracted skills are automatically saved and appended to your BeOneOfUs profile to improve your job match scores.
              </p>
            </section>

            {/* Smart Messaging */}
            <section id="smart-messaging" className="mb-16 scroll-mt-24">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <MessageSquare size={24} className="text-blue-500" /> Smart Messaging
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                The messaging experience is enriched with AI and productivity tools.
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4 mb-6 text-sm">
                <li><strong>AI Suggested Replies:</strong> Stuck on what to say? Click the spark icon to draft a brief, friendly reply based on the context of the conversation.</li>
                <li><strong>Rich Media:</strong> Share images with built-in lightbox viewing capabilities.</li>
                <li><strong>Message Reactions:</strong> React to specific messages with emojis.</li>
                <li><strong>Read Receipts & Typing Indicators:</strong> Know when your message is read and when the other user is typing.</li>
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
                  <Link href="/dash/more?tool=support" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2 transition-colors">
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
