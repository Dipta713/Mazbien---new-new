-- =====================================================================
-- Mazbien AI Training Needs Assessment: schema + Row Level Security
-- Run this first in Supabase -> SQL Editor. Safe to re-run on an empty project.
-- =====================================================================

-- ---------- 1. People -------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'client' check (role in ('client','consultant')),
  created_at  timestamptz not null default now()
);

-- Every new sign-up (email or Google) automatically gets a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for users that signed up before this script ran.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------- 2. Client data -------------------------------------------
create table if not exists public.organizations (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid references auth.users(id) on delete set null,
  name           text not null,
  industry       text,
  employee_range text,
  is_demo        boolean not null default false,   -- true for synthetic seed rows
  created_at     timestamptz not null default now()
);

create table if not exists public.assessments (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  status             text not null default 'draft' check (status in ('draft','submitted','approved')),
  current_ai_use     text,
  confidence_level   text,
  desired_start      text,
  free_text_context  text,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists public.departments (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  name      text not null,
  is_other  boolean not null default false,
  active    boolean not null default true
);

create table if not exists public.assessment_departments (
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  department_id  uuid not null references public.departments(id),
  other_label    text,
  primary key (assessment_id, department_id)
);

-- ---------- 3. Question bank -----------------------------------------
create table if not exists public.questions (
  id               uuid primary key default gen_random_uuid(),
  question_key     text not null unique,
  prompt           text not null,
  help_text        text,
  input_type       text not null check (input_type in ('single','multi')),
  section          text not null,
  required         boolean not null default true,
  max_selections   int,
  active           boolean not null default true,
  display_order    int not null default 0,
  condition_json   jsonb            -- e.g. {"any_of":["departments:finance"]}
);

create table if not exists public.question_options (
  id             uuid primary key default gen_random_uuid(),
  question_id    uuid not null references public.questions(id) on delete cascade,
  option_key     text not null,
  label          text not null,
  is_other       boolean not null default false,
  display_order  int not null default 0,
  active         boolean not null default true,
  unique (question_id, option_key)
);

create table if not exists public.assessment_answers (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  question_id    uuid not null references public.questions(id),
  option_id      uuid references public.question_options(id),
  answer_text    text,              -- only filled when "Other" is picked
  created_at     timestamptz not null default now()
);
create index if not exists idx_answers_assessment on public.assessment_answers(assessment_id);

-- ---------- 4. Commercial catalogue ----------------------------------
create table if not exists public.packages (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null unique,
  tagline           text,
  description       text,
  price_amount      numeric,                         -- null for quote-based
  price_type        text not null default 'one_time' check (price_type in ('one_time','quote')),
  included_details  jsonb not null default '{}'::jsonb,
  display_order     int not null default 0,
  active            boolean not null default true
);

create table if not exists public.addons (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  category       text,
  description    text,
  price_amount   numeric,
  price_type     text not null default 'one_time' check (price_type in ('one_time','quote')),
  active         boolean not null default true
);

-- ---------- 5. Recommendations and choices ---------------------------
create table if not exists public.recommendations (
  id               uuid primary key default gen_random_uuid(),
  assessment_id    uuid not null unique references public.assessments(id) on delete cascade,
  client_summary   text,
  status           text not null default 'draft' check (status in ('draft','approved')),
  approved_by      uuid references auth.users(id),
  approved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.recommendation_items (
  id                 uuid primary key default gen_random_uuid(),
  recommendation_id  uuid not null references public.recommendations(id) on delete cascade,
  title              text not null,
  rationale          text not null,
  priority           text not null default 'medium' check (priority in ('high','medium','low')),
  module_name        text,
  sequence_order     int not null default 0
);

create table if not exists public.recommendation_addons (
  recommendation_id        uuid not null references public.recommendations(id) on delete cascade,
  addon_id                 uuid not null references public.addons(id),
  rationale                text not null,
  approved_by_consultant   boolean not null default false,
  primary key (recommendation_id, addon_id)
);

-- What the CLIENT chose (separate from what the system suggested).
create table if not exists public.assessment_package_choices (
  assessment_id       uuid primary key references public.assessments(id) on delete cascade,
  package_id          uuid not null references public.packages(id),
  payment_preference  text check (payment_preference in ('invoice','card_on_consultation','pay_later','not_sure')),
  chosen_at           timestamptz not null default now()
);

create table if not exists public.assessment_addons (
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  addon_id       uuid not null references public.addons(id),
  added_by       text not null default 'client' check (added_by in ('client','consultant')),
  created_at     timestamptz not null default now(),
  primary key (assessment_id, addon_id)
);

-- Internal notes: consultants only. Clients can never read this table.
create table if not exists public.consultant_notes (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  author_id      uuid references auth.users(id),
  body           text not null,
  created_at     timestamptz not null default now()
);

-- Public contact form.
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  first_name  text,
  last_name   text,
  email       text not null,
  phone       text,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- ---------- 6. Helper functions for RLS ------------------------------
-- security definer = they run with the owner's rights, which avoids RLS loops.
create or replace function public.is_consultant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'consultant')
$$;

create or replace function public.owns_org(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organizations where id = oid and owner_user_id = auth.uid())
$$;

create or replace function public.owns_assessment(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assessments a
    join public.organizations o on o.id = a.organization_id
    where a.id = aid and o.owner_user_id = auth.uid())
$$;

create or replace function public.owns_recommendation(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.recommendations r where r.id = rid and public.owns_assessment(r.assessment_id))
$$;

-- ---------- 7. Row Level Security ------------------------------------
alter table public.profiles                 enable row level security;
alter table public.organizations            enable row level security;
alter table public.assessments              enable row level security;
alter table public.departments              enable row level security;
alter table public.assessment_departments   enable row level security;
alter table public.questions                enable row level security;
alter table public.question_options         enable row level security;
alter table public.assessment_answers       enable row level security;
alter table public.packages                 enable row level security;
alter table public.addons                   enable row level security;
alter table public.recommendations          enable row level security;
alter table public.recommendation_items     enable row level security;
alter table public.recommendation_addons    enable row level security;
alter table public.assessment_package_choices enable row level security;
alter table public.assessment_addons        enable row level security;
alter table public.consultant_notes         enable row level security;
alter table public.contact_messages         enable row level security;

-- profiles: you see yourself; consultants see everyone. Nobody can edit their own role.
create policy "profile: read own"        on public.profiles for select to authenticated using (id = auth.uid());
create policy "profile: consultant read" on public.profiles for select to authenticated using (public.is_consultant());

-- reference data
create policy "departments: read" on public.departments for select to anon, authenticated using (true);
create policy "packages: read"    on public.packages    for select to anon, authenticated using (true);
create policy "addons: read"      on public.addons      for select to anon, authenticated using (true);
create policy "questions: read"   on public.questions        for select to authenticated using (true);
create policy "options: read"     on public.question_options for select to authenticated using (true);

-- organizations
create policy "org: owner all" on public.organizations for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid() and is_demo = false);
create policy "org: consultant read" on public.organizations for select to authenticated using (public.is_consultant());

