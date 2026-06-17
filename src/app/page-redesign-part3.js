/**
 * PART 3: FEATURES + PROJECTS + AI + COMPANY PORTAL + COMMUNITY
 * ─────────────────────────────────────────────────────────────
 * Features: Comprehensive feature showcase (For Developers, Companies, Everyone)
 * Projects: Featured projects developers can join
 * AI: AI-powered capabilities
 * Company: Company portal preview
 * Community: Community and engagement features
 */

import { useEffect, useState, useRef } from "react";
import {
  ArrowRight, ChevronRight, CheckCircle2, Zap, Bot,
  Code2, Users, Globe, Building2, Search, FileText,
  BookOpen, GraduationCap, GitBranch, Play, Layers,
  BarChart3, Users2, Trophy, Rocket, MessageSquare,
  Smartphone, ShieldCheck, Lock, Brain, Command,
  Briefcase, Clock, MapPin, Eye, Bell, Settings,
  Plus, Inbox, LayoutDashboard, Gauge,
} from "lucide-react";

/**
 * ─────────────────────────────────────────────────────────────
 * FEATURES SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Three main categories:
 * 1. For Developers - career growth, projects, AI mentoring
 * 2. For Companies - hiring, team building, management
 * 3. For Everyone - community, search, messaging
 */
export function FeaturesSection({ categories }) {
  const [activeCategory, setActiveCategory] = useState(0);

  const activeFeatures = categories[activeCategory]?.features || [];

  return (
    <section className="py-20 bg-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Powerful Features for Every Role
          </h2>
          <p className="text-lg text-slate-300">
            Everything you need to build, collaborate, and grow
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category, idx) => {
            const IconComponent = category.icon;
            return (
              <button
                key={idx}
                onClick={() => setActiveCategory(idx)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
                  activeCategory === idx
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <IconComponent size={20} />
                {category.category}
              </button>
            );
          })}
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeFeatures.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-300"
              >
                {/* Icon */}
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 w-fit mb-4 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                  <IconComponent size={24} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-300 mb-4">{feature.desc}</p>

                {/* Arrow */}
                <div className="flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all">
                  <span className="text-sm font-medium">Learn more</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * FEATURED PROJECTS SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Real projects developers can join
 * Shows collaboration in action
 */
