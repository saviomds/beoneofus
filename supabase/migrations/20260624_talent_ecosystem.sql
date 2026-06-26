-- Talent ecosystem tables for Career AI, mentors, projects, remote work,
-- companies, startup matching, verified skills, job matches, and interviews.

create extension if not exists pgcrypto;

create table if not exists public.career_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text,
  skills_found text[] default '{}',
  weak_skills jsonb default '[]',
  missing_skills jsonb default '[]',
  score integer default 0 check (score between 0 and 100),
  summary text,
  roadmap jsonb default '{}',
  raw_input text,
  created_at timestamptz default now()
);

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  headline text,
  bio text,
  skills text[] default '{}',
  availability jsonb default '{}',
  hourly_rate numeric(10,2),
  experience_years integer default 0,
  portfolio_url text,
  languages text[] default '{}',
  rating numeric(3,2) default 0,
  session_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  goals text,
  scheduled_at timestamptz,
  duration_mins integer default 60,
  status text default 'requested' check (status in ('requested','accepted','rejected','completed','cancelled')),
  notes text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  roles_needed text[] default '{}',
  tech_stack text[] default '{}',
  category text default 'general',
  github_url text,
  website_url text,
  max_members integer default 5,
  tags text[] default '{}',
  status text default 'active',
  is_public boolean default true,
  showcase_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'Member',
  status text default 'active',
  joined_at timestamptz default now(),
  unique (project_id, user_id)
);

create table if not exists public.project_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  message text,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, user_id)
);

-- NOTE: events table already exists in DB with created_by column.
-- Patch migration adds is_public, event_type, registration_url columns.
-- The RLS policies below use created_by to match the existing schema.
alter table public.events
  add column if not exists is_public boolean default true,
  add column if not exists event_type text default 'event',
  add column if not exists registration_url text;

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  score integer default 0 check (score between 0 and 100),
  matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  explanation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, job_id)
);

create table if not exists public.freelance_jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  company text,
  category text default 'Worldwide',
  job_type text default 'remote',
  budget text,
  duration text,
  skills text[] default '{}',
  apply_url text,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.freelance_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.freelance_jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  cover_note text,
  portfolio_url text,
  rate text,
  status text default 'submitted',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (job_id, applicant_id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  name text not null,
  description text,
  industry text,
  location text,
  size text,
  website text,
  logo_url text,
  tech_stack text[] default '{}',
  culture text,
  remote_policy text default 'Hybrid',
  hiring boolean default false,
  founded_year integer,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  hiring_roles text[] default '{}',
  projects jsonb default '[]',
  reviews jsonb default '[]',
  analytics jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.startup_ideas (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  problem text,
  solution text,
  stage text default 'idea',
  industry text,
  roles_needed text[] default '{}',
  equity_offered boolean default false,
  paid_roles boolean default false,
  tags text[] default '{}',
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.startup_matches (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startup_ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  score integer default 0,
  status text default 'matched',
  created_at timestamptz default now(),
  unique (startup_id, user_id)
);

create table if not exists public.startup_team_requests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startup_ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  message text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (startup_id, user_id)
);

create table if not exists public.skill_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  questions jsonb default '[]',
  answers jsonb,
  score integer check (score between 0 and 100),
  passed boolean default false,
  badge_earned boolean default false,
  time_taken integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.skill_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  score integer not null check (score between 0 and 100),
  test_id uuid references public.skill_tests(id) on delete set null,
  issued_at timestamptz default now(),
  expires_at timestamptz,
  badge_url text,
  unique (user_id, skill)
);

