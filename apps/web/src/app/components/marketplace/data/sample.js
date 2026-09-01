// ── Sample marketplace data (JSON-shaped) ───────────────────────────────────
// Kept as a plain module so it can be swapped for a Supabase query later
// without touching any component. Shapes mirror the `marketplace_listings`
// columns (title, category, price, image_url, purchases, seller profile).

import {
  Bot, Code2, Boxes, LayoutTemplate, GraduationCap, Palette,
  Plug, Webhook, Handshake, Briefcase, ImageIcon,
} from "lucide-react";

export const CATEGORIES = [
  { id: "ai",        label: "AI Tools",       icon: Bot,            count: 1280, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(109,93,246,0.28), transparent 55%)" },
  { id: "software",  label: "Software",       icon: Code2,          count: 940,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(59,130,246,0.26), transparent 55%)" },
  { id: "source",    label: "Source Code",    icon: Boxes,          count: 2100, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(34,197,94,0.22), transparent 55%)" },
  { id: "templates", label: "Templates",      icon: LayoutTemplate, count: 1750, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(245,158,11,0.22), transparent 55%)" },
  { id: "courses",   label: "Courses",        icon: GraduationCap,  count: 610,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(255,209,102,0.22), transparent 55%)" },
  { id: "ui",        label: "UI Kits",        icon: Palette,        count: 830,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(236,72,153,0.22), transparent 55%)" },
  { id: "plugins",   label: "Plugins",        icon: Plug,           count: 540,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(109,93,246,0.22), transparent 55%)" },
  { id: "apis",      label: "APIs",           icon: Webhook,        count: 320,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(59,130,246,0.22), transparent 55%)" },
  { id: "services",  label: "Services",       icon: Handshake,      count: 1120, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(34,197,94,0.2), transparent 55%)" },
  { id: "jobs",      label: "Jobs",           icon: Briefcase,      count: 480,  gradient: "radial-gradient(120% 100% at 0% 0%, rgba(245,158,11,0.2), transparent 55%)" },
  { id: "assets",    label: "Digital Assets", icon: ImageIcon,      count: 3400, gradient: "radial-gradient(120% 100% at 0% 0%, rgba(160,174,192,0.18), transparent 55%)" },
];

const img = (seed) => `https://picsum.photos/seed/${seed}/640/480`;
const av = (seed) => `https://i.pravatar.cc/80?u=${seed}`;

export const PRODUCTS = [
  { id: "p1", title: "Nebula — AI Analytics Dashboard (Next.js + Tailwind)", category: "Templates", thumbnail: img("nebula"), price: 79, originalPrice: 129, rating: 4.9, reviews: 342, downloads: 12800, premium: true, hot: true, verified: true, creator: { name: "Aurora Labs", avatar: av("aurora") } },
  { id: "p2", title: "PromptForge — AI Prompt Engineering Toolkit", category: "AI Tools", thumbnail: img("prompt"), price: 39, rating: 4.8, reviews: 210, downloads: 8400, verified: true, isNew: true, creator: { name: "Kai Mensah", avatar: av("kai") } },
  { id: "p3", title: "Laravel Nova Admin — Production SaaS Boilerplate", category: "Source Code", thumbnail: img("laravel"), price: 149, originalPrice: 199, rating: 4.7, reviews: 512, downloads: 6300, premium: true, verified: true, creator: { name: "DevCraft", avatar: av("devcraft") } },
  { id: "p4", title: "Aurora UI — 240+ React Components Kit", category: "UI Kits", thumbnail: img("auroraui"), price: 59, rating: 4.9, reviews: 890, downloads: 21000, hot: true, verified: true, creator: { name: "Lina Park", avatar: av("lina") } },
  { id: "p5", title: "Full-Stack Next.js 16 Masterclass (28h)", category: "Courses", thumbnail: img("course"), price: 89, originalPrice: 149, rating: 4.8, reviews: 1240, downloads: 4200, premium: true, creator: { name: "Marcus Bell", avatar: av("marcus") } },
  { id: "p6", title: "Stripe Billing API Wrapper — TypeScript SDK", category: "APIs", thumbnail: img("stripe"), price: 0, rating: 4.6, reviews: 98, downloads: 15600, isNew: true, verified: true, creator: { name: "OpenTools", avatar: av("opentools") } },
  { id: "p7", title: "MotionOne — Framer Animation Presets Pack", category: "Plugins", thumbnail: img("motion"), price: 24, rating: 4.7, reviews: 156, downloads: 5100, creator: { name: "Studio Flux", avatar: av("flux") } },
  { id: "p8", title: "VectorPack — 4,000 Premium SVG Icons", category: "Digital Assets", thumbnail: img("vectors"), price: 19, originalPrice: 39, rating: 4.9, reviews: 430, downloads: 33000, verified: true, creator: { name: "PixelForge", avatar: av("pixel") } },
];

export const AI_SUGGESTIONS = [
  "I need a React dashboard",
  "Best AI tools for coding",
  "Laravel admin panel",
  "Next.js SaaS starter kit",
];
