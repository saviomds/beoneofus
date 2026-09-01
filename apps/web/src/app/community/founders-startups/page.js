"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
  Terminal, ArrowLeft, Users, Zap, TrendingUp, BookOpen, Briefcase,
  Star, ChevronRight, MessageSquare, Hash, Rocket, DollarSign,
  Globe, Target, BarChart3, Lightbulb, Award, GitBranch,
  CheckCircle2, Handshake, Shield, ArrowUpRight,
} from "lucide-react";

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const TOPICS = [
  { icon: <Rocket size={18} />,    label: "Idea Validation",     color: "emerald", desc: "Early-stage validation, customer discovery, MVP scoping",        href: "/dash/groups" },
  { icon: <DollarSign size={18} />,label: "Fundraising & VC",    color: "amber",   desc: "Seed rounds, pitch decks, investor relations, cap tables",       href: "/dash/groups" },
  { icon: <BarChart3 size={18} />, label: "Startup Growth",      color: "blue",    desc: "Product-market fit, growth metrics, scaling strategies",         href: "/dash/groups" },
  { icon: <Target size={18} />,    label: "Product Strategy",    color: "violet",  desc: "Roadmapping, pricing, positioning, user research",               href: "/dash/groups" },
  { icon: <Globe size={18} />,     label: "Go-To-Market",        color: "rose",    desc: "Launch playbooks, channels, partnerships, distribution",         href: "/dash/groups" },
  { icon: <Shield size={18} />,    label: "Legal & Operations",  color: "indigo",  desc: "Incorporation, contracts, IP, team equity, compliance",          href: "/dash/groups" },
  { icon: <Handshake size={18} />, label: "Co-founder Matching", color: "orange",  desc: "Finding co-founders, roles, vesting, early team building",       href: "/dash/groups" },
  { icon: <Lightbulb size={18} />, label: "SaaS & Bootstrapping",color: "teal",    desc: "Profitable products, no-VC path, MRR milestones, churn",         href: "/dash/groups" },
];

const PLATFORM_FEATURES = [
  { icon: <MessageSquare size={16} />, label: "Live Community",    desc: "Real-time founder discussions",        href: "/dash/more?tool=community", color: "emerald" },
  { icon: <Users size={16} />,         label: "Groups",            desc: "Founder & startup-specific groups",    href: "/dash/groups",              color: "teal"    },
  { icon: <Briefcase size={16} />,     label: "Job Board",         desc: "Startup roles & co-founder search",    href: "/dash/more",                color: "amber"   },
  { icon: <Award size={16} />,         label: "Mentorship",        desc: "1-on-1 with experienced founders",     href: "/dash/connections",          color: "violet"  },
  { icon: <Handshake size={16} />,     label: "Partnerships",      desc: "Find business partners & investors",   href: "/dash/partnerships",        color: "blue"    },
  { icon: <TrendingUp size={16} />,    label: "Leaderboard",       desc: "Most active community builders",       href: "/dash/leaderboard",         color: "rose"    },
  { icon: <GitBranch size={16} />,     label: "Projects",          desc: "Showcase your startup publicly",       href: "/Explore_Projects",         color: "indigo"  },
  { icon: <Zap size={16} />,           label: "Events",            desc: "Demo days, AMAs & founder talks",      href: "/dash/events",              color: "orange"  },
];

const INCOME_PATHS = [
  { title: "Bootstrapped SaaS Founder",      range: "$50k–$10M+ ARR",    note: "Own 100%, profitable from day 1",          icon: <Rocket size={20} />,    color: "emerald", href: "/dash/more"               },
  { title: "VC-Backed Startup Founder",      range: "Equity exit: $1M+", note: "High risk, potentially life-changing",     icon: <TrendingUp size={20} />, color: "blue",    href: "/dash/partnerships"       },
  { title: "Startup Advisor / Angel",        range: "$5k–$50k + equity", note: "Help others, earn equity stakes",          icon: <Star size={20} />,      color: "amber",   href: "/dash/connections"         },
  { title: "Head of Product at Startup",     range: "$100k–$200k+",      note: "Shape product at growing companies",       icon: <Target size={20} />,    color: "violet",  href: "/dash/more"               },
  { title: "Startup Consultant",             range: "$150–$500/hr",      note: "Strategy, fundraising, growth help",       icon: <Briefcase size={20} />, color: "rose",    href: "/dash/services"           },
];

