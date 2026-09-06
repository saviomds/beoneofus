-- ============================================================================
-- Study Abroad / Work Abroad client portal — real backend tables
-- ============================================================================
-- Backs the /web-only client application portal (src/app/_study-work,
-- src/app/study-abroad, src/app/work-abroad, src/app/apply/*). Previously this
-- feature ran entirely on frontend localStorage; this migration gives it real,
-- admin-visible storage so the platform admin dashboard can manage applicants
-- (see AdminPanelTool.js "Study/Work Abroad" tab).
--
-- All id columns are `text`, not `uuid`. The client-side id generator
-- (services/storage.ts newId()) produces opaque strings like "app-a1b2c3d4",
-- and the seeded demo data uses fixed ids like "app-study-mu-0001" — using
-- `text` here means neither has to change, keeping this a pure additive
-- backend swap with zero ripple into already-built/tested UI code.
--
-- `user_id` is NOT a foreign key to auth.users: a real signed-in beoneofus
-- visitor's user_id is their real auth.uid() (cast to text), but a visitor
-- using this feature without a full beoneofus account gets a locally
-- generated mock id that has no corresponding auth.users row at all — that's
-- the deliberate "keep using your account if you have one, otherwise a quick
-- local identity" design from the original spec.
--
-- Writes go through two service-role API routes, not directly from the
-- browser with the anon key:
--   - /api/study-work/sync   — applicant-facing upsert (mirrors the local
--     cache so the demo/mock applicant flow keeps working instantly, offline,
--     with zero UI ripple, while also landing in real storage for admins)
--   - /api/study-work/admin  — admin-only reads/updates (status changes,
--     document review, final documents), gated the same way as the existing
--     /api/admin/user-flags route (bearer token -> profiles.is_admin check).
--
-- RLS below is defense-in-depth for any future direct client query, not the
-- primary enforcement (the routes above use the service role key, which
-- bypasses RLS entirely). It intentionally still lets an authenticated owner
-- update their own application's status — this is a demo/showcase feature
-- whose "Demo Mode" switcher lets an applicant preview every stage without a
-- human moving them there; lock this down to admin-only transitions before
-- treating this as a real production immigration pipeline. Mock (non-
-- beoneofus) applicants never match auth.uid() at all, so RLS silently denies
-- them direct access either way — they can only be reached through the
-- service-role sync route, same trust level as the old editable-in-devtools
-- localStorage they replace.
-- ============================================================================

begin;

create table if not exists public.study_work_applicant_profiles (
  user_id               text primary key,
  email                 text not null,
  first_name            text not null default '',
  middle_name           text not null default '',
  last_name             text not null default '',
  phone                 text not null default '',
  nationality           text not null default '',
  country_of_residence  text not null default '',
  date_of_birth         text not null default '',
  created_at            timestamptz not null default now()
);

create table if not exists public.study_work_applications (
  id                 text primary key,
  application_number text unique not null,
  user_id            text not null,
  type               text not null check (type in ('study', 'work')),
  destination        text not null default '',
  status             text not null default 'DRAFT' check (status in (
                       'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CONFIRMED', 'FULL_APPLICATION',
                       'DOCUMENT_COLLECTION', 'DOCUMENT_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED',
                       'PROCESSING', 'APPROVED', 'COMPLETED', 'REJECTED'
                     )),
  progress           int not null default 0,
  created_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  confirmed_at       timestamptz,
  personal           jsonb not null default '{}',
  study              jsonb not null default '{}',
  work               jsonb not null default '{}',
  travel             jsonb not null default '{}',
  draft_step         int not null default 0,
  updated_at         timestamptz not null default now()
);
create index if not exists study_work_applications_user_id_idx on public.study_work_applications(user_id);

create table if not exists public.study_work_requirements (
  id             text primary key,
  application_id text not null references public.study_work_applications(id) on delete cascade,
  name           text not null,
  description    text not null default '',
  required       boolean not null default true,
  status         text not null default 'NOT_STARTED' check (status in (
                   'NOT_STARTED', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
                   'NEEDS_CORRECTION', 'COMPLETED'
                 )),
  deadline       text,
  instructions   text not null default ''
);
create index if not exists study_work_requirements_app_id_idx on public.study_work_requirements(application_id);

create table if not exists public.study_work_documents (
  id                text primary key,
  application_id    text not null references public.study_work_applications(id) on delete cascade,
  requirement_id    text references public.study_work_requirements(id) on delete set null,
  name              text not null,
  description       text not null default '',
  required          boolean not null default true,
  status            text not null default 'MISSING' check (status in (
                      'MISSING', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CORRECTION'
                    )),
  file_name         text,
  uploaded_at       timestamptz,
  reviewer_comment  text,
  accepted_formats  text[] not null default '{}',
  max_size_mb       int not null default 10
);
create index if not exists study_work_documents_app_id_idx on public.study_work_documents(application_id);

create table if not exists public.study_work_final_documents (
  id             text primary key,
  application_id text not null references public.study_work_applications(id) on delete cascade,
  name           text not null,
  category       text not null default 'Other',
  file_name      text not null,
  issued_at      timestamptz not null default now()
);
create index if not exists study_work_final_documents_app_id_idx on public.study_work_final_documents(application_id);

create table if not exists public.study_work_conversations (
  id               text primary key,
  application_id   text not null unique references public.study_work_applications(id) on delete cascade,
  advisor_name     text not null,
  advisor_role     text not null,
  last_message_at  timestamptz not null default now(),
  unread           int not null default 0
);

create table if not exists public.study_work_messages (
  id              text primary key,
  conversation_id text not null references public.study_work_conversations(id) on delete cascade,
  sender          text not null check (sender in ('client', 'advisor')),
  sender_name     text not null,
  body            text not null,
  attachments     jsonb not null default '[]',
  created_at      timestamptz not null default now()
);
create index if not exists study_work_messages_conv_id_idx on public.study_work_messages(conversation_id);

create table if not exists public.study_work_notifications (
  id             text primary key,
  user_id        text not null,
  application_id text references public.study_work_applications(id) on delete cascade,
  type           text not null,
  title          text not null,
  body           text not null default '',
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists study_work_notifications_user_id_idx on public.study_work_notifications(user_id);

create table if not exists public.study_work_timeline (
  id             text primary key,
  application_id text not null references public.study_work_applications(id) on delete cascade,
  label          text not null,
  description    text not null default '',
  status         text not null default 'upcoming' check (status in ('done', 'current', 'upcoming')),
  date           text
);
create index if not exists study_work_timeline_app_id_idx on public.study_work_timeline(application_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.study_work_applicant_profiles enable row level security;
alter table public.study_work_applications        enable row level security;
alter table public.study_work_requirements        enable row level security;
alter table public.study_work_documents           enable row level security;
alter table public.study_work_final_documents     enable row level security;
alter table public.study_work_conversations       enable row level security;
alter table public.study_work_messages            enable row level security;
alter table public.study_work_notifications       enable row level security;
alter table public.study_work_timeline            enable row level security;

drop policy if exists "own or admin select" on public.study_work_applicant_profiles;
create policy "own or admin select" on public.study_work_applicant_profiles for select using (
  user_id = auth.uid()::text or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder'))
  )
);
drop policy if exists "own insert" on public.study_work_applicant_profiles;
create policy "own insert" on public.study_work_applicant_profiles for insert with check (user_id = auth.uid()::text);
drop policy if exists "own or admin update" on public.study_work_applicant_profiles;
create policy "own or admin update" on public.study_work_applicant_profiles for update using (
  user_id = auth.uid()::text or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder'))
  )
);

drop policy if exists "own or admin select" on public.study_work_applications;
create policy "own or admin select" on public.study_work_applications for select using (
  user_id = auth.uid()::text or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder'))
  )
);
drop policy if exists "own insert" on public.study_work_applications;
create policy "own insert" on public.study_work_applications for insert with check (user_id = auth.uid()::text);
drop policy if exists "own or admin update" on public.study_work_applications;
create policy "own or admin update" on public.study_work_applications for update using (
  user_id = auth.uid()::text or exists (
    select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder'))
  )
);

drop policy if exists "own or admin select" on public.study_work_requirements;
create policy "own or admin select" on public.study_work_requirements for select using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "owner insert" on public.study_work_requirements;
create policy "owner insert" on public.study_work_requirements for insert with check (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
);
drop policy if exists "own or admin update" on public.study_work_requirements;
create policy "own or admin update" on public.study_work_requirements for update using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own or admin select" on public.study_work_documents;
create policy "own or admin select" on public.study_work_documents for select using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "owner insert" on public.study_work_documents;
create policy "owner insert" on public.study_work_documents for insert with check (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
);
drop policy if exists "own or admin update" on public.study_work_documents;
create policy "own or admin update" on public.study_work_documents for update using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own or admin select" on public.study_work_final_documents;
create policy "own or admin select" on public.study_work_final_documents for select using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "admin only write" on public.study_work_final_documents;
create policy "admin only write" on public.study_work_final_documents for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own or admin select" on public.study_work_conversations;
create policy "own or admin select" on public.study_work_conversations for select using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "own or admin write" on public.study_work_conversations;
create policy "own or admin write" on public.study_work_conversations for all using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
) with check (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own or admin select" on public.study_work_messages;
create policy "own or admin select" on public.study_work_messages for select using (
  exists (
    select 1 from public.study_work_conversations c
    join public.study_work_applications a on a.id = c.application_id
    where c.id = conversation_id and a.user_id = auth.uid()::text
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "own or admin insert" on public.study_work_messages;
create policy "own or admin insert" on public.study_work_messages for insert with check (
  exists (
    select 1 from public.study_work_conversations c
    join public.study_work_applications a on a.id = c.application_id
    where c.id = conversation_id and a.user_id = auth.uid()::text
  )
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own select" on public.study_work_notifications;
create policy "own select" on public.study_work_notifications for select using (
  user_id = auth.uid()::text
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "own or admin write" on public.study_work_notifications;
create policy "own or admin write" on public.study_work_notifications for all using (
  user_id = auth.uid()::text
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
) with check (
  user_id = auth.uid()::text
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

drop policy if exists "own or admin select" on public.study_work_timeline;
create policy "own or admin select" on public.study_work_timeline for select using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);
drop policy if exists "own or admin write" on public.study_work_timeline;
create policy "own or admin write" on public.study_work_timeline for all using (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
) with check (
  exists (select 1 from public.study_work_applications a where a.id = application_id and a.user_id = auth.uid()::text)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin = true or p.role in ('admin', 'founder')))
);

commit;