export function FeaturedProjectsSection({ projects }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Projects You Can Join Today
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Real work building real products with real teams
          </p>
          <a
            href="/projects"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold"
          >
            Browse all projects
            <ArrowRight size={18} />
          </a>
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {projects.slice(0, 4).map((project, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative p-6 rounded-xl border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {project.title}
                    </h3>
                    <p className="text-slate-300 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  {project.avatar && (
                    <img
                      src={project.avatar}
                      alt={project.title}
                      className="w-12 h-12 rounded-lg ml-4 flex-shrink-0"
                    />
                  )}
                </div>

                {/* Status & team */}
                <div className="flex items-center gap-4 mb-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-sm">
                    <Users size={16} />
                    <span>{project.team} contributors</span>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {project.skills.slice(0, 3).map((skill, sidx) => (
                    <span
                      key={sidx}
                      className="px-2 py-1 text-xs rounded-md bg-slate-700/30 text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {project.skills.length > 3 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-slate-700/30 text-slate-400">
                      +{project.skills.length - 3}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <button
                  className={`w-full py-2 rounded-lg font-semibold transition-all duration-300 ${
                    project.joinable
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {project.joinable ? "Join Project" : "Coming Soon"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Browse all CTA */}
        <div className="text-center">
          <a
            href="/projects"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-slate-600 text-slate-200 font-semibold hover:border-slate-500 hover:text-white transition-colors"
          >
            Browse All Projects
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * AI CAPABILITIES SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * AI features that set BeOneOfUs apart
 * Portfolio, hiring, mentoring, code review, interviews
 */
export function AiCapabilitiesSection({ capabilities }) {
  const [expandedIdx, setExpandedIdx] = useState(0);

  return (
    <section className="py-20 bg-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-300">
            <Bot size={16} />
            <span className="text-sm font-medium">Powered by Advanced AI</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            AI That Gets You
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Our AI goes beyond simple matching. It understands your work, your potential, and your growth—
            <br className="hidden sm:block" />
            then connects you with the right opportunities and mentors.
          </p>
        </div>

        {/* Features grid - 2 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {capabilities.map((cap, idx) => {
            const IconComponent = cap.icon;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                onClick={() => setExpandedIdx(isExpanded ? -1 : idx)}
                className={`group relative p-6 rounded-xl border cursor-pointer transition-all duration-300 ${
                  isExpanded
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                    : `border-slate-700/50 ${cap.color} hover:border-slate-600`
                }`}
              >
                {/* Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-slate-700/50 text-blue-400">
                    <IconComponent size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {cap.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-300 mb-4">{cap.description}</p>

                {/* Benefits - expandable */}
                <div className="space-y-2">
                  {cap.benefits.map((benefit, bidx) => (
                    <div
                      key={bidx}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Expand indicator */}
                <div className="mt-4 text-sm text-blue-400 font-medium flex items-center gap-1">
                  {isExpanded ? "Close" : "Learn more"}
                  <ChevronRight size={16} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * COMPANY PORTAL SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * What companies can do on the platform
 * Hiring, team building, project management
 */
export function CompanyPortalSection({ features }) {
  const [selectedFeature, setSelectedFeature] = useState(0);
  const selectedFeatureData = features[selectedFeature] || {};

  return (
    <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4" id="companies">
            For Companies: Smart Hiring Platform
          </h2>
          <p className="text-lg text-slate-300">
            Find, evaluate, and hire the best developers based on real work and proven track records
          </p>
        </div>

        {/* Feature selector + content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Feature list - left side */}
          <div className="flex flex-col gap-4">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              const isSelected = selectedFeature === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedFeature(idx)}
                  className={`text-left p-6 rounded-xl border transition-all duration-300 ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${isSelected ? "bg-blue-500/20 text-blue-400" : "bg-slate-700/50 text-slate-400"}`}>
                      <IconComponent size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feature details - right side */}
          <div className="p-8 rounded-xl border border-slate-700/50 bg-slate-800/50 h-full flex flex-col justify-between">
            {selectedFeatureData.features && (
              <>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {selectedFeatureData.title}
                  </h3>
                  <ul className="space-y-3">
                    {selectedFeatureData.features.map((feat, fidx) => (
                      <li
                        key={fidx}
                        className="flex items-start gap-3 text-slate-300"
                      >
                        <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-400 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href="/company-signup"
                  className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition-all"
                >
                  Get Started
                  <ArrowRight size={18} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 p-8 rounded-xl border border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">
            Ready to Build Your Dream Team?
          </h3>
          <p className="text-slate-300 mb-6">
            Get started with a free trial. No credit card required.
          </p>
          <a
            href="/company-trial"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Start Free Trial
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * COMMUNITY SECTION
 * ─────────────────────────────────────────────────────────────
 * 
 * Community features that drive engagement
 * Challenges, events, mentorship, showcase
 */
export function CommunitySection({ features }) {
  return (
    <section id="community" className="py-20 bg-slate-900 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Join a Global Community
          </h2>
          <p className="text-lg text-slate-300">
            Connect with 45K+ developers, share knowledge, compete, and grow together
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                className="group p-6 rounded-xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`p-4 rounded-lg bg-gradient-to-br ${feature.color} text-white w-fit mb-4 group-hover:scale-110 transition-transform`}
                >
                  <IconComponent size={28} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Community highlight */}
        <div className="relative p-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/5 to-emerald-600/0" />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2">
              This Month's Highlights
            </h3>
            <p className="text-slate-300 mb-6">
              1200+ developers participated in the React Challenge • 250+ pull requests reviewed by community • 45 new mentorship matches formed
            </p>
            <a
              href="/community/highlights"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              See all highlights
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ─────────────────────────────────────────────────────────────
 * STATS COMPARISON
 * ─────────────────────────────────────────────────────────────
 * 
 * Why BeOneOfUs > Traditional Hiring
 */
export function ComparisonSection() {
  const comparisons = [
    {
      traditional: "Resume-based screening",
      beoneofus: "Real portfolio + code analysis",
    },
    {
      traditional: "Months of interviews",
      beoneofus: "AI-guided fast-track hiring",
    },
    {
      traditional: "Biased evaluations",
      beoneofus: "Objective skill assessment",
    },
    {
      traditional: "No experience = no job",
      beoneofus: "Beginner projects + mentors",
    },
    {
      traditional: "Isolated career building",
      beoneofus: "Collaborative growth platform",
    },
    {
      traditional: "Expensive mentorship",
      beoneofus: "Affordable AI + peer mentors",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            The BeOneOfUs Advantage
          </h2>
          <p className="text-lg text-slate-300">
            How we're changing developer hiring forever
          </p>
        </div>

        <div className="space-y-3">
          {comparisons.map((comp, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                  ✕
                </div>
                <p className="text-slate-400">{comp.traditional}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  ✓
                </div>
                <p className="text-emerald-300 font-medium">{comp.beoneofus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
