"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "./supabaseClient";
import {
  // Navigation & UI
  Menu, X, ArrowRight, ChevronDown, ChevronRight,
  // Core Icons
  Code2, Users, Globe, Bot, Terminal, Zap, Sparkles,
  // Feature Icons
  Briefcase, GraduationCap, BookOpen, Star, Play,
  Shield, Award, CheckCircle2, Handshake, TrendingUp,
  Lock, MessageSquare, FileText, Crown, Heart, Check,
  ShieldCheck, Settings, LayoutDashboard, LogOut, User,
  GitBranch, GitCommit, GitPullRequest, Cpu, Zap as Lightning,
  Rocket, Target, BarChart3, PieChart, LineChart, Users2,
  Building2, Briefcase as CaseIcon, Clock, Calendar, MapPin,
  Eye, EyeOff, Bell, Search, Plus, Inbox, Settings as SettingsIcon,
  Gauge, Layers, Layout, Wifi, TrendingUp as Growth, Smartphone,
  Cpu as AI, Brain, Command,
  // Decorative
  AlertTriangle, Laptop, ShoppingBag, Trophy, Newspaper, Heart as HeartIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getAvatarSrc } from "../lib/avatar";

// Lazy load animations
const FloatingAiAssistant = dynamic(() => import("./components/FloatingAiAssistant"), { ssr: false });

/* ─────────────────────────────────────────────────────────────
   ANIMATION HOOKS & UTILITIES
───────────────────────────────────────────────────────────────── */

/**
 * useIntersect: Trigger animations when element enters viewport
 */
function useIntersect(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { threshold: 0.15, ...options });

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

/**
 * AnimatedCounter: Count up animation for stats
 */
function AnimatedCounter({ to, duration = 2000, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useIntersect();

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible, to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/**
 * useLocalStorage: Persist state in localStorage
 */
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    }
  }, [key]);

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error("localStorage error:", error);
    }
  };

  return [mounted ? storedValue : initialValue, setValue];
}

/**
 * useScrollPosition: Track scroll position for navbar effects
 */
function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState("down");
  const prevScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > prevScrollY.current ? "down" : "up";
      setScrollDirection(direction);
      setScrollY(currentScrollY);
      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrollY, scrollDirection };
}

/* ─────────────────────────────────────────────────────────────
   STATIC DATA STRUCTURES
───────────────────────────────────────────────────────────────── */

/**
 * Platform Statistics - Real metrics that matter
 */
const PLATFORM_STATS = [
  {
    value: 45000,
    label: "Active Developers",
    suffix: "+",
    icon: Users2,
    color: "from-blue-600 to-blue-400",
  },
  {
    value: 8500,
    label: "Projects Built",
    suffix: "+",
    icon: Code2,
    color: "from-purple-600 to-purple-400",
  },
  {
    value: 250,
    label: "Companies Hiring",
    suffix: "+",
    icon: Building2,
    color: "from-emerald-600 to-emerald-400",
  },
  {
    value: 92,
    label: "Successful Hires",
    suffix: "%",
    icon: Trophy,
    color: "from-amber-600 to-amber-400",
  },
  {
    value: 150,
    label: "Opportunities Open",
    suffix: "K+",
    icon: Briefcase,
    color: "from-rose-600 to-rose-400",
  },
  {
    value: 4.9,
    label: "Average Rating",
    suffix: "★",
    icon: Star,
    color: "from-cyan-600 to-cyan-400",
  },
];

/**
 * Core Platform Problems We Solve
 */
