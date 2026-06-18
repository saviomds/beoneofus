-- ============================================================
-- Competencies update + pages seed for founder & platform accounts
-- ============================================================

-- COMPETENCIES — both profiles
UPDATE public.profiles SET
  skills = ARRAY[
    'React','Next.js','Node.js','Python','TypeScript','AWS','PostgreSQL','Docker'
  ],
  resume_data = resume_data || jsonb_build_object(
    'competencies', jsonb_build_object(
      'have', jsonb_build_array(
        jsonb_build_object('name','React','level','strong'),
        jsonb_build_object('name','Next.js','level','strong'),
        jsonb_build_object('name','Node.js','level','strong'),
        jsonb_build_object('name','Python','level','strong'),
        jsonb_build_object('name','TypeScript','level','strong'),
        jsonb_build_object('name','AWS','level','strong'),
        jsonb_build_object('name','PostgreSQL','level','strong'),
        jsonb_build_object('name','Docker','level','strong')
      ),
      'needs_deepening', jsonb_build_array(
        jsonb_build_object('name','Business Strategy','note','Need deeper strategic planning skills'),
        jsonb_build_object('name','Financial Management','note','Critical for scaling operations'),
        jsonb_build_object('name','Team Leadership','note','Scaling from solo to team management'),
        jsonb_build_object('name','Product Management','note','Vision to market execution gaps'),
        jsonb_build_object('name','Sales & Marketing','note','Customer acquisition and retention focus')
      ),
      'missing', jsonb_build_array(
        jsonb_build_object('name','Fundraising & Investor Relations','priority','high','note','Essential for capital and growth'),
        jsonb_build_object('name','HR & Organizational Development','priority','high','note','Building and retaining talent pipeline'),
        jsonb_build_object('name','Market Analysis & Competitive Strategy','priority','high','note','Data-driven business decisions'),
        jsonb_build_object('name','Legal & Compliance','priority','medium','note','Protecting company and users'),
        jsonb_build_object('name','Customer Success Operations','priority','medium','note','Retention and lifetime value'),
        jsonb_build_object('name','Data Analytics & Metrics','priority','medium','note','KPI tracking and optimization')
      )
    )
  ),
  updated_at = now()
WHERE id IN (
  '7bab920c-0598-4262-a939-09b1de460145',
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b'
);

-- ============================================================
-- STRENGTHEN EXISTING PAGES
-- ============================================================

UPDATE public.pages SET
  title        = 'Build Sessions — Brainstorm with Savio',
  description  = 'Got an idea? Bring it here. We review concepts together, stress-test feasibility, map out the tech stack, and figure out what you actually need to build vs what you think you need. Raw, honest, founder-to-founder sessions.',
  icon         = '🧠',
  company_data = '{"category":"Mentorship","tags":["brainstorming","product","startups","tech","founders"],"cta":"Drop your idea below","host":"Dominique Savio","format":"Open discussion","visibility_label":"Public"}'::jsonb,
  updated_at   = now()
WHERE id = '69051433-73b6-472f-838e-5db9e8b9e4be';

UPDATE public.pages SET
  title        = 'BeOneOfUs Engineering',
  description  = 'Behind the scenes of building BeOneOfUs — architecture decisions, performance wins, lessons from production, and the honest story of scaling a platform from scratch. Written by the core engineering team.',
  icon         = '⚙️',
  company_data = '{"category":"Engineering","tags":["nextjs","supabase","postgresql","aws","engineering","platform"],"website":"https://beoneofus.work","team":"BeOneOfUs Core Team","visibility_label":"Public"}'::jsonb,
  updated_at   = now()
WHERE id = '97403b4d-2381-4282-a001-91edfff43e9e';

UPDATE public.pages SET
  title        = 'Open Source @ BeOneOfUs',
  description  = 'Tools, components, and utilities we have extracted from the BeOneOfUs platform and released publicly. Everything here is free to use, fork, and build on.',
  icon         = '🔓',
  company_data = '{"category":"Open Source","tags":["open-source","components","tools","nextjs","react","community"],"github":"https://github.com/saviomds","license":"MIT","visibility_label":"Public"}'::jsonb,
  updated_at   = now()
WHERE id = '7b535947-b361-4c18-a61a-7706a7c6b1c0';

-- ============================================================
-- NEW PAGES — savio (Founder)
-- ============================================================

INSERT INTO public.pages (title, description, created_by, icon, visibility, company_data, created_at, updated_at) VALUES
(
  'Founder Journal — Building in Public',
  'Raw notes from building BeOneOfUs. What shipped, what failed, what I learned. No polish — just the real journey of going from zero to a live platform.',
  '7bab920c-0598-4262-a939-09b1de460145', '📓', 'public',
  '{"category":"Founder","tags":["buildinpublic","founder","startup","journal","beoneofus"],"host":"Dominique Savio","frequency":"Weekly","visibility_label":"Public"}'::jsonb,
  now() - interval '10 days', now()
),
(
  'Tech Deep Dives',
  'Long-form technical explorations from the BeOneOfUs stack. Architecture breakdowns, performance investigations, database design decisions, and everything in between.',
  '7bab920c-0598-4262-a939-09b1de460145', '🔬', 'public',
  '{"category":"Tech","tags":["architecture","engineering","nextjs","supabase","postgres","aws","deepdive"],"host":"Dominique Savio","level":"Intermediate – Advanced","visibility_label":"Public"}'::jsonb,
  now() - interval '7 days', now()
),
(
  'CEO Desk — Strategy & Vision',
  'How I think about product, market, and growth at BeOneOfUs. Notes on strategy, positioning, and the decisions that shape where we are going.',
  '7bab920c-0598-4262-a939-09b1de460145', '🏛️', 'public',
  '{"category":"Business","tags":["strategy","vision","ceo","product","growth","founder"],"host":"Dominique Savio","audience":"Founders & operators","visibility_label":"Public"}'::jsonb,
  now() - interval '4 days', now()
),

-- NEW PAGES — beoneofus (Platform)
(
  'BeOneOfUs — Product Updates',
  'Official product changelog for BeOneOfUs. Every feature shipped, every improvement made, every bug fixed. We ship in the open so you always know what changed and what is coming next.',
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b', '🚀', 'public',
  '{"category":"Product","tags":["changelog","product","updates","features","platform"],"website":"https://beoneofus.work","cadence":"Weekly","visibility_label":"Public"}'::jsonb,
  now() - interval '9 days', now()
),
(
  'Community Spotlight',
  'Every week we shine a light on a member of the BeOneOfUs community — their story, their work, and what they are building.',
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b', '🌟', 'public',
  '{"category":"Community","tags":["community","spotlight","members","founders","builders","creators"],"website":"https://beoneofus.work","cadence":"Weekly","visibility_label":"Public"}'::jsonb,
  now() - interval '6 days', now()
),
(
  'Resources for Builders',
  'Curated tools, templates, guides, and frameworks for developers, founders, and creators. Everything the BeOneOfUs team uses, recommends, or has built — free for the community.',
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b', '📦', 'public',
  '{"category":"Resources","tags":["resources","tools","templates","guides","developers","founders"],"website":"https://beoneofus.work","free":true,"visibility_label":"Public"}'::jsonb,
  now() - interval '3 days', now()
);
