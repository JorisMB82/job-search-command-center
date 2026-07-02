-- Job Search Command Center V4: Radar efficiency / human-in-the-loop automation
-- Run this once after 005_opportunity_radar.sql.

alter table if exists public.radar_sources
  add column if not exists priority text not null default 'medium',
  add column if not exists scan_frequency text not null default 'weekly';

alter table if exists public.radar_signals
  add column if not exists role_fit_score integer,
  add column if not exists sector_fit_score integer,
  add column if not exists seniority_fit_score integer,
  add column if not exists joris_edge_score integer,
  add column if not exists network_fit_score integer,
  add column if not exists timing_score integer,
  add column if not exists fit_score integer,
  add column if not exists recommended_action text,
  add column if not exists recommended_resume_template text;

alter table if exists public.target_companies
  add column if not exists recommended_action text,
  add column if not exists message_type text,
  add column if not exists fit_score integer,
  add column if not exists fit_thesis text,
  add column if not exists risk_notes text;

update public.radar_sources
set priority = coalesce(nullif(priority, ''), 'medium'),
    scan_frequency = coalesce(nullif(scan_frequency, ''), 'weekly')
where priority is null
   or priority = ''
   or scan_frequency is null
   or scan_frequency = '';

update public.radar_signals
set fit_score = least(100, greatest(0, relevance_score * 10)),
    recommended_action = case
      when least(100, greatest(0, relevance_score * 10)) >= 80 then 'apply'
      when least(100, greatest(0, relevance_score * 10)) >= 65 then 'message'
      when least(100, greatest(0, relevance_score * 10)) >= 50 then 'monitor'
      else 'ignore'
    end
where fit_score is null;

create index if not exists radar_sources_priority_idx on public.radar_sources(priority);
create index if not exists radar_sources_scan_frequency_idx on public.radar_sources(scan_frequency);
create index if not exists radar_signals_fit_score_idx on public.radar_signals(fit_score desc);
create index if not exists radar_signals_recommended_action_idx on public.radar_signals(recommended_action);
create index if not exists target_companies_fit_score_idx on public.target_companies(fit_score desc);
create index if not exists target_companies_recommended_action_idx on public.target_companies(recommended_action);