create table if not exists public.interview_rooms (
  id uuid primary key default gen_random_uuid(),
  job_id bigint,
  application_id bigint,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null,
  company text,
  questions jsonb default '[]',
  coding_challenge jsonb,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.interview_rooms(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  question_index integer not null,
  question_text text,
  answer_text text,
  ai_feedback text,
  ai_score integer check (ai_score between 0 and 100),
  strengths text[] default '{}',
  improvements text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (room_id, question_index)
);

create index if not exists career_analysis_user_idx on public.career_analysis(user_id, created_at desc);
create index if not exists mentors_skills_idx on public.mentors using gin(skills);
create index if not exists mentor_sessions_mentee_idx on public.mentor_sessions(mentee_id, created_at desc);
create index if not exists projects_created_by_idx on public.projects(created_by, created_at desc);
create index if not exists project_members_project_idx on public.project_members(project_id);
create index if not exists project_requests_project_idx on public.project_requests(project_id, status);
create index if not exists events_starts_idx on public.events(starts_at);
create index if not exists company_profiles_company_idx on public.company_profiles(company_id);
create index if not exists startup_matches_startup_idx on public.startup_matches(startup_id, score desc);
create index if not exists job_matches_user_idx on public.job_matches(user_id, score desc);
create index if not exists freelance_jobs_status_idx on public.freelance_jobs(status, created_at desc);
create index if not exists freelance_applications_applicant_idx on public.freelance_applications(applicant_id, created_at desc);
create index if not exists companies_hiring_idx on public.companies(hiring, created_at desc);
create index if not exists startup_ideas_founder_idx on public.startup_ideas(founder_id, created_at desc);
create index if not exists skill_tests_user_idx on public.skill_tests(user_id, created_at desc);
create index if not exists interview_rooms_applicant_idx on public.interview_rooms(applicant_id, created_at desc);
create index if not exists interview_answers_room_idx on public.interview_answers(room_id, question_index);

alter table public.career_analysis enable row level security;
alter table public.mentors enable row level security;
alter table public.mentor_sessions enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_requests enable row level security;
alter table public.events enable row level security;
alter table public.job_matches enable row level security;
alter table public.freelance_jobs enable row level security;
alter table public.freelance_applications enable row level security;
alter table public.companies enable row level security;
alter table public.company_profiles enable row level security;
alter table public.startup_ideas enable row level security;
alter table public.startup_matches enable row level security;
alter table public.startup_team_requests enable row level security;
alter table public.skill_tests enable row level security;
alter table public.skill_certifications enable row level security;
alter table public.interview_rooms enable row level security;
alter table public.interview_answers enable row level security;

drop policy if exists "Users manage own career analysis" on public.career_analysis;
create policy "Users manage own career analysis" on public.career_analysis for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Active mentors are readable" on public.mentors;
create policy "Active mentors are readable" on public.mentors for select using (is_active = true or auth.uid() = user_id);
drop policy if exists "Users manage own mentor profile" on public.mentors;
create policy "Users manage own mentor profile" on public.mentors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Mentor sessions visible to participants" on public.mentor_sessions;
create policy "Mentor sessions visible to participants" on public.mentor_sessions for select using (
  auth.uid() = mentee_id or exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid())
);
drop policy if exists "Users book mentor sessions" on public.mentor_sessions;
create policy "Users book mentor sessions" on public.mentor_sessions for insert with check (auth.uid() = mentee_id);
drop policy if exists "Participants update mentor sessions" on public.mentor_sessions;
create policy "Participants update mentor sessions" on public.mentor_sessions for update using (
  auth.uid() = mentee_id or exists (select 1 from public.mentors m where m.id = mentor_id and m.user_id = auth.uid())
);

drop policy if exists "Public projects are readable" on public.projects;
create policy "Public projects are readable" on public.projects for select using (is_public = true or auth.uid() = created_by);
drop policy if exists "Users create projects" on public.projects;
create policy "Users create projects" on public.projects for insert with check (auth.uid() = created_by);
drop policy if exists "Owners update projects" on public.projects;
create policy "Owners update projects" on public.projects for update using (auth.uid() = created_by);
drop policy if exists "Owners delete projects" on public.projects;
create policy "Owners delete projects" on public.projects for delete using (auth.uid() = created_by);

drop policy if exists "Project members are readable" on public.project_members;
create policy "Project members are readable" on public.project_members for select using (true);
drop policy if exists "Users join accepted projects" on public.project_members;
create policy "Users join accepted projects" on public.project_members for insert with check (auth.uid() = user_id);
drop policy if exists "Members manage own project membership" on public.project_members;
create policy "Members manage own project membership" on public.project_members for update using (auth.uid() = user_id);

drop policy if exists "Project requests visible to owners and applicants" on public.project_requests;
create policy "Project requests visible to owners and applicants" on public.project_requests for select using (
  auth.uid() = user_id or exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
);
drop policy if exists "Users create project requests" on public.project_requests;
create policy "Users create project requests" on public.project_requests for insert with check (auth.uid() = user_id);
drop policy if exists "Owners update project requests" on public.project_requests;
create policy "Owners update project requests" on public.project_requests for update using (
  exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
);

drop policy if exists "Public events are readable" on public.events;
create policy "Public events are readable" on public.events for select using (is_public = true or auth.uid() = created_by);
drop policy if exists "Users manage own events" on public.events;
create policy "Users manage own events" on public.events for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "Users manage own job matches" on public.job_matches;
create policy "Users manage own job matches" on public.job_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Open freelance jobs are readable" on public.freelance_jobs;
create policy "Open freelance jobs are readable" on public.freelance_jobs for select using (status = 'open' or auth.uid() = poster_id);
drop policy if exists "Users post freelance jobs" on public.freelance_jobs;
create policy "Users post freelance jobs" on public.freelance_jobs for insert with check (auth.uid() = poster_id);
drop policy if exists "Posters update freelance jobs" on public.freelance_jobs;
create policy "Posters update freelance jobs" on public.freelance_jobs for update using (auth.uid() = poster_id);

drop policy if exists "Freelance applications visible to applicants and posters" on public.freelance_applications;
create policy "Freelance applications visible to applicants and posters" on public.freelance_applications for select using (
  auth.uid() = applicant_id or exists (select 1 from public.freelance_jobs j where j.id = job_id and j.poster_id = auth.uid())
);
drop policy if exists "Users create freelance applications" on public.freelance_applications;
create policy "Users create freelance applications" on public.freelance_applications for insert with check (auth.uid() = applicant_id);
drop policy if exists "Applicants update freelance applications" on public.freelance_applications;
create policy "Applicants update freelance applications" on public.freelance_applications for update using (auth.uid() = applicant_id);

