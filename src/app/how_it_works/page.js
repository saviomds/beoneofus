"use client";

import Link from "next/link";
import { Terminal, ArrowLeft, UserPlus, Handshake, Hash, Bot, ArrowDown } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <UserPlus size={32} />,
      title: "1. Initialize Your Node",
      desc: "Create your profile and establish your presence. Add your tech stack, link your GitHub, and get verified to prove your identity on the network.",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50"
    },
    {
      icon: <Handshake size={32} />,
      title: "2. Establish Handshakes",
      desc: "Direct messaging requires mutual consent. Send a connection request to a peer, and once they accept the handshake, a secure 1-on-1 channel is opened.",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50"
    },
    {
      icon: <Hash size={32} />,
      title: "3. Join Secured Workspaces",
      desc: "Collaborate with teams in public or private groups. Share files, reply to threads in real-time, and react to code snippets without the noise of traditional social media.",
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50"
    },
    {
      icon: <Bot size={32} />,
      title: "4. Leverage the AI",
      desc: "Use the built-in beoneofus AI to instantly review code snippets in your feed for security vulnerabilities, summarize long discussions, or draft quick replies.",
      color: "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
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

      <main className="pt-32 pb-20 px-6 relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-gray-900 dark:text-gray-100">How it works</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl mx-auto">A modern, intentional approach to developer collaboration and networking.</p>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-800 -translate-x-1/2 rounded-full" />
          
          <div className="space-y-12 relative">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                <div className="flex-1 w-full md:w-auto bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-300">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{step.desc}</p>
                </div>
                
                <div className={`w-20 h-20 shrink-0 rounded-full border-[4px] flex items-center justify-center shadow-xl relative z-10 ${step.color}`}>
                  {step.icon}
                </div>
                
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-6 tracking-tight">Ready to initialize your connection?</h2>
          <Link href="/auth" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl text-lg font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
            Create Account
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-10 text-center text-gray-500 dark:text-gray-400 text-xs font-mono uppercase tracking-widest relative z-10 bg-white dark:bg-gray-900 mt-10">
        beoneofus platform v1.0 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
