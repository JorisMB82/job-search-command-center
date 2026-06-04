create extension if not exists pgcrypto;

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company text not null default '',
  role text not null default '',
  location text,
  url text,
  status text not null default 'new' check (status in (
    'new',
    'selected',
    'researching',
    'applied',
    'outreach_drafted',
    'outreach_sent',
    'follow_up_due',
    'interviewing',
    'offer',
    'rejected',
    'closed'
  )),
  job_description text not null default '',
  notes text,
  role_bucket text not null default 'General Strategy & Operations' check (role_bucket in (
    'General Strategy & Operations',
    'Chief of Staff',
    'Digital Assets / RWA',
    'Venture Builder / Startup Operator',
    'Partnerships / Corporate Development'
  )),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  is_pinned boolean not null default false,
  next_action_date date,
  network_notes text,
  source text
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

create index if not exists opportunities_role_bucket_idx on public.opportunities(role_bucket);
create index if not exists opportunities_status_idx on public.opportunities(status);
create index if not exists opportunities_priority_idx on public.opportunities(priority);
create index if not exists opportunities_is_pinned_idx on public.opportunities(is_pinned);
create index if not exists opportunities_next_action_date_idx on public.opportunities(next_action_date);

insert into public.resume_templates (name, content, notes)
values
  ('General Strategy & Operations', '', 'Default resume template for general strategy, operations, and business operations roles.'),
  ('Chief of Staff', '', 'Default resume template for Chief of Staff, founder office, and executive operations roles.'),
  ('Digital Assets / RWA', '', 'Default resume template for digital assets, tokenization, RWA, fintech, and regulated capital markets infrastructure roles.'),
  ('Venture Builder / Startup Operator', '', 'Default resume template for venture studio, startup operator, and early-stage execution roles.'),
  ('Partnerships / Corporate Development', '', 'Default resume template for partnerships, business development, corporate development, and strategic growth roles.')
on conflict do nothing;
