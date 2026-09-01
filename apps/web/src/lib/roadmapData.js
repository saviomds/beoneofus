// ─── BeOneOfUs Roadmap — canonical data ──────────────────────────────────────
// Single source of truth for the public roadmap. Shaped to map 1:1 onto a
// Supabase `roadmap_phases` table (see supabase/migrations/20260712_roadmap.sql)
// so live status/progress can later be overlaid from the DB without touching UI.
//
// Phase shape:
//   id            slug (stable key)
//   number        display index
//   tag           short badge label
//   title         phase name
//   timeline      human window
//   status        'completed' | 'in_progress' | 'planned'
//   progress      0–100 (execution %)
//   accent        design token key: 'brand' | 'trust' | 'premium' | 'ai'
//   description   one paragraph
//   objectives[]  bullet goals
//   featureGroups [{ group, items[] }]
//   kpis[]        [{ value, label }] — headline numbers
//   successMetrics[]  qualitative targets
//   technicalGoals[]  engineering targets

export const ROADMAP_META = {
  title: "The BeOneOfUs Roadmap",
  kicker: "Vision & Execution",
  subtitle:
    "An AI-powered ecosystem connecting people, organizations, governments, and communities — built in four deliberate phases from a global MVP to planetary-scale intelligence.",
};

export const ROADMAP_PHASES = [
  {
    id: "foundation",
    number: 1,
    tag: "Launch MVP",
    title: "Foundation",
    timeline: "Q1 – Q2 2026",
    status: "completed",
    progress: 100,
    accent: "brand",
    description:
      "Build the foundation of the BeOneOfUs ecosystem by delivering the essential experience every user needs — profiles, opportunities, learning, and an AI assistant that ties it together.",
    objectives: [
      "Users can build rich professional profiles",
      "Find and apply to jobs",
      "Offer and discover services",
      "Connect with mentors",
      "Learn through structured courses",
      "Use the AI assistant across the platform",
      "Join and grow communities",
    ],
    featureGroups: [
      {
        group: "Core Experience",
        items: ["Authentication", "Personal Profile", "Dashboard", "Search", "Notifications", "Messaging"],
      },
      {
        group: "Opportunity",
        items: ["Jobs Marketplace", "Services Marketplace", "Mentorship", "Learning Courses"],
      },
      {
        group: "Intelligence & Social",
        items: ["AI Assistant", "Recommendations", "Organizations", "Community Connections"],
      },
    ],
    kpis: [
      { value: "10K", label: "Target users" },
      { value: "99.9%", label: "Infra uptime" },
      { value: "14", label: "Core modules" },
      { value: "100%", label: "Mobile ready" },
    ],
    successMetrics: [
      "10,000 users onboarded",
      "Stable production infrastructure",
      "Complete guided onboarding",
      "Fully mobile responsive",
      "Production ready",
    ],
    technicalGoals: [
      "Secure authentication",
      "Clean API architecture",
      "AI integration layer",
      "Recommendation engine",
      "Search indexing",
      "Product analytics",
    ],
  },
  {
    id: "institutional",
    number: 2,
    tag: "Organizations",
    title: "Institutional Onboarding",
    timeline: "Q3 – Q4 2026",
    status: "in_progress",
    progress: 62,
    accent: "trust",
    description:
      "Expand beyond individuals with dedicated enterprise experiences for businesses, education, and healthcare — each a purpose-built portal with its own workflows, roles, and billing.",
    objectives: [
      "Multi-organization support",
      "Enterprise-grade dashboards",
      "Granular role permissions",
      "Trusted verification",
      "Tiered subscription plans",
    ],
    featureGroups: [
      {
        group: "Business Portal",
        items: ["Company Dashboard", "Hiring Management", "Employee Programs", "Internal Communities"],
      },
      {
        group: "Education Portal",
        items: ["Student Profiles", "Teacher Portal", "Course Management", "Certifications", "Career Services"],
      },
      {
        group: "Healthcare Portal",
        items: ["Healthcare Communities", "Wellness Programs", "Professional Directory"],
      },
    ],
    kpis: [
      { value: "500", label: "Organizations" },
      { value: "100", label: "Schools" },
      { value: "50", label: "Hospitals" },
      { value: "3", label: "Vertical portals" },
    ],
    successMetrics: ["500 organizations", "100 schools & colleges", "50 hospitals & clinics"],
    technicalGoals: [
      "Role-based access control (RBAC)",
      "Multi-tenancy",
      "Subscription billing",
      "Enterprise APIs",
      "Audit logs",
    ],
  },
  {
    id: "ecosystem",
    number: 3,
    tag: "Public Impact",
    title: "Ecosystem Depth",
    timeline: "2027",
    status: "planned",
    progress: 12,
    accent: "premium",
    description:
      "Expand into the public sector and build a trusted digital ecosystem — governments, NGOs, and communities operating on a verified, fraud-resistant trust layer.",
    objectives: ["Nationwide partnerships", "A verified ecosystem", "High institutional trust"],
    featureGroups: [
      {
        group: "Government",
        items: ["Public Services", "Citizen Engagement", "Digital Programs", "Employment Initiatives"],
      },
      {
        group: "NGO & Charity",
        items: ["Volunteer Recruitment", "Fundraising", "Impact Tracking", "Community Campaigns"],
      },
      {
        group: "Communities",
        items: ["Local Events", "Support Groups", "Resource Sharing", "Civic Participation"],
      },
      {
        group: "Trust Layer",
        items: [
          "Identity Verification",
          "Organization Verification",
          "Digital Badges",
          "Reputation System",
          "Reviews",
          "Fraud Detection",
          "Moderation",
          "Compliance",
        ],
      },
    ],
    kpis: [
      { value: "100", label: "Gov partners" },
      { value: "1K", label: "NGOs" },
      { value: "M+", label: "Verified users" },
      { value: "8", label: "Trust systems" },
    ],
    successMetrics: ["100 government partners", "1,000 NGOs", "Millions of verified users"],
    technicalGoals: [
      "Trust framework",
      "Regulatory compliance",
      "AI moderation",
      "Verification APIs",
      "Risk scoring",
    ],
  },
  {
    id: "intelligence",
    number: 4,
    tag: "AI Ecosystem",
    title: "Global Intelligence",
    timeline: "2028 →",
    status: "planned",
    progress: 0,
    accent: "ai",
    description:
      "Transform BeOneOfUs into an intelligent global platform — cross-module AI, predictive guidance, a universal matching engine, and localized presence across six continents.",
    objectives: ["Become the world's most intelligent social opportunity platform."],
    featureGroups: [
      {
        group: "Cross-module Intelligence",
        items: [
          "AI Career Coach",
          "AI Mentor",
          "AI Learning Advisor",
          "AI Health Assistant",
          "AI Business Advisor",
          "AI Volunteer Matching",
        ],
      },
      {
        group: "Predictive Intelligence",
        items: [
          "Opportunity Prediction",
          "Skill Gap Analysis",
          "Talent Forecasting",
          "Career Roadmaps",
          "Personalized Learning",
          "Community Recommendations",
        ],
      },
      {
        group: "Universal Matching Engine",
        items: ["Jobs", "Mentors", "Courses", "Volunteers", "Services", "Businesses", "Investors", "Organizations"],
      },
      {
        group: "Regional Expansion & Localization",
        items: [
          "Africa · Europe · Asia",
          "North & South America · Oceania",
          "Multi-language",
          "Multi-currency",
          "Regional Compliance",
        ],
      },
    ],
    kpis: [
      { value: "10M+", label: "Users" },
      { value: "100+", label: "Countries" },
      { value: "6", label: "Regions" },
      { value: "M/day", label: "AI recommendations" },
    ],
    successMetrics: ["10M+ users", "100+ countries", "Millions of AI recommendations daily"],
    technicalGoals: [
      "AI orchestration",
      "Predictive analytics",
      "ML pipelines",
      "Large-scale recommendation engine",
      "Knowledge graph",
      "Distributed infrastructure",
    ],
  },
];

// Overall program progress = mean of phase progress (weighted equally).
export function overallProgress(phases = ROADMAP_PHASES) {
  if (!phases.length) return 0;
  return Math.round(phases.reduce((s, p) => s + (p.progress || 0), 0) / phases.length);
}

// Merge live DB rows (id, status, progress, timeline) over the static config so
// the UI can show real execution state when the roadmap table is populated.
export function mergePhases(overrides = []) {
  if (!overrides?.length) return ROADMAP_PHASES;
  const map = new Map(overrides.map((o) => [o.id, o]));
  return ROADMAP_PHASES.map((p) => (map.has(p.id) ? { ...p, ...map.get(p.id) } : p));
}
