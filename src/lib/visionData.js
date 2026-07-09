// ─── BeOneOfUs — Vision page data model ───────────────────────────────────────
// Modular, editable content for the strategic vision page (/vision).

export const VISION_META = {
  hero: {
    kicker: "The Future of BeOneOfUs",
    title: "Building the Connective Infrastructure for Global Opportunity",
    subtitle:
      "BeOneOfUs connects individuals, institutions, governments, employers, NGOs, schools and communities through one intelligent AI ecosystem that discovers, creates and scales opportunity.",
  },
  raise: {
    kicker: "Why we are raising capital",
    title: "Accelerating the Future of Opportunity",
    description:
      "Capital enables us to scale the infrastructure that powers millions of meaningful connections between people and institutions worldwide.",
  },
  quote1: "The future belongs to platforms that connect opportunity before people even know they need it.",
  future: {
    kicker: "The horizon",
    title: "Toward a Single Global Layer for Opportunity",
  },
  vision: {
    line1: "The world's opportunity infrastructure should not belong to one industry.",
    line2: "It should belong to everyone.",
  },
};

export const PILLARS = [
  {
    id: "ai",
    tag: "Product & AI",
    accent: "blue",
    visual: "neural",
    blurb: "Every interaction continuously improves recommendations across the platform.",
    items: [
      "Deep AI Matching",
      "Personal Opportunity Graph",
      "Multi-agent AI",
      "Recommendation Intelligence",
      "Predictive Career Paths",
      "AI Mentor",
      "Cross-module Intelligence",
    ],
  },
  {
    id: "growth",
    tag: "Institutional Growth",
    accent: "violet",
    visual: "map",
    blurb: "Connected universities, companies, hospitals, NGOs, government agencies and investment firms.",
    items: ["Countries", "Institutions", "Communities", "Opportunity hubs", "Regional ecosystems", "Volunteer networks"],
  },
  {
    id: "trust",
    tag: "Trust Infrastructure",
    accent: "emerald",
    visual: "shield",
    blurb: "Everything is verified with secure, glowing layers of trust.",
    items: [
      "Identity verification",
      "Credential verification",
      "Background screening",
      "Skill validation",
      "Fraud prevention",
      "Community moderation",
      "Institutional trust",
      "Global compliance",
    ],
  },
];

export const FUTURE_MILESTONES = [
  {
    id: "identity",
    number: "01",
    title: "Portable Global Identity",
    description:
      "One verified identity that securely carries a person's complete opportunity history across borders, industries, and institutions.",
    accent: "blue",
    icon: "id",
    chips: ["Education", "Work", "Skills", "Achievements", "Volunteer work", "Healthcare qualifications", "Licenses", "Credentials"],
  },
  {
    id: "predictive",
    number: "02",
    title: "Predictive Opportunity AI",
    description:
      "Our AI continuously learns from verified activity, institutional data and user goals to proactively recommend the next best opportunity before it is requested.",
    accent: "violet",
    icon: "brain",
    chips: ["Career", "Funding", "Scholarships", "Jobs", "Volunteer roles", "Healthcare", "Learning", "Investments", "Mentorship", "Housing", "Networking"],
  },
  {
    id: "integration",
    number: "03",
    title: "Deep Institutional Integration",
    description:
      "Institutions integrate directly into BeOneOfUs, allowing opportunity to move instantly between systems without friction.",
    accent: "cyan",
    icon: "plug",
    chips: ["Government APIs", "Enterprise systems", "University systems", "Hospital systems", "NGOs", "HR systems", "Learning platforms", "CRM", "Single Sign-On", "Identity Federation"],
  },
  {
    id: "trust-standard",
    number: "04",
    title: "Global Trust Standard",
    description:
      "A globally recognized reputation system that allows verified trust, skills and achievements to travel with individuals across countries, employers and industries.",
    accent: "emerald",
    icon: "globe",
    chips: ["Trust score", "Verification badges", "Credential chain", "Institution network", "Reputation graph"],
  },
];

// Ecosystem graph — center + orbiting nodes.
export const ECOSYSTEM_NODES = [
  "Education", "Healthcare", "Employment", "Investment", "Volunteer",
  "Government", "Communities", "Mentors", "Businesses", "NGOs",
  "Researchers", "Accelerators", "Foundations",
];

// Live platform metrics — REAL counts pulled from /api/platform-stats and
// animated up on scroll. `key` maps to a field in that endpoint's response.
// No fabricated numbers: every value reflects actual data and grows on its own.
export const IMPACT_METRICS = [
  { key: "members",       label: "Members" },
  { key: "organizations", label: "Organizations" },
  { key: "courses",       label: "Courses" },
  { key: "lessons",       label: "Lessons published" },
  { key: "credentials",   label: "Credentials issued" },
  { key: "connections",   label: "Connections made" },
  { key: "opportunities", label: "Opportunities" },
  { key: "posts",         label: "Posts shared" },
];
