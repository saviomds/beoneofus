-- ============================================================
-- Seed full profiles for founder and platform admin accounts
-- ============================================================

-- PROFILE 1: savio / dominiquesavio2003@gmail.com (Founder)
UPDATE public.profiles SET
  name                = 'Dominique Savio',
  full_name           = 'Dominique Savio',
  bio                 = 'Founder & CEO of BeOneOfUs — building the next generation of connected digital communities. Passionate about full-stack engineering, fintech innovation, and developer-first platforms. Based in Mauritius, shipping daily.',
  website             = 'https://beoneofus.work',
  github              = 'saviomds',
  location            = 'Port Louis, Mauritius',
  field               = 'Software Engineering',
  work_status         = 'Hiring',
  status              = 'Founder & CEO @ BeOneOfUs · Building the future of connected digital experiences · Fintech · Open Source',
  skills              = ARRAY['React','Next.js','Node.js','Python','TypeScript','AWS','PostgreSQL','Supabase','REST APIs','UI/UX','Docker','Git'],
  open_to_collab      = true,
  is_verified         = true,
  verification_status = 'approved',
  is_premium          = true,
  is_trial_premium    = false,
  premium_requested   = false,
  premium_expires_at  = '2030-01-01 00:00:00+00',
  profile_views       = 142,
  profile_visibility  = '{
    "bio": true, "posts": true, "github": true, "website": true,
    "location": true, "work_status": true, "certificates": true, "premium_badge": true
  }'::jsonb,
  preferences         = '{"dark_mode": true, "notifications": true}'::jsonb,
  notification_prefs  = '{
    "email": true, "push": true, "mentions": true,
    "new_followers": true, "task_updates": true, "platform_news": true
  }'::jsonb,
  dashboard_config    = '{
    "show_stats": true, "show_tasks": true,
    "show_activity": true, "show_connections": true
  }'::jsonb,
  resume_data         = '{
    "summary": "Founder & CEO of BeOneOfUs. Software Engineer with expertise in designing and scaling modern digital platforms. Skilled in full-stack development, cloud infrastructure, API design, and building community-driven products. Passionate about fintech, open source, and developer experience.",
    "show_certs": true,
    "show_posts": true,
    "show_projects": true,
    "education": [
      {
        "id": "vnzwajbo",
        "school": "University of Technology Mauritius",
        "degree": "BSc Computer Science",
        "field": "Software Engineering",
        "start": "2022",
        "end": "2025",
        "gpa": "3.8 / 4.0",
        "current": false
      }
    ],
    "work_experience": [
      {
        "id": "ntag0eak",
        "role": "Founder & CEO",
        "company": "BeOneOfUs",
        "location": "Port Louis, Mauritius",
        "start": "2026",
        "end": "",
        "current": true,
        "description": "• Founded and built BeOneOfUs, a community-first digital platform connecting founders, builders, and creators.\n• Architected and developed the full-stack platform using Next.js, Supabase, and AWS.\n• Led product design, engineering, and go-to-market strategy from zero to launch.\n• Integrated real-time features, AI tooling, premium subscriptions, and marketplace functionality."
      },
      {
        "id": "ntag0ea2",
        "role": "Software Engineer",
        "company": "Techninja",
        "location": "Coromandel, Mauritius",
        "start": "2025",
        "end": "2026",
        "current": false,
        "description": "• Developed and maintained web applications using modern software development practices.\n• Built and integrated APIs, databases, and third-party services to support application features.\n• Improved application performance, optimized code, and resolved technical issues.\n• Collaborated on requirements, feature planning, testing, and delivery."
      },
      {
        "id": "gis23xyw",
        "role": "Computer Systems Technician",
        "company": "Vjeko Vocational Training Centre",
        "location": "Kivumu, Rwanda",
        "start": "2023",
        "end": "2024",
        "current": false,
        "description": "• Installed, configured, and maintained computer systems, OS, and software applications.\n• Performed hardware troubleshooting, system upgrades, and preventive maintenance.\n• Managed networking tasks and assisted with security, data management, and backups."
      }
    ]
  }'::jsonb,
  updated_at          = now()
WHERE id = '7bab920c-0598-4262-a939-09b1de460145';


-- ============================================================
-- PROFILE 2: beoneofus / dominiquesaviomds@gmail.com (Admin)
-- ============================================================
UPDATE public.profiles SET
  name                = 'BeOneOfUs Platform',
  full_name           = 'BeOneOfUs',
  bio                 = 'Official platform account for BeOneOfUs — the community-first digital network connecting founders, builders, and creators. Operated by the core engineering team.',
  website             = 'https://beoneofus.work',
  github              = 'saviomds',
  location            = 'Port Louis, Mauritius',
  field               = 'Platform & Community',
  work_status         = 'Hiring',
  status              = 'Founder & Lead Engineer · Building beoneofus · Open source · Community-first platform',
  skills              = ARRAY['React','Next.js','Node.js','Python','TypeScript','AWS','PostgreSQL','Supabase','REST APIs','UI/UX','Docker','DevOps','PHP'],
  open_to_collab      = true,
  is_verified         = true,
  verification_status = 'approved',
  is_premium          = true,
  is_trial_premium    = false,
  premium_requested   = false,
  premium_expires_at  = '2030-01-01 00:00:00+00',
  profile_views       = 98,
  profile_visibility  = '{
    "bio": true, "posts": true, "github": true, "website": true,
    "location": true, "work_status": true, "certificates": true, "premium_badge": true
  }'::jsonb,
  preferences         = '{"dark_mode": true, "notifications": true}'::jsonb,
  notification_prefs  = '{
    "email": true, "push": true, "mentions": true,
    "new_followers": true, "task_updates": true, "platform_news": true
  }'::jsonb,
  dashboard_config    = '{
    "show_stats": true, "show_tasks": true,
    "show_activity": true, "show_connections": true
  }'::jsonb,
  resume_data         = '{
    "summary": "BeOneOfUs is a community-first digital platform built for founders, developers, and creators. The platform provides tools for networking, collaboration, marketplace transactions, AI assistance, and professional growth.",
    "show_certs": true,
    "show_posts": true,
    "show_projects": true,
    "education": [],
    "work_experience": [
      {
        "id": "bou001",
        "role": "Platform Administrator",
        "company": "BeOneOfUs",
        "location": "Port Louis, Mauritius",
        "start": "2026",
        "end": "",
        "current": true,
        "description": "• Manages platform operations, community moderation, and technical administration.\n• Oversees member onboarding, premium subscriptions, and platform integrity.\n• Coordinates with the engineering team on feature rollouts and system updates."
      }
    ]
  }'::jsonb,
  updated_at          = now()
WHERE id = '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b';