const RESOURCES = [
  { title: "Startup Fundraising Playbook",   type: "Guide",       link: "/resources",                  icon: <BookOpen size={14} />   },
  { title: "MVP Builder Toolkit",            type: "Course",      link: "/resources",                  icon: <Rocket size={14} />     },
  { title: "Startup Project Showcase",       type: "Projects",    link: "/Explore_Projects",         icon: <GitBranch size={14} />  },
  { title: "Startup & Founder Jobs",         type: "Jobs",        link: "/dash/more",                icon: <Briefcase size={14} />  },
  { title: "Earn Startup Certificate",       type: "Certificate", link: "/dash/more?tool=community", icon: <Award size={14} />      },
  { title: "Find Co-founders",               type: "Network",     link: "/dash/connections",         icon: <Users size={14} />      },
];

const OTHER_HUBS = [
  { label: "Tech & Engineering",  href: "/community/tech-engineering",  color: "blue"   },
  { label: "Design & Creativity", href: "/community/design-creativity", color: "violet" },
  { label: "Marketing & Growth",  href: "/community/marketing-growth",  color: "amber"  },
  { label: "Finance & Business",  href: "/community/finance-business",  color: "indigo" },
  { label: "Education & Research",href: "/community",color: "rose"   },
];

const colorMap = {
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-100 dark:border-blue-800/30",    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-600 dark:text-violet-400", border: "border-violet-100 dark:border-violet-800/30", badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-800/30", badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-100 dark:border-amber-800/30",  badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-100 dark:border-indigo-800/30", badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-900/20",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-100 dark:border-rose-800/30",    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
  orange:  { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-800/30", badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  teal:    { bg: "bg-teal-50 dark:bg-teal-900/20",    text: "text-teal-600 dark:text-teal-400",    border: "border-teal-100 dark:border-teal-800/30",    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" },
};

