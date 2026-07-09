// ─── BeOneOfUs Growth Strategy — canonical data ──────────────────────────────
// Modular, admin-editable content model for the "Growth Through Institutions,
// Compounded by AI" section. Same shape philosophy as roadmapData.js so it can
// be overlaid from a Supabase table later without touching the UI.

export const GROWTH_META = {
  kicker: "Growth Strategy",
  title: "Growth Through Institutions, Compounded by AI",
  subtitle:
    "Growth is designed to compound: institutional partners bring verified cohorts of individuals, and every new participant strengthens the ecosystem for future institutions. AI accelerates acquisition, engagement, matching, and long-term retention.",
  supporting:
    "BeOneOfUs grows by connecting institutions with individuals in a reinforcing network. Every employer, university, NGO, government agency, healthcare provider, and community partner introduces verified members into the platform. AI continuously learns from every interaction to improve recommendations, matching quality, engagement, and ecosystem value.",
};

// accent keys map to ACCENT tokens in the page (brand | trust | premium | violet | sky | rose)
export const GROWTH_STAGES = [
  {
    id: "anchors",
    number: 1,
    title: "Institutional Anchors",
    icon: "building",
    accent: "brand",
    description:
      "Strategic partnerships with employers, educational institutions, NGOs, healthcare providers, and government agencies onboard large cohorts of verified users. Every institutional partnership creates immediate network effects by bringing trusted communities into the ecosystem.",
    sections: [
      { label: "Key Objectives", items: ["Enterprise onboarding", "University partnerships", "Government programs", "NGO collaborations", "Healthcare organizations", "Verified communities"] },
      { label: "AI Support", items: ["Predict institutional needs", "Recommend onboarding flows", "Analyze engagement", "Forecast partner growth"] },
      { label: "KPIs", items: ["Partner acquisition", "Active organizations", "Verified users", "Enterprise retention"] },
    ],
  },
  {
    id: "referral",
    number: 2,
    title: "Referral & Mentorship Loops",
    icon: "network",
    accent: "trust",
    description:
      "Mentors, coaches, employers, educators, and community leaders naturally invite mentees and peers, creating self-reinforcing growth loops that increase user engagement and trust.",
    sections: [
      { label: "Features", items: ["Mentor invitations", "Team invitations", "Referral rewards", "Ambassador programs", "Community champions", "Professional networking"] },
      { label: "AI Features", items: ["Smart referral recommendations", "Relationship analysis", "Mentor matching", "Engagement predictions"] },
      { label: "Metrics", items: ["Referral rate", "Invitations sent", "Mentor activity", "Community growth"] },
    ],
  },
  {
    id: "community",
    number: 3,
    title: "Content & Community",
    icon: "community",
    accent: "premium",
    description:
      "Educational resources, success stories, discussions, events, and AI-powered recommendations encourage discovery, retention, and long-term engagement while strengthening community trust.",
    sections: [
      { label: "Content Types", items: ["Courses", "Success stories", "Discussions", "Events", "Knowledge sharing", "Volunteer initiatives"] },
      { label: "AI Capabilities", items: ["Personalized feeds", "Content recommendations", "Trending insights", "Community moderation", "Automated summaries"] },
      { label: "KPIs", items: ["Daily active users", "Community engagement", "Content shares", "Retention rate"] },
    ],
  },
  {
    id: "regional",
    number: 4,
    title: "Regional Expansion",
    icon: "globe",
    accent: "violet",
    description:
      "Expansion is driven by institutional partnership density, ensuring each new region launches with strong local support, verified organizations, and culturally relevant experiences.",
    sections: [
      { label: "Expansion Strategy", items: ["Country prioritization", "Local partnerships", "Language localization", "Regulatory compliance", "Regional ambassadors", "Cultural adaptation"] },
      { label: "AI Capabilities", items: ["Predict expansion readiness", "Analyze regional demand", "Optimize localization", "Identify strategic partners"] },
      { label: "KPIs", items: ["Countries launched", "Regional users", "Local organizations", "Market adoption"] },
    ],
  },
  {
    id: "marketing",
    number: 5,
    title: "Performance Marketing",
    icon: "target",
    accent: "sky",
    description:
      "Highly targeted acquisition campaigns focus on professionals, students, volunteers, entrepreneurs, mentors, and organizations most likely to benefit from the platform.",
    sections: [
      { label: "Channels", items: ["Search", "Social Media", "LinkedIn", "Email", "Content Marketing", "Influencer campaigns", "Retargeting"] },
      { label: "AI Optimization", items: ["Audience segmentation", "Campaign optimization", "Budget allocation", "Conversion prediction", "Lead scoring"] },
      { label: "Metrics", items: ["Customer Acquisition Cost", "Conversion Rate", "Return on Ad Spend", "Lifetime Value", "Cost Per Lead"] },
    ],
  },
  {
    id: "partnerships",
    number: 6,
    title: "Brand Partnerships",
    icon: "handshake",
    accent: "rose",
    description:
      "Collaborate with governments, global organizations, educational institutions, corporations, NGOs, and technology partners to launch co-branded initiatives that expand reach and create meaningful social impact.",
    sections: [
      { label: "Partner Types", items: ["Governments", "NGOs", "Universities", "Corporations", "Healthcare providers", "Technology companies", "International organizations"] },
      { label: "Programs", items: ["Employment initiatives", "Scholarships", "Volunteer campaigns", "Innovation challenges", "Digital inclusion", "Workforce development"] },
      { label: "AI Features", items: ["Partnership analytics", "Impact measurement", "Opportunity discovery", "Resource optimization"] },
      { label: "Metrics", items: ["Active partnerships", "Joint programs", "Program participation", "Social impact indicators"] },
    ],
  },
];

// The compounding loop — each node feeds the next; the last loops back to the first.
export const GROWTH_CYCLE = [
  "Institution",
  "Verified Users",
  "AI Learning",
  "Better Matching",
  "Higher Engagement",
  "More Success Stories",
  "More Referrals",
  "More Partnerships",
  "Stronger Ecosystem",
];

export const AI_IMPROVEMENTS = [
  "Job matching",
  "Mentor matching",
  "Learning recommendations",
  "Volunteer opportunities",
  "Service discovery",
  "Community suggestions",
  "Personalized engagement",
  "Predictive insights",
  "Churn prevention",
  "Growth forecasting",
];

// Live platform metrics — REAL counts pulled from /api/platform-stats.
// `key` maps to a field in that endpoint's response. No fabricated figures or
// trends: every value reflects actual data and grows as the platform grows.
export const GROWTH_METRICS = [
  { key: "members",       label: "Members" },
  { key: "organizations", label: "Organizations" },
  { key: "opportunities", label: "Opportunities" },
  { key: "connections",   label: "Connections" },
  { key: "courses",       label: "Courses" },
  { key: "lessons",       label: "Lessons" },
  { key: "credentials",   label: "Credentials issued" },
  { key: "posts",         label: "Posts shared" },
];
