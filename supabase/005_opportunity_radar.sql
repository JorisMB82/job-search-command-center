create extension if not exists pgcrypto;

create or replace function public.radar_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.radar_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  url text not null,
  source_type text not null default 'rss',
  category text,
  keywords text[] not null default array[]::text[],
  is_active boolean not null default true,
  notes text,
  last_scanned_at timestamptz,
  last_error text
);

create table if not exists public.radar_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_id uuid references public.radar_sources(id) on delete set null,
  company text,
  headline text not null,
  url text,
  source_name text,
  published_at timestamptz,
  signal_type text not null default 'other',
  category text,
  summary text,
  raw_excerpt text,
  relevance_score integer not null default 0,
  status text not null default 'new',
  suggested_angle text,
  notes text,
  chatgpt_output text,
  dedupe_key text unique
);

create table if not exists public.strategic_angles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text,
  best_fit_company text,
  trigger_signals text[] not null default array[]::text[],
  pain_hypothesis text,
  credibility_points text,
  short_pitch text,
  longer_thesis text,
  cta text,
  relevant_resume_template text,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.target_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company text not null,
  website text,
  sector text,
  stage text,
  target_status text not null default 'watching',
  best_signal_id uuid references public.radar_signals(id) on delete set null,
  best_angle_id uuid references public.strategic_angles(id) on delete set null,
  selected_resume_template text,
  why_interesting text,
  pain_hypothesis text,
  unposted_role_thesis text,
  proposal_angle text,
  contact_strategy text,
  outreach_status text not null default 'not_contacted',
  contact_name text,
  contact_title text,
  contact_url text,
  last_touch_date date,
  next_action_date date,
  notes text
);

create table if not exists public.radar_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  target_company_id uuid references public.target_companies(id) on delete cascade,
  signal_id uuid references public.radar_signals(id) on delete set null,
  angle_id uuid references public.strategic_angles(id) on delete set null,
  message_type text not null,
  prompt_text text,
  output_text text,
  status text not null default 'draft',
  notes text
);

create index if not exists radar_sources_active_idx on public.radar_sources(is_active);
create index if not exists radar_sources_type_idx on public.radar_sources(source_type);
create index if not exists radar_signals_status_score_idx on public.radar_signals(status, relevance_score desc);
create index if not exists radar_signals_published_idx on public.radar_signals(published_at desc);
create index if not exists radar_signals_source_idx on public.radar_signals(source_id);
create index if not exists target_companies_status_idx on public.target_companies(target_status);
create index if not exists target_companies_company_idx on public.target_companies(company);
create index if not exists radar_messages_target_idx on public.radar_messages(target_company_id);
create index if not exists radar_messages_signal_idx on public.radar_messages(signal_id);

drop trigger if exists radar_sources_set_updated_at on public.radar_sources;
create trigger radar_sources_set_updated_at
before update on public.radar_sources
for each row execute function public.radar_set_updated_at();

drop trigger if exists radar_signals_set_updated_at on public.radar_signals;
create trigger radar_signals_set_updated_at
before update on public.radar_signals
for each row execute function public.radar_set_updated_at();

drop trigger if exists strategic_angles_set_updated_at on public.strategic_angles;
create trigger strategic_angles_set_updated_at
before update on public.strategic_angles
for each row execute function public.radar_set_updated_at();

drop trigger if exists target_companies_set_updated_at on public.target_companies;
create trigger target_companies_set_updated_at
before update on public.target_companies
for each row execute function public.radar_set_updated_at();

drop trigger if exists radar_messages_set_updated_at on public.radar_messages;
create trigger radar_messages_set_updated_at
before update on public.radar_messages
for each row execute function public.radar_set_updated_at();
