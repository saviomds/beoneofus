-- ============================================================
-- Professional posts for founder and platform admin accounts
-- ============================================================

INSERT INTO public.posts (user_id, title, content, category, comment_count, created_at)
VALUES

-- ============================================================
-- savio (Founder) posts
-- ============================================================

(
  '7bab920c-0598-4262-a939-09b1de460145',
  'Why I built BeOneOfUs — and what''s coming next',
  'A year ago, I sat down with one question: why is it still so hard for talented people to find each other and build together?

LinkedIn feels corporate. Discord is chaotic. Nothing felt built for the person who is learning, building, and trying to grow at the same time.

So I built BeOneOfUs.

A platform where your profile is your work, your network is your community, and tools like the marketplace, AI assistant, coaching, and events actually serve you — not advertisers.

Here''s what I''ve learned so far:

→ The hardest part of building a platform isn''t the code. It''s earning trust.
→ Every feature you ship teaches you something the roadmap never predicted.
→ Community is infrastructure. Build it before you need it.

We''re still early. But the foundation is solid and the momentum is real.

If you''re a builder, founder, developer, or creator — BeOneOfUs was built for you.

Link in bio. Come see what we''re making.',
  'Business',
  4,
  now() - interval '5 days'
),

(
  '7bab920c-0598-4262-a939-09b1de460145',
  'The stack that powers BeOneOfUs (and why I chose it)',
  'People keep asking about our tech stack — so here''s a full breakdown.

Frontend: Next.js 15 (App Router)
Database + Auth: Supabase (PostgreSQL + RLS)
Hosting: Vercel
AI layer: Groq (with Claude fallback)
Storage: Supabase Storage
Styling: Tailwind CSS

Why this stack?

→ Next.js App Router gives us server components, streaming, and edge-ready routing out of the box.
→ Supabase handles auth, real-time, storage, and Postgres — one platform instead of five.
→ Vercel makes deployment a non-event. Push to main, done.
→ Groq is fast enough to feel instant for AI features.

The result: a full-featured social + professional platform with a tiny team and zero backend servers to manage.

If you''re building a product in 2026 and not using this stack, I''d genuinely ask why.

Happy to answer any questions about specific decisions below.',
  'Tech',
  7,
  now() - interval '3 days'
),

(
  '7bab920c-0598-4262-a939-09b1de460145',
  '🎓 Completed: AWS Certified Solutions Architect — Associate',
  'I''m excited to share that I have officially earned the AWS Certified Solutions Architect — Associate certification.

This one took real preparation — covering VPCs, IAM, EC2, S3, RDS, Lambda, CloudFront, and system design at scale. Not just theory — I rebuilt core parts of the BeOneOfUs infrastructure with what I learned along the way.

What changed after studying for this:

✅ I now design with failure in mind, not as an afterthought
✅ Our cloud costs dropped after I restructured our storage and compute layers
✅ I understand why certain architectural decisions I made early were wrong — and fixed them

For anyone building on AWS without this cert: strongly recommend it. Not for the badge, but for the mental model it gives you around distributed systems.

Next target: AWS Solutions Architect Professional.

If you''re studying for this, feel free to reach out — happy to share resources.',
  'Achievement',
  12,
  now() - interval '1 day'
),

(
  '7bab920c-0598-4262-a939-09b1de460145',
  '3 lessons from building a platform solo as a first-time founder',
  'Six months in. Here''s what actually mattered:

1. Ship embarrassingly early.
   The version I was "too embarrassed" to show people is the one that got the first real users. Done beats perfect, every single time.

2. Talk to users before you build, not after.
   I spent two weeks building a feature no one asked for. One 20-minute conversation would have saved me the time. Now I talk first, build second.

3. Your energy is the product''s energy.
   When I was burnt out, the product showed it — slow updates, rough edges, no communication. When I''m energized, everything moves. Protect your focus like it''s your most important resource.

Building solo is hard. But it''s also the fastest education I''ve ever had.

What''s a lesson you learned the hard way as a builder or founder?',
  'Business',
  9,
  now() - interval '8 days'
),

-- ============================================================
-- beoneofus (Platform) posts
-- ============================================================

(
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b',
  'Welcome to BeOneOfUs — here''s everything you can do here',
  'If you just joined, this post is for you.

BeOneOfUs is not just another social platform. Here''s what you actually get:

🧑‍💻 Professional Profile — Your public page with bio, skills, resume, certificates, and work history. Your work, your story.

📣 Posts & Community Feed — Share insights, projects, code snippets, achievements, and ideas with the community.

🛒 Marketplace — Buy and sell digital products, templates, tools, and services.

🤖 AI Assistant — Get help with code, writing, strategy, and learning — built right into the platform.

🎓 Certificates — Earn and display verified credentials from courses and achievements.

📅 Events — Attend and host virtual events, workshops, and meetups.

💼 Jobs Board — Find opportunities or post roles for your team.

🏆 Premium — Unlock advanced features, priority visibility, and exclusive tools.

Start by completing your profile. The more you put in, the more the community gives back.

We''re glad you''re here.',
  'General',
  6,
  now() - interval '6 days'
),

(
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b',
  'Platform update: what we shipped this week',
  'Quick update on what went live this week at BeOneOfUs:

✅ Resume builder — add education, work experience, and toggle visibility per section
✅ Public profile pages at /u/[username] — your profile is now shareable
✅ Certificate display — verified credentials now show on your profile
✅ Groq AI integration — faster AI responses across the platform
✅ Notification system — real-time alerts for mentions, tasks, and activity
✅ Premium badge — verified premium members now display a badge on their profile

We ship every week. Sometimes more.

If you hit a bug or have a feature request, drop it in the community feed or reach out directly.

More coming. Stay close.',
  'Tech',
  3,
  now() - interval '2 days'
),

(
  '2cbf08ca-e6e3-4c1a-9de8-e703062f7c7b',
  'The BeOneOfUs Premium plan — what you get and why it exists',
  'A few people have asked about Premium. Here''s the honest version.

What Premium gives you:
→ Premium badge on your profile
→ Priority visibility in search and community feeds
→ Access to advanced AI features
→ Early access to new platform features
→ Support the platform directly

Why it exists:
We don''t run ads. We don''t sell your data. The only way we keep building is if the people who get value from the platform choose to support it.

Premium is not a paywall on basic features. Everything core stays free. Premium is for people who want more — and want to invest in where this is going.

If you''re getting value from BeOneOfUs, consider upgrading. It directly funds the next feature you''ll use.

Request access from your dashboard.',
  'Business',
  5,
  now() - interval '4 days'
);