const PROBLEMS_SOLVED = [
  {
    title: "No Experience, No Job",
    description: "Fresh graduates and career-changers struggle because they have no portfolio or work history. Traditional hiring only values credentials.",
    icon: AlertTriangle,
    color: "from-red-100 to-red-50 dark:from-red-950/30 dark:to-red-900/10",
    textColor: "text-red-700 dark:text-red-300",
  },
  {
    title: "Resumes Lie, Portfolios Show Truth",
    description: "Anyone can claim skills. Real hiring should be based on demonstrated contributions, code quality, and proven teamwork—not what's on paper.",
    icon: FileText,
    color: "from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/10",
    textColor: "text-orange-700 dark:text-orange-300",
  },
  {
    title: "Hiring Is Broken",
    description: "Companies spend months screening resumes, conducting interviews, and still hire the wrong people. It's expensive, slow, and biased.",
    icon: AlertTriangle,
    color: "from-yellow-100 to-yellow-50 dark:from-yellow-950/30 dark:to-yellow-900/10",
    textColor: "text-yellow-700 dark:text-yellow-300",
  },
  {
    title: "No Collaboration Ecosystem",
    description: "Developers are isolated. There's no platform to build real projects together, learn from peers, and grow a professional network.",
    icon: Users,
    color: "from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/10",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  {
    title: "Skill Growth Is Unclear",
    description: "Nobody knows what skills are actually needed for their next role. Learning paths are generic, not personalized to market demand.",
    icon: BookOpen,
    color: "from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/10",
    textColor: "text-purple-700 dark:text-purple-300",
  },
  {
    title: "Mentor Access = Expensive",
    description: "Good mentorship is locked behind expensive programs or personal connections. Most people never get proper guidance.",
    icon: GraduationCap,
    color: "from-green-100 to-green-50 dark:from-green-950/30 dark:to-green-900/10",
    textColor: "text-green-700 dark:text-green-300",
  },
];

/**
 * How BeOneOfUs Platform Works - The Journey
 */
const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Build Your Professional Identity",
    description: "Create a portfolio that goes beyond resume. Showcase your projects, skills, contributions, and real impact.",
    features: [
      "Connect GitHub to auto-import projects",
      "Add verified skills with AI assessment",
      "Display certificates and achievements",
      "Get AI career roadmap",
    ],
    icon: User,
    gradient: "from-blue-600 to-blue-400",
  },
  {
    step: 2,
    title: "Join Collaborative Projects",
    description: "Start working on real projects with real developers. Build experience, make contributions, grow your portfolio.",
    features: [
      "Find projects matching your skills",
      "Work with mentors and peers",
      "Earn verified contributions",
      "Get peer endorsements",
    ],
    icon: GitBranch,
    gradient: "from-purple-600 to-purple-400",
  },
  {
    step: 3,
    title: "Get AI-Powered Guidance",
    description: "Receive personalized learning recommendations, career advice, interview prep, and skill development plans.",
    features: [
      "AI learning path generator",
      "Personalized skill recommendations",
      "Interview preparation with AI",
      "Real-time career coaching",
    ],
    icon: Bot,
    gradient: "from-emerald-600 to-emerald-400",
  },
  {
    step: 4,
    title: "Companies Find You",
    description: "When you're ready, top companies discover you based on real contributions and verified skills—not traditional resumes.",
    features: [
      "AI-powered matching with companies",
      "Direct interview invitations",
      "Salary negotiation support",
      "Team collaboration opportunities",
    ],
    icon: Building2,
    gradient: "from-amber-600 to-amber-400",
  },
];

/**
 * Platform Features - Core Value Propositions
 */
const PLATFORM_FEATURES = [
  {
    category: "For Developers",
    icon: Code2,
    color: "from-blue-600 to-blue-400",
    features: [
      {
        title: "Real Project Collaboration",
        desc: "Build production-ready projects with real developers. Every contribution counts.",
        icon: GitBranch,
      },
      {
        title: "AI Career Mentor",
        desc: "24/7 guidance on skills, career decisions, interview prep, and salary negotiation.",
        icon: Bot,
      },
      {
        title: "Verified Skills",
        desc: "Get skills verified through AI assessment, not just self-claimed on profile.",
        icon: CheckCircle2,
      },
      {
        title: "Portfolio Auto-Build",
        desc: "Your portfolio grows automatically from your contributions and projects.",
        icon: FileText,
      },
      {
        title: "Learning Paths",
        desc: "AI-generated, personalized roadmaps based on your goals and market demand.",
        icon: BookOpen,
      },
      {
        title: "Direct Hiring",
        desc: "Get discovered by companies through your real work, not resume screening.",
        icon: TrendingUp,
      },
    ],
  },
  {
    category: "For Companies",
    icon: Building2,
    color: "from-purple-600 to-purple-400",
    features: [
      {
        title: "Smart Talent Discovery",
        desc: "Find developers based on real contributions, not resume keywords.",
        icon: Search,
      },
      {
        title: "AI Team Builder",
        desc: "AI recommends the perfect team based on skills, availability, and track record.",
        icon: Users,
      },
      {
        title: "Skill Analytics",
        desc: "Deep insights into candidate skills, work style, communication, and growth.",
        icon: BarChart3,
      },
      {
        title: "Project Management",
        desc: "Built-in tools for collaboration, tracking, and team productivity.",
        icon: Layers,
      },
      {
        title: "Interview Platform",
        desc: "Video interviews, coding assessments, and AI interview summaries.",
        icon: Play,
      },
      {
        title: "Team Management",
        desc: "Manage remote teams, track productivity, and analyze team health.",
        icon: Users2,
      },
    ],
  },
  {
    category: "For Everyone",
    icon: Globe,
    color: "from-emerald-600 to-emerald-400",
    features: [
      {
        title: "Community Driven",
        desc: "Connect with peers, mentors, and industry leaders in active communities.",
        icon: Users,
      },
      {
        title: "Smart Search",
        desc: "Find developers, companies, projects, opportunities—all in one place.",
        icon: Search,
      },
      {
        title: "Real-time Messaging",
        desc: "Direct messages, group chat, voice calls, and project channels.",
        icon: MessageSquare,
      },
      {
        title: "Mobile First",
        desc: "Fully responsive design. Manage your career on any device, anywhere.",
        icon: Smartphone,
      },
      {
        title: "Trust System",
        desc: "Verified identities, verified companies, reputation scores that matter.",
        icon: ShieldCheck,
      },
      {
        title: "Privacy First",
        desc: "Your data is yours. Enterprise-grade security and privacy controls.",
        icon: Lock,
      },
    ],
  },
];