export default function FoundersStartupsCommunity() {
  const [activeTab, setActiveTab] = useState("trending");

  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("groups").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
    ]).then(([profiles, groups, projects]) => {
      setStats({ members: profiles.count ?? 0, groups: groups.count ?? 0, projects: projects.count ?? 0 });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      <nav className="fixed top-0 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/community" className="text-sm font-semibold text-gray-500 hover:text-emerald-600 flex items-center gap-1.5 shrink-0 transition-colors"><ArrowLeft size={15} /> Community</Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm font-bold truncate">Founders & Startups</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dash/more?tool=community" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"><MessageSquare size={14} /> Open Hub</Link>
            <Link href="/auth" className="flex items-center gap-2 px-4 py-2 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Users size={14} /> Join Free</Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" /> {stats ? `${fmtCount(stats.members)} members` : "Growing community"} · Join Free
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 leading-tight">Founders &<br />Startups</h1>
                <p className="text-emerald-100 text-lg sm:text-xl max-w-2xl leading-relaxed">
                  The go-to community for builders who ship. Get honest feedback on your idea, find co-founders, navigate fundraising, and connect with those who&apos;ve done it before.
                </p>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/dash/more?tool=community" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors text-sm shadow-lg shadow-emerald-900/20"><MessageSquare size={16} /> Enter Community Hub</Link>
                  <Link href="/Explore_Projects" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-sm"><Rocket size={16} /> See Startups</Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-72 shrink-0">
                {[
                  { label: "Members",  key: "members",  Icon: Users },
                  { label: "Groups",   key: "groups",   Icon: Hash },
                  { label: "Projects", key: "projects", Icon: GitBranch },
                  { label: "Live Hub", key: null,       Icon: MessageSquare },
                ].map(({ label, key, Icon }) => (
                  <div key={label} className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                    <Icon size={18} className="text-emerald-200 mb-2" />
                    <p className="text-2xl font-black">{key ? (stats ? fmtCount(stats[key]) : "—") : "Open"}</p>
                    <p className="text-[11px] text-emerald-200 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black tracking-tight flex items-center gap-2"><Hash size={18} className="text-emerald-500" /> Sub-Communities</h2>
                  <Link href="/dash/groups" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">All groups <ChevronRight size={12} /></Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOPICS.map(({ icon, label, color, desc, href }) => {
                    const c = colorMap[color] || colorMap.emerald;
                    return (
                      <Link key={label} href={href} className={`flex items-start gap-4 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Live Community Hub CTA */}
              <section>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-6 text-center">
                  <MessageSquare size={28} className="text-blue-500 mx-auto mb-3" />
                  <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">Real discussions happen inside</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Join the live community hub to see and participate in real conversations from real members.</p>
                  <Link href="/dash/more?tool=community" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors">
                    <MessageSquare size={14} /> Open Community Hub
                  </Link>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Inside the Platform</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Every tool available to Founders & Startups hub members.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLATFORM_FEATURES.map(({ icon, label, desc, href, color }) => {
                    const c = colorMap[color] || colorMap.emerald;
                    return (
                      <Link key={label} href={href} className={`flex flex-col gap-2.5 p-4 rounded-2xl border ${c.border} bg-white dark:bg-gray-900 hover:shadow-md transition-all group`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>{icon}</div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{label}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2"><DollarSign size={18} className="text-emerald-500" /> Career & Income Paths</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">How founders in this community generate income. Click any path to explore opportunities.</p>
                <div className="space-y-3">
                  {INCOME_PATHS.map(({ title, range, note, icon, color, href }) => {
                    const c = colorMap[color] || colorMap.emerald;
                    return (
                      <Link key={title} href={href} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-md hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all group">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>{icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{note}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${c.badge}`}>{range}</span>
                          <ArrowUpRight size={14} className="text-gray-300 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
                <h3 className="font-black text-lg mb-2">Join the Community</h3>
                <p className="text-emerald-100 text-sm mb-4 leading-relaxed">Fundraising templates, pitch deck reviews, co-founder matching, investor network access.</p>
                <Link href="/auth" className="block text-center py-2.5 bg-white text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-50 transition-colors">Create Free Account</Link>
                <Link href="/dash/more?tool=community" className="block text-center py-2 text-emerald-200 text-xs font-semibold mt-2 hover:text-white transition-colors">Already a member? Open hub →</Link>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Resources</h3>
                <div className="space-y-2">
                  {RESOURCES.map(({ title, type, link, icon }) => (
                    <Link key={title} href={link} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors">
                      <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">{title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{type}</p>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 group-hover:text-emerald-400 shrink-0" />
                    </Link>
                  ))}
                  <Link href="/resources" className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">All Resources <ChevronRight size={11} /></Link>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Live Community Hub",    href: "/dash/more?tool=community", icon: <MessageSquare size={14} /> },
                    { label: "Startup Jobs Board",    href: "/dash/more",                icon: <Briefcase size={14} /> },
                    { label: "Join Founder Groups",   href: "/dash/groups",              icon: <Users size={14} /> },
                    { label: "Find Partners",         href: "/dash/partnerships",        icon: <Handshake size={14} /> },
                    { label: "Startup Courses",       href: "/resources",                  icon: <BookOpen size={14} /> },
                    { label: "Get Mentored",          href: "/dash/connections",          icon: <Award size={14} /> },
                    { label: "Showcase Startup",      href: "/Explore_Projects",         icon: <Rocket size={14} /> },
                    { label: "Coaching Sessions",     href: "/dash/connections",            icon: <Star size={14} /> },
                  ].map(({ label, href, icon }) => (
                    <Link key={label} href={href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all font-medium group">
                      <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">{icon}</span> {label}
                      <ChevronRight size={12} className="ml-auto text-gray-300 group-hover:text-emerald-400 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Other Hubs</h3>
                <div className="space-y-1.5">
                  {OTHER_HUBS.map(({ label, href }) => (
                    <Link key={label} href={href} className="flex items-center px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-black text-lg flex items-center gap-2"><Terminal size={20} className="text-blue-500" /> beone<span className="text-blue-600">of</span>us</Link>
          <div className="flex flex-wrap justify-center gap-4">
            {[{ l: "Community", h: "/community" }, { l: "Resources", h: "/resources" }, { l: "Academy", h: "/resources" }, { l: "Projects", h: "/Explore_Projects" }, { l: "Blog", h: "/blog" }].map(({ l, h }) => (
              <Link key={l} href={h} className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">{l}</Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} beoneofus</p>
        </div>
      </footer>
    </div>
  );
}