-- assessments (a client may only set draft/submitted, never approved)
create policy "assessment: owner all" on public.assessments for all to authenticated
  using (public.owns_org(organization_id))
  with check (public.owns_org(organization_id) and status in ('draft','submitted'));
create policy "assessment: consultant read"   on public.assessments for select to authenticated using (public.is_consultant());
create policy "assessment: consultant update" on public.assessments for update to authenticated using (public.is_consultant()) with check (public.is_consultant());

-- child tables of an assessment: owner full access, consultant read
create policy "adept: owner all" on public.assessment_departments for all to authenticated
  using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));
create policy "adept: consultant read" on public.assessment_departments for select to authenticated using (public.is_consultant());

create policy "answers: owner all" on public.assessment_answers for all to authenticated
  using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));
create policy "answers: consultant read" on public.assessment_answers for select to authenticated using (public.is_consultant());

-- choices: owner full access; consultant may also adjust them
create policy "choice: owner all" on public.assessment_package_choices for all to authenticated
  using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));
create policy "choice: consultant all" on public.assessment_package_choices for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

create policy "achoice: owner all" on public.assessment_addons for all to authenticated
  using (public.owns_assessment(assessment_id)) with check (public.owns_assessment(assessment_id));
create policy "achoice: consultant all" on public.assessment_addons for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

-- recommendations: owner can create + read; consultant can do everything
create policy "rec: owner read"   on public.recommendations for select to authenticated using (public.owns_assessment(assessment_id));
create policy "rec: owner insert" on public.recommendations for insert to authenticated
  with check (public.owns_assessment(assessment_id) and status = 'draft');
create policy "rec: consultant all" on public.recommendations for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

create policy "recitem: owner read"   on public.recommendation_items for select to authenticated using (public.owns_recommendation(recommendation_id));
create policy "recitem: owner insert" on public.recommendation_items for insert to authenticated with check (public.owns_recommendation(recommendation_id));
create policy "recitem: consultant all" on public.recommendation_items for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

create policy "recadd: owner read"   on public.recommendation_addons for select to authenticated using (public.owns_recommendation(recommendation_id));
create policy "recadd: owner insert" on public.recommendation_addons for insert to authenticated with check (public.owns_recommendation(recommendation_id));
create policy "recadd: consultant all" on public.recommendation_addons for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

-- internal notes: consultants only
create policy "notes: consultant all" on public.consultant_notes for all to authenticated
  using (public.is_consultant()) with check (public.is_consultant());

-- contact form: anyone can send, only consultants can read
create policy "contact: anyone insert" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "contact: consultant read" on public.contact_messages for select to authenticated using (public.is_consultant());