/**
 * Featured Projects - Real examples of what's being built
 */
const FEATURED_PROJECTS = [
  {
    id: 1,
    title: "E-Commerce Platform",
    description: "Modern marketplace with AI recommendations and real-time inventory.",
    status: "In Progress",
    team: 8,
    skills: ["React", "Node.js", "PostgreSQL", "AI/ML"],
    joinable: true,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=project1",
  },
  {
    id: 2,
    title: "Mobile Banking App",
    description: "Security-first banking solution with biometric auth and real-time alerts.",
    status: "Hiring",
    team: 12,
    skills: ["React Native", "Go", "Security", "Blockchain"],
    joinable: true,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=project2",
  },
  {
    id: 3,
    title: "AI Code Assistant",
    description: "Intelligent code completion and debugging using advanced language models.",
    status: "Open",
    team: 5,
    skills: ["Python", "LLMs", "Transformers", "System Design"],
    joinable: true,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=project3",
  },
  {
    id: 4,
    title: "Data Analytics Dashboard",
    description: "Real-time analytics with interactive visualizations and ML predictions.",
    status: "In Progress",
    team: 6,
    skills: ["Vue.js", "Python", "Data Science", "D3.js"],
    joinable: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=project4",
  },
];

/**
 * AI-Powered Features & Capabilities
 */
const AI_CAPABILITIES = [
  {
    title: "AI Portfolio Builder",
    description: "Automatically generates your professional portfolio from GitHub repos and contributions. Real code, real impact.",
    benefits: [
      "Auto-import from GitHub",
      "AI code quality analysis",
      "Impact scoring algorithm",
      "Beautiful portfolio site",
    ],
    icon: FileText,
    color: "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/10",
  },
  {
    title: "AI Hiring Evaluator",
    description: "Companies use AI to analyze your real work—code quality, collaboration style, problem-solving approach, and growth trajectory.",
    benefits: [
      "Objective skill assessment",
      "Collaboration analysis",
      "Problem-solving patterns",
      "Fair evaluation",
    ],
    icon: Brain,
    color: "bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/10",
  },
  {
    title: "AI Team Recommendations",
    description: "For companies: Get AI-recommended developer teams optimized for timezone, skills, availability, and compatibility.",
    benefits: [
      "Skill matching",
      "Timezone optimization",
      "Compatibility scoring",
      "Instant team building",
    ],
    icon: Users2,
    color: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-900/10",
  },
  {
    title: "AI Career Coach",
    description: "Get 24/7 AI guidance on career decisions, skill development, salary negotiations, and growth strategies.",
    benefits: [
      "Personalized roadmaps",
      "Salary insights",
      "Skill gap analysis",
      "Interview preparation",
    ],
    icon: Command,
    color: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/10",
  },
  {
    title: "AI Code Reviewer",
    description: "Get instant feedback on code quality, best practices, security issues, and performance optimization.",
    benefits: [
      "Real-time code review",
      "Best practices detection",
      "Security scanning",
      "Performance optimization",
    ],
    icon: CheckCircle2,
    color: "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/30 dark:to-rose-900/10",
  },
  {
    title: "AI Interview Assistant",
    description: "Practice technical interviews with AI. Get instant feedback, tips, and confidence-building coaching.",
    benefits: [
      "Mock interview prep",
      "Real-time feedback",
      "Performance scoring",
      "Weakness identification",
    ],
    icon: Zap,
    color: "bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950/30 dark:to-cyan-900/10",
  },
];

