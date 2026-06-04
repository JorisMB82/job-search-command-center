alter table public.opportunities
  add column if not exists role_bucket text not null default 'General Strategy & Operations',
  add column if not exists priority text not null default 'medium',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists next_action_date date,
  add column if not exists network_notes text,
  add column if not exists source text;

alter table public.opportunities
  drop constraint if exists opportunities_status_check;

alter table public.opportunities
  add constraint opportunities_status_check check (status in (
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
  ));

alter table public.opportunities
  drop constraint if exists opportunities_role_bucket_check;

alter table public.opportunities
  add constraint opportunities_role_bucket_check check (role_bucket in (
    'General Strategy & Operations',
    'Chief of Staff',
    'Digital Assets / RWA',
    'Venture Builder / Startup Operator',
    'Partnerships / Corporate Development'
  ));

alter table public.opportunities
  drop constraint if exists opportunities_priority_check;

alter table public.opportunities
  add constraint opportunities_priority_check check (priority in ('high', 'medium', 'low'));

create index if not exists opportunities_role_bucket_idx on public.opportunities(role_bucket);
create index if not exists opportunities_status_idx on public.opportunities(status);
create index if not exists opportunities_priority_idx on public.opportunities(priority);
create index if not exists opportunities_is_pinned_idx on public.opportunities(is_pinned);
create index if not exists opportunities_next_action_date_idx on public.opportunities(next_action_date);
