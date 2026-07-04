import {
  Landmark, GraduationCap, HeartPulse, HandHeart, Users2,
  LayoutDashboard, Users, LineChart, Building2, ShieldCheck, CreditCard,
  CalendarDays, HeartHandshake, Megaphone, Briefcase, Stethoscope, Sprout,
} from 'lucide-react';
import { orgMeta } from './orgTypes';

/**
 * Institution verticals — dedicated experiences per participant type.
 *
 * Government, education, healthcare, NGO and community all run "programs"
 * (org_programs / program_participants), but each is a DISTINCT product: its own
 * navigation, workflows, vocabulary, and metric formulas. This manifest is the
 * single source of truth the console (`/console/[slug]`) and API read from, so a
 * ministry never sees a hiring pipeline and a hospital never counts "applicants".
 *
 * KPI `key` values map to the generic metric bundle the API computes once
 * (see src/app/api/console/[slug]/route.js → buildKpis). `format` shapes display.
 */

// Section component ids the console page knows how to render.
// overview | programs | directory | impact | orgpage | team | verification | billing
// `filter` narrows the shared programs/participants data so one component powers
// several type-specific tabs (e.g. NGO "Volunteers" = directory filtered to role).

const SECTION = {
  overview:     { id: 'overview',     component: 'overview',     icon: LayoutDashboard, label: 'Overview' },
  orgpage:      { id: 'orgpage',      component: 'orgpage',      icon: Building2,       label: 'Public Page' },
  team:         { id: 'team',         component: 'team',         icon: Users2,          label: 'Team' },
  verification: { id: 'verification', component: 'verification', icon: ShieldCheck,     label: 'Verification' },
  billing:      { id: 'billing',      component: 'billing',      icon: CreditCard,      label: 'Billing' },
};

