"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, Plane, UserCircle, Users, MessageSquare, Briefcase, LifeBuoy,
  ChevronDown, ArrowRight, CheckCircle2,
} from "lucide-react";

const p = "text-sm text-gray-600 dark:text-gray-400 leading-relaxed";
const A = ({ href, children }) => (
  <Link href={href} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{children}</Link>
);
function List({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={typeof item === "string" ? item : item.key} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <span>{typeof item === "string" ? item : item.node}</span>
        </li>
      ))}
    </ul>
  );
}

const DOC_SECTIONS = [
  {
    id: "overview",
    title: "Overview",
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <p className={p}>
          <strong className="text-gray-900 dark:text-gray-100">beoneofus</strong> helps graduates and school-leavers from
          Rwanda study or work abroad in Mauritius. Alongside your application you get a profile, a professional network,
          jobs and a community to grow with.
        </p>
        <List items={[
          "Apply to study or work in Mauritius with an advisor guiding you",
          "Track every stage of your application and each document",
          "Connect with people, join groups and events",
          "Find jobs, internships and remote work",
        ]} />
      </div>
    ),
  },
  {
    id: "application",
    title: "Your application",
    icon: Plane,
    content: (
      <div className="space-y-4">
        <p className={p}>
          Start at <A href="/apply">/apply</A> by choosing Study Abroad or Work Abroad. After you send your initial
          application, our team reviews it. Once it is confirmed you can complete your history, see your personal
          requirements and upload documents.
        </p>
        <List items={[
          "Follow your stage at any time from your application dashboard",
          "Upload PDF, JPG or PNG files up to 10 MB — each document shows its own status",
          "If a correction is needed, you're told exactly what and why, and can re-upload",
          "Message the team from the Messages tab inside your application",
          "Download your final documents when your application is complete",
        ]} />
        <p className={p}>
          See the <A href="/requirements">requirements</A> and the full <A href="/how-it-works">application journey</A>.
        </p>
      </div>
    ),
  },
  {
    id: "profile",
    title: "Profile & verification",
    icon: UserCircle,
    content: (
      <div className="space-y-4">
        <p className={p}>
          Edit your profile at <A href="/dash/profile">My profile</A>. Your public page is <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">/u/your-username</code>.
        </p>
        <List items={[
          "Add a photo, bio, location, skills and links — the Home page shows what is still missing",
          { key: "verify", node: <>Request a verified badge from <A href="/dash/settings">Settings</A> once your profile is complete</> },
          "Connections can endorse your skills on your public profile",
        ]} />
      </div>
    ),
  },
  {
    id: "network",
    title: "Connections & messages",
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <p className={p}>
          Connections are mutual: send a request from someone&apos;s profile, and once they accept you can message each
          other in <A href="/dash/messages">Messages</A>.
        </p>
        <List items={[
          "Only people you've accepted can message you",
          "See read receipts and typing indicators, react to messages and share images",
          "You can remove a connection or block someone at any time",
        ]} />
      </div>
    ),
  },
  {
    id: "community",
    title: "Feed, groups & events",
    icon: Users,
    content: (
      <div className="space-y-4">
        <List items={[
          { key: "feed", node: <>Share updates and photos in the <A href="/dash/feed">Feed</A>, and post stories that disappear after 24 hours</> },
          { key: "groups", node: <>Join or create <A href="/dash/groups">Groups</A> — public, or private by invitation</> },
          { key: "events", node: <>Find meetups and online sessions in <A href="/dash/events">Events</A></> },
          { key: "bookmarks", node: <>Save posts to <A href="/dash/bookmarks">Bookmarks</A> to read later</> },
          "Report any post that breaks the rules — our team reviews every report",
        ]} />
      </div>
    ),
  },
  {
    id: "jobs",
    title: "Jobs & opportunities",
    icon: Briefcase,
    content: (
      <div className="space-y-4">
        <List items={[
          { key: "jobs", node: <>Browse and apply to <A href="/dash/jobs">Jobs</A> and internships, and follow each application</> },
          { key: "remote", node: <>Find <A href="/dash/freelance">remote work</A> and explore <A href="/dash/companies">companies</A></> },
          { key: "services", node: <>Offer your own <A href="/dash/services">services</A></> },
          "Job posts and company pages are reviewed by our team before they appear",
        ]} />
      </div>
    ),
  },
  {
    id: "help",
    title: "Help & support",
    icon: LifeBuoy,
    content: (
      <div className="space-y-4">
        <p className={p}>
          For questions about your application, use the Messages tab inside it. For anything else, open a support
          ticket from <A href="/dash/more?tool=support">More tools</A> or visit the <A href="/contact">contact page</A>.
        </p>
      </div>
    ),
  },
];

export default function DocsContent() {
  const [activeId, setActiveId] = useState(DOC_SECTIONS[0].id);
  const active = DOC_SECTIONS.find((s) => s.id === activeId) || DOC_SECTIONS[0];
  const ActiveIcon = active.icon;

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Help &amp; docs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">How beoneofus works, in plain words.</p>
        </div>
        <Link href="/docs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Full documentation <ArrowRight size={14} />
        </Link>
      </div>

      {/* Mobile: dropdown */}
      <div className="relative md:hidden mb-4">
        <select
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          aria-label="Choose a topic"
          className="w-full h-11 pl-4 pr-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        >
          {DOC_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Desktop: topic list */}
        <nav className="hidden md:block" aria-label="Topics">
          <ul className="space-y-0.5">
            {DOC_SECTIONS.map(({ id, title, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveId(id)}
                  aria-current={id === activeId ? "page" : undefined}
                  className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-left transition-colors ${
                    id === activeId
                      ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-500/15 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Icon size={16} className="shrink-0" /> {title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article key={active.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ActiveIcon size={19} />
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{active.title}</h2>
          </div>
          {active.content}
        </article>
      </div>
    </div>
  );
}
