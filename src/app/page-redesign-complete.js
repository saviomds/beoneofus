"use client";

/**
 * ═════════════════════════════════════════════════════════════════════════
 * BEONEOFUS REDESIGNED HOMEPAGE
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * A world-class developer ecosystem landing page that combines:
 * - LinkedIn's professional networking
 * - GitHub's real contribution tracking
 * - Upwork/Fiverr's opportunities marketplace
 * - Discord's community engagement
 * - Jira/Linear's project management
 * - AI-powered career guidance
 * 
 * The platform enables:
 * ✓ Developers to build real experience and get hired
 * ✓ Companies to find talent through proven track records
 * ✓ Beginner-friendly onboarding for career starters
 * ✓ AI-powered mentoring and career coaching
 * ✓ Community-driven collaboration and growth
 * 
 * Design Principles:
 * - Modern, minimal, professional aesthetic
 * - Enterprise-grade quality and polish
 * - Fast, responsive, accessible
 * - Dark mode optimized
 * - Mobile-first responsive design
 */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

// Icons
import {
  Menu, X, ArrowRight, ChevronDown, ChevronRight,
  Code2, Users, Globe, Bot, Terminal, Zap, Sparkles,
  Briefcase, GraduationCap, BookOpen, Star, Play,
  Shield, Award, CheckCircle2, Handshake, TrendingUp,
  Lock, MessageSquare, FileText, Crown, Heart, Check,
  ShieldCheck, Settings, LayoutDashboard, LogOut, User,
  GitBranch, GitCommit, GitPullRequest, Cpu, Lightning,
  Rocket, Target, BarChart3, PieChart, LineChart, Users2,
  Building2, Clock, Calendar, MapPin, Eye, EyeOff,
  Bell, Search, Plus, Inbox, Gauge, Layers, Layout, Wifi,
  Growth, Smartphone, Brain, Command, AlertTriangle,
  Laptop, ShoppingBag, Trophy, Newspaper, HeartIcon,
  Quote,
} from "lucide-react";

// Import all data and utilities from Part 1
import {
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
} from "./page-redesign-part1";

// Import all section components from Parts 2-4
import {
  HeroSection,
  StatsSection,
  ProblemsSection,
  HowItWorksSection,
} from "./page-redesign-part2";

import {
  FeaturesSection,
  FeaturedProjectsSection,
  AiCapabilitiesSection,
  CompanyPortalSection,
  CommunitySection,
  ComparisonSection,
} from "./page-redesign-part3";

import {
  TestimonialsSection,
  PricingSection,
  FaqSection,
  FinalCtaSection,
  Footer,
} from "./page-redesign-part4";

// Lazy load optional components
const FloatingAiAssistant = dynamic(() => import("./components/FloatingAiAssistant"), { ssr: false });

/**
 * ═════════════════════════════════════════════════════════════════════════
 * NAVIGATION COMPONENT
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Sticky navbar with:
 * - Scroll-aware hide/show effect
 * - Mobile menu toggle
 * - Logo + nav items
 * - CTA buttons
 */
function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY, scrollDirection } = useScrollPosition();
  const isScrolled = scrollY > 50;
  const isHidden = scrollDirection === "down" && scrollY > 300;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHidden ? "-translate-y-full" : "translate-y-0"
      } ${
        isScrolled
          ? "bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-lg text-white hidden sm:inline">
              BeOneOfUs
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/auth/login"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              Log In
            </a>
            <a
              href="/auth/register"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold transition-all"
            >
              Sign Up
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-slate-800">
            <div className="flex flex-col gap-4 py-4">
              {NAV_ITEMS.map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-4"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 px-4 pt-2 border-t border-slate-800">
                <a
                  href="/auth/login"
                  className="flex-1 text-center py-2 text-slate-300 hover:text-white text-sm font-medium"
                >
                  Log In
                </a>
                <a
                  href="/auth/register"
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                >
                  Sign Up
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * ═════════════════════════════════════════════════════════════════════════
 * MAIN PAGE COMPONENT
 * ═════════════════════════════════════════════════════════════════════════
 */
export default function BeOneOfUsHomepage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-lg bg-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <Navbar />

      {/* ──────────────────────────────────────────────────────────────
          PART 1: HERO SECTION
          ────────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ──────────────────────────────────────────────────────────────
          PART 2: STATISTICS
          ────────────────────────────────────────────────────────────── */}
      <StatsSection stats={PLATFORM_STATS} />

      {/* ──────────────────────────────────────────────────────────────
          PART 3: PROBLEMS SECTION
          ────────────────────────────────────────────────────────────── */}
      <ProblemsSection problems={PROBLEMS_SOLVED} />

      {/* ──────────────────────────────────────────────────────────────
          PART 4: HOW IT WORKS
          ────────────────────────────────────────────────────────────── */}
      <HowItWorksSection steps={HOW_IT_WORKS} />

      {/* ──────────────────────────────────────────────────────────────
          PART 5: FEATURES SHOWCASE
          ────────────────────────────────────────────────────────────── */}
      <FeaturesSection categories={PLATFORM_FEATURES} />

      {/* ──────────────────────────────────────────────────────────────
          PART 6: FEATURED PROJECTS
          ────────────────────────────────────────────────────────────── */}
      <FeaturedProjectsSection projects={FEATURED_PROJECTS} />

      {/* ──────────────────────────────────────────────────────────────
          PART 7: AI CAPABILITIES
          ────────────────────────────────────────────────────────────── */}
      <AiCapabilitiesSection capabilities={AI_CAPABILITIES} />

      {/* ──────────────────────────────────────────────────────────────
          PART 8: COMPANY PORTAL
          ────────────────────────────────────────────────────────────── */}
      <CompanyPortalSection features={COMPANY_FEATURES} />

      {/* ──────────────────────────────────────────────────────────────
          PART 9: COMMUNITY
          ────────────────────────────────────────────────────────────── */}
      <CommunitySection features={COMMUNITY_FEATURES} />

      {/* ──────────────────────────────────────────────────────────────
          PART 10: COMPARISON (WHY BEONEOFUS)
          ────────────────────────────────────────────────────────────── */}
      <ComparisonSection />

      {/* ──────────────────────────────────────────────────────────────
          PART 11: TESTIMONIALS
          ────────────────────────────────────────────────────────────── */}
      <TestimonialsSection testimonials={TESTIMONIALS} />

      {/* ──────────────────────────────────────────────────────────────
          PART 12: PRICING
          ────────────────────────────────────────────────────────────── */}
      <PricingSection plans={PRICING_PLANS} />

      {/* ──────────────────────────────────────────────────────────────
          PART 13: FAQ
          ────────────────────────────────────────────────────────────── */}
      <FaqSection faqItems={FAQ} />

      {/* ──────────────────────────────────────────────────────────────
          PART 14: FINAL CTA
          ────────────────────────────────────────────────────────────── */}
      <FinalCtaSection />

      {/* ──────────────────────────────────────────────────────────────
          FOOTER
          ────────────────────────────────────────────────────────────── */}
      <Footer />

      {/* Floating AI Assistant (optional) */}
      <FloatingAiAssistant />
    </div>
  );
}