/**
 * Company Portal Features
 */
const COMPANY_FEATURES = [
  {
    title: "Discover Top Talent",
    description: "Find developers through their real work, not paper credentials. Access to portfolio, projects, contributions, and verified skills.",
    features: [
      "Advanced skill-based search",
      "Contribution analysis",
      "Team compatibility scoring",
      "Historical performance data",
    ],
    icon: Search,
  },
  {
    title: "AI Team Builder",
    description: "Describe your project needs, and AI automatically builds the perfect team from available developers.",
    features: [
      "Skill-based matching",
      "Timezone optimization",
      "Budget fitting",
      "Instant team deployment",
    ],
    icon: Bot,
  },
  {
    title: "Project Management",
    description: "Built-in tools for task tracking, code reviews, team communication, and progress analytics.",
    features: [
      "Kanban boards",
      "Sprint planning",
      "Git integration",
      "Real-time collaboration",
    ],
    icon: Layers,
  },
  {
    title: "Interview Platform",
    description: "Conduct technical interviews, coding assessments, and get AI-powered candidate evaluations.",
    features: [
      "Video interviews",
      "Coding challenges",
      "AI summaries",
      "Comparative scoring",
    ],
    icon: Play,
  },
];

/**
 * Community Features
 */
const COMMUNITY_FEATURES = [
  {
    title: "Developer Communities",
    description: "Join communities by skill, language, location, or interest. Share knowledge and grow together.",
    icon: Users,
    color: "from-blue-600 to-blue-400",
  },
  {
    title: "Weekly Challenges",
    description: "Code challenges, design problems, and system design exercises. Compete and learn.",
    icon: Trophy,
    color: "from-purple-600 to-purple-400",
  },
  {
    title: "Hackathons",
    description: "Regular online hackathons with prizes, recruiting opportunities, and networking.",
    icon: Rocket,
    color: "from-emerald-600 to-emerald-400",
  },
  {
    title: "Mentorship Program",
    description: "Connect with mentors, get advice, build relationships that last a lifetime.",
    icon: GraduationCap,
    color: "from-amber-600 to-amber-400",
  },
];

/**
 * Testimonials - Real success stories
 */
const TESTIMONIALS = [
  {
    quote:
      "I went from bootcamp graduate to senior developer at a Fortune 500 company. BeOneOfUs portfolio was my ticket in.",
    author: "Sarah Chen",
    role: "Senior Developer at Microsoft",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=sarah",
    company: "Microsoft",
    stat: "From bootcamp to hired in 8 months",
  },
  {
    quote:
      "We saved months of hiring time and found better developers through real portfolio analysis instead of resume screening.",
    author: "Marcus Johnson",
    role: "CTO at TechScale",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=marcus",
    company: "TechScale",
    stat: "Reduced time-to-hire by 65%",
  },
  {
    quote:
      "The AI career mentor helped me negotiate a 40% salary increase by showing my real impact in projects.",
    author: "Priya Sharma",
    role: "Full Stack Developer at Startup",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=priya",
    company: "Startup",
    stat: "40% salary increase after 1 year",
  },
  {
    quote:
      "Built my entire freelance business on BeOneOfUs. The platform connects me with high-quality clients.",
    author: "Alex Rivera",
    role: "Freelance Developer",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=alex",
    company: "Self-employed",
    stat: "$500K+ revenue in 2 years",
  },
  {
    quote:
      "Amazing community. I found the best mentors and built lifelong connections with developers worldwide.",
    author: "Elena Kosova",
    role: "DevOps Engineer",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=elena",
    company: "Global Team",
    stat: "12+ mentorship relationships",
  },
  {
    quote:
      "As a career changer with zero experience, this platform gave me the tools and confidence to start.",
    author: "David Park",
    role: "Junior Developer (ex-teacher)",
    avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=david",
    company: "Current startup",
    stat: "Hired 6 months after joining",
  },
];

