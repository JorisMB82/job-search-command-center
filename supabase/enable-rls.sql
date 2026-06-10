-- Job Search Command Center security hardening
-- Run this once in Supabase SQL Editor after adding SUPABASE_SERVICE_ROLE_KEY to Vercel.
-- The app uses server-side API routes and should access Supabase with the service role key only.

-- 1) Enable Row-Level Security on all known public app tables.
alter table if exists public.opportunities enable row level security;
alter table if exists public.outreach_drafts enable row level security;
alter table if exists public.resume_templates enable row level security;
alter table if exists public.radar_sources enable row level security;
alter table if exists public.radar_signals enable row level security;
alter table if exists public.radar_messages enable row level security;
alter table if exists public.target_companies enable row level security;
alter table if exists public.strategic_angles enable row level security;

-- 2) Remove direct table access from public API roles.
-- With no RLS policies, anon/authenticated users should not be able to read/write rows directly.
revoke all on table public.opportunities from anon, authenticated;
revoke all on table public.outreach_drafts from anon, authenticated;
revoke all on table public.resume_templates from anon, authenticated;
revoke all on table public.radar_sources from anon, authenticated;
revoke all on table public.radar_signals from anon, authenticated;
revoke all on table public.radar_messages from anon, authenticated;
revoke all on table public.target_companies from anon, authenticated;
revoke all on table public.strategic_angles from anon, authenticated;

-- 3) Keep server-side access available through the Supabase service role key.
grant select, insert, update, delete on table public.opportunities to service_role;
grant select, insert, update, delete on table public.outreach_drafts to service_role;
grant select, insert, update, delete on table public.resume_templates to service_role;
grant select, insert, update, delete on table public.radar_sources to service_role;
grant select, insert, update, delete on table public.radar_signals to service_role;
grant select, insert, update, delete on table public.radar_messages to service_role;
grant select, insert, update, delete on table public.target_companies to service_role;
grant select, insert, update, delete on table public.strategic_angles to service_role;