drop policy if exists "Companies are readable" on public.companies;
create policy "Companies are readable" on public.companies for select using (true);
drop policy if exists "Users create companies" on public.companies;
create policy "Users create companies" on public.companies for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners update companies" on public.companies;
create policy "Owners update companies" on public.companies for update using (auth.uid() = owner_id);

drop policy if exists "Company profiles are readable" on public.company_profiles;
create policy "Company profiles are readable" on public.company_profiles for select using (true);
drop policy if exists "Company owners manage profiles" on public.company_profiles;
create policy "Company owners manage profiles" on public.company_profiles for all using (
  exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())
);

drop policy if exists "Public startup ideas are readable" on public.startup_ideas;
create policy "Public startup ideas are readable" on public.startup_ideas for select using (is_public = true or auth.uid() = founder_id);
drop policy if exists "Users create startup ideas" on public.startup_ideas;
create policy "Users create startup ideas" on public.startup_ideas for insert with check (auth.uid() = founder_id);
drop policy if exists "Founders update startup ideas" on public.startup_ideas;
create policy "Founders update startup ideas" on public.startup_ideas for update using (auth.uid() = founder_id);

drop policy if exists "Startup matches visible to founders and users" on public.startup_matches;
create policy "Startup matches visible to founders and users" on public.startup_matches for select using (
  auth.uid() = user_id or exists (select 1 from public.startup_ideas s where s.id = startup_id and s.founder_id = auth.uid())
);
drop policy if exists "Users create startup matches" on public.startup_matches;
create policy "Users create startup matches" on public.startup_matches for insert with check (auth.uid() = user_id);

drop policy if exists "Startup requests visible to founders and users" on public.startup_team_requests;
create policy "Startup requests visible to founders and users" on public.startup_team_requests for select using (
  auth.uid() = user_id or exists (select 1 from public.startup_ideas s where s.id = startup_id and s.founder_id = auth.uid())
);
drop policy if exists "Users create startup requests" on public.startup_team_requests;
create policy "Users create startup requests" on public.startup_team_requests for insert with check (auth.uid() = user_id);
drop policy if exists "Founders update startup requests" on public.startup_team_requests;
create policy "Founders update startup requests" on public.startup_team_requests for update using (
  exists (select 1 from public.startup_ideas s where s.id = startup_id and s.founder_id = auth.uid())
);

drop policy if exists "Users manage own skill tests" on public.skill_tests;
create policy "Users manage own skill tests" on public.skill_tests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Certifications are public" on public.skill_certifications;
create policy "Certifications are public" on public.skill_certifications for select using (true);
drop policy if exists "Users receive own certifications" on public.skill_certifications;
create policy "Users receive own certifications" on public.skill_certifications for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own certifications" on public.skill_certifications;
create policy "Users update own certifications" on public.skill_certifications for update using (auth.uid() = user_id);

drop policy if exists "Interview rooms visible to participants" on public.interview_rooms;
create policy "Interview rooms visible to participants" on public.interview_rooms for select using (auth.uid() = applicant_id or auth.uid() = admin_id);
drop policy if exists "Admins create interview rooms" on public.interview_rooms;
create policy "Admins create interview rooms" on public.interview_rooms for insert with check (auth.uid() = admin_id);
drop policy if exists "Participants update interview rooms" on public.interview_rooms;
create policy "Participants update interview rooms" on public.interview_rooms for update using (auth.uid() = applicant_id or auth.uid() = admin_id);

drop policy if exists "Interview answers visible to participants" on public.interview_answers;
create policy "Interview answers visible to participants" on public.interview_answers for select using (
  auth.uid() = applicant_id or exists (select 1 from public.interview_rooms r where r.id = room_id and r.admin_id = auth.uid())
);
drop policy if exists "Applicants create interview answers" on public.interview_answers;
create policy "Applicants create interview answers" on public.interview_answers for insert with check (auth.uid() = applicant_id);
drop policy if exists "Applicants update interview answers" on public.interview_answers;
create policy "Applicants update interview answers" on public.interview_answers for update using (auth.uid() = applicant_id);

do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    alter publication supabase_realtime add table public.mentors;
    alter publication supabase_realtime add table public.mentor_sessions;
    alter publication supabase_realtime add table public.projects;
    alter publication supabase_realtime add table public.project_members;
    alter publication supabase_realtime add table public.project_requests;
    alter publication supabase_realtime add table public.events;
    alter publication supabase_realtime add table public.freelance_jobs;
    alter publication supabase_realtime add table public.companies;
    alter publication supabase_realtime add table public.company_profiles;
    alter publication supabase_realtime add table public.startup_ideas;
    alter publication supabase_realtime add table public.startup_matches;
    alter publication supabase_realtime add table public.startup_team_requests;
    alter publication supabase_realtime add table public.skill_tests;
    alter publication supabase_realtime add table public.skill_certifications;
    alter publication supabase_realtime add table public.interview_rooms;
    alter publication supabase_realtime add table public.interview_answers;
  end if;
exception
  when duplicate_object then null;
end $$;