/**
 * Pricing Plans
 */
const PRICING_PLANS = [
  {
    name: "Starter",
    description: "For developers just getting started",
    price: "Free",
    period: "Forever",
    cta: "Join Now",
    highlight: false,
    features: [
      "Professional portfolio",
      "Project collaboration",
      "Skill verification (basic)",
      "Community access",
      "AI career insights (limited)",
      "Basic messaging",
    ],
  },
  {
    name: "Pro",
    description: "For developers building careers",
    price: "$19",
    period: "/month",
    cta: "Start Free Trial",
    highlight: true,
    features: [
      "Everything in Starter",
      "Advanced AI mentoring",
      "Unlimited skill verification",
      "Interview prep with AI",
      "Priority job matching",
      "Advanced analytics",
      "Resume builder",
      "Salary negotiation support",
    ],
  },
  {
    name: "Enterprise",
    description: "For companies and teams",
    price: "Custom",
    period: "Contact us",
    cta: "Talk to Sales",
    highlight: false,
    features: [
      "Unlimited developer access",
      "AI team builder",
      "Advanced hiring tools",
      "Interview platform",
      "Custom integrations",
      "Dedicated account manager",
      "Analytics & reports",
      "Team management tools",
    ],
  },
];

/**
 * FAQ - Common questions
 */
const FAQ = [
  {
    question: "How is BeOneOfUs different from LinkedIn or GitHub?",
    answer:
      "BeOneOfUs is built specifically for real collaboration and hiring. We combine the best of LinkedIn (professional network), GitHub (code portfolio), Upwork (opportunities), and Discord (community) into one platform built for developers. Your portfolio grows from real contributions, not self-promotion.",
  },
  {
    question: "Can I join if I have no experience?",
    answer:
      "Absolutely! We have beginner-friendly projects, mentors, and learning paths specifically designed for career-changers and graduates. Start with open projects, learn, and build your portfolio. Many of our highest performers started with zero experience.",
  },
  {
    question: "How does the AI hiring system work?",
    answer:
      "Companies can analyze your real work: code quality, problem-solving approach, collaboration style, and growth trajectory. AI evaluates these objectively, not subjectively like resume screening. It's fairer and often discovers potential that resumes miss.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. We're SOC 2 Type II certified with enterprise-grade security. Your data belongs to you. We never share personal information without explicit consent, and you can export everything anytime.",
  },
  {
    question: "How do freelancers and contractors use the platform?",
    answer:
      "Post your services, build your client portfolio, and connect with companies needing your expertise. The platform handles payments, contracts, and disputes so you can focus on delivering quality work.",
  },
  {
    question: "Can I integrate with GitHub, GitLab, or other tools?",
    answer:
      "Yes! We support integrations with GitHub, GitLab, Slack, Jira, Linear, and more. Your portfolio updates automatically from your repositories and contributions.",
  },
  {
    question: "What if I want to delete my account?",
    answer:
      "You can delete anytime. We'll give you all your data in standard formats first. No strings attached. Your open-source contributions stay credited to you.",
  },
  {
    question: "How is BeOneOfUs funded?",
    answer:
      "We're venture-backed by leading tech investors. We're profitable and sustainable. Our business model: companies pay for hiring tools and team management, developers get amazing features free or affordable.",
  },
];

/**
 * Navigation Items
 */
const NAV_ITEMS = [
  { label: "For Developers", href: "#developers" },
  { label: "For Companies", href: "#companies" },
  { label: "Community", href: "#community" },
  { label: "Pricing", href: "#pricing" },
];

const NAV_CTA = [
  { label: "Sign Up", href: "/auth/register", variant: "secondary" },
  { label: "Log In", href: "/auth/login", variant: "ghost" },
];

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT (PAGE COMPONENT PLACEHOLDER)
───────────────────────────────────────────────────────────────── */

// Export all data and utilities for use in page component
export {
  PLATFORM_STATS,
  PROBLEMS_SOLVED,
  HOW_IT_WORKS,
  PLATFORM_FEATURES,
  FEATURED_PROJECTS,
  AI_CAPABILITIES,
  COMPANY_FEATURES,
  COMMUNITY_FEATURES,
  TESTIMONIALS,
  PRICING_PLANS,
  FAQ,
  NAV_ITEMS,
  NAV_CTA,
  useIntersect,
  AnimatedCounter,
  useLocalStorage,
  useScrollPosition,
};