export const ORG_VERTICALS = {
  government: {
    type: 'government',
    icon: Landmark,
    label: 'Government',
    console: 'Public sector console',
    accent: 'slate',
    // Vocabulary
    program:  { noun: 'Program',  plural: 'Programs',  verb: 'Launch program' },
    person:   { noun: 'Citizen',  plural: 'Citizens' },
    kinds:    ['scheme', 'program', 'campaign', 'event'],
    defaultRole: 'participant',
    hero: 'Reach citizens with employment, training, and civic programs on a trusted, measurable channel.',
    nav: [
      SECTION.overview,
      { id: 'programs',  component: 'programs',  icon: Landmark,   label: 'Civic programs' },
      { id: 'citizens',  component: 'directory', icon: Users,      label: 'Citizens reached' },
      { id: 'impact',    component: 'impact',    icon: LineChart,  label: 'Impact & reach' },
      SECTION.orgpage, SECTION.team, SECTION.verification, SECTION.billing,
    ],
    kpis: [
      { key: 'activePrograms', label: 'Active programs', tone: 'brand' },
      { key: 'participants',   label: 'Citizens reached', tone: 'trust',   format: 'number' },
      { key: 'completionRate', label: 'Completion rate',  tone: 'premium', format: 'percent' },
      { key: 'regions',        label: 'Regions covered',  tone: 'brand' },
    ],
    impactHeadline: 'Civic reach and program outcomes',
  },

  education: {
    type: 'education',
    icon: GraduationCap,
    label: 'Education',
    console: 'Institution console',
    accent: 'brand',
    program:  { noun: 'Cohort',   plural: 'Cohorts',   verb: 'Open cohort' },
    person:   { noun: 'Learner',  plural: 'Learners' },
    kinds:    ['cohort', 'course', 'scholarship', 'program'],
    defaultRole: 'participant',
    hero: 'Connect courses and graduates directly to real-world opportunity and employer demand.',
    nav: [
      SECTION.overview,
      { id: 'cohorts',    component: 'programs',  icon: GraduationCap, label: 'Cohorts' },
      { id: 'learners',   component: 'directory', icon: Users,         label: 'Learners' },
      { id: 'placements', component: 'directory', icon: Briefcase,     label: 'Placements', filter: { status: 'placed' } },
      { id: 'impact',     component: 'impact',    icon: LineChart,     label: 'Outcomes' },
      SECTION.orgpage, SECTION.team, SECTION.verification, SECTION.billing,
    ],
    kpis: [
      { key: 'activePrograms', label: 'Active cohorts',  tone: 'brand' },
      { key: 'participants',   label: 'Learners enrolled', tone: 'trust', format: 'number' },
      { key: 'graduated',      label: 'Graduates',       tone: 'premium' },
      { key: 'placementRate',  label: 'Placement rate',  tone: 'trust', format: 'percent' },
    ],
    impactHeadline: 'Graduate outcomes and employer links',
  },

  healthcare: {
    type: 'healthcare',
    icon: HeartPulse,
    label: 'Healthcare',
    console: 'Provider console',
    accent: 'trust',
    program:  { noun: 'Program',  plural: 'Access programs', verb: 'Start program' },
    person:   { noun: 'Person',   plural: 'People supported' },
    kinds:    ['program', 'clinic', 'campaign', 'event'],
    defaultRole: 'beneficiary',
    hero: 'Extend access and wellbeing support into the professional network — verified and secure.',
    nav: [
      SECTION.overview,
      { id: 'programs', component: 'programs',  icon: Stethoscope, label: 'Access programs' },
      { id: 'people',   component: 'directory', icon: HeartHandshake, label: 'People supported' },
      { id: 'impact',   component: 'impact',    icon: LineChart,   label: 'Wellbeing reach' },
      SECTION.orgpage, SECTION.team, SECTION.verification, SECTION.billing,
    ],
    kpis: [
      { key: 'activePrograms', label: 'Active programs',  tone: 'trust' },
      { key: 'participants',   label: 'People supported', tone: 'brand', format: 'number' },
      { key: 'completed',      label: 'Programs completed', tone: 'premium' },
      { key: 'regions',        label: 'Locations served', tone: 'trust' },
    ],
    impactHeadline: 'Access delivered and wellbeing reach',
  },

  ngo: {
    type: 'ngo',
    icon: HandHeart,
    label: 'NGO',
    console: 'NGO console',
    accent: 'premium',
    program:  { noun: 'Campaign', plural: 'Campaigns', verb: 'Launch campaign' },
    person:   { noun: 'Beneficiary', plural: 'Beneficiaries' },
    kinds:    ['campaign', 'drive', 'program', 'event'],
    defaultRole: 'beneficiary',
    hero: 'Reach and mobilize communities around programs and support, with a verified presence.',
    nav: [
      SECTION.overview,
      { id: 'campaigns',    component: 'programs',  icon: Megaphone,      label: 'Campaigns' },
      { id: 'beneficiaries', component: 'directory', icon: HeartHandshake, label: 'Beneficiaries' },
      { id: 'volunteers',   component: 'directory', icon: HandHeart,      label: 'Volunteers', filter: { role: 'volunteer' } },
      { id: 'impact',       component: 'impact',    icon: LineChart,      label: 'Impact' },
      SECTION.orgpage, SECTION.team, SECTION.verification, SECTION.billing,
    ],
    kpis: [
      { key: 'activePrograms', label: 'Active campaigns', tone: 'premium' },
      { key: 'beneficiaries',  label: 'Beneficiaries',    tone: 'brand', format: 'number' },
      { key: 'volunteers',     label: 'Volunteers',       tone: 'trust' },
      { key: 'regions',        label: 'Communities',      tone: 'premium' },
    ],
    impactHeadline: 'Beneficiaries reached and mobilization',
  },

  community: {
    type: 'community',
    icon: Users2,
    label: 'Community',
    console: 'Community console',
    accent: 'premium',
    program:  { noun: 'Space',    plural: 'Spaces',    verb: 'Create space' },
    person:   { noun: 'Member',   plural: 'Members' },
    kinds:    ['space', 'event', 'program'],
    defaultRole: 'member',
    hero: 'Give grassroots groups a verified, connected home inside the wider opportunity graph.',
    nav: [
      SECTION.overview,
      { id: 'spaces',  component: 'programs',  icon: Sprout,          label: 'Spaces' },
      { id: 'members', component: 'directory', icon: Users,           label: 'Members' },
      { id: 'events',  component: 'programs',  icon: CalendarDays,    label: 'Events', filter: { kind: 'event' } },
      { id: 'impact',  component: 'impact',    icon: LineChart,       label: 'Engagement' },
      SECTION.orgpage, SECTION.verification, SECTION.billing,
    ],
    kpis: [
      { key: 'members',        label: 'Members',        tone: 'premium', format: 'number' },
      { key: 'activePrograms', label: 'Active spaces',  tone: 'brand' },
      { key: 'upcomingEvents', label: 'Upcoming events', tone: 'trust' },
      { key: 'newParticipants', label: 'New this week',  tone: 'premium' },
    ],
    impactHeadline: 'Membership growth and engagement',
  },
};

// Types that get the institution console. `business` keeps its own hiring console
// at /business/[slug]; `other` falls back to the government-style civic layout.
export const VERTICAL_TYPES = ['government', 'education', 'healthcare', 'ngo', 'community'];

export function isVerticalType(type) {
  return VERTICAL_TYPES.includes(type);
}

// Where a manager of this org should land when they open "Manage console".
export function consolePathFor(type, slug) {
  if (type === 'business') return `/business/${slug}`;
  if (isVerticalType(type)) return `/console/${slug}`;
  return `/console/${slug}`; // 'other' → civic-style vertical
}

export function verticalFor(type) {
  return ORG_VERTICALS[type] || ORG_VERTICALS.government;
}

// Merge the accent class presets from orgTypes so the console styles itself.
export function verticalTheme(type) {
  const v = verticalFor(type);
  return { ...v, meta: orgMeta(type) };
}
