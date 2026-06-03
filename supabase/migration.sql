create extension if not exists pgcrypto;

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company text not null default '',
  role text not null default '',
  location text,
  url text,
  status text not null default 'new' check (status in ('new', 'researching', 'applied', 'interviewing', 'offer', 'closed')),
  job_description text not null default '',
  notes text
);

create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  recipient text,
  channel text not null default 'email',
  subject text,
  body text not null default ''
);

create table if not exists public.resume_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  content text not null default '',
  notes text
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

drop trigger if exists outreach_drafts_set_updated_at on public.outreach_drafts;
create trigger outreach_drafts_set_updated_at
before update on public.outreach_drafts
for each row execute function public.set_updated_at();

drop trigger if exists resume_templates_set_updated_at on public.resume_templates;
create trigger resume_templates_set_updated_at
before update on public.resume_templates
for each row execute function public.set_updated_at();
