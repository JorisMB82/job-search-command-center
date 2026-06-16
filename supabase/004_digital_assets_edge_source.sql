-- Optional inactive Radar source seed for The Digital Assets Edge.
-- Run this only if you want to add the source directly through Supabase SQL.

insert into public.radar_sources (name, url, source_type, category, keywords, is_active, notes)
select 'The Digital Assets Edge RSS', 'https://www.digitalassetsedge.com/rssfeed.php', 'rss', 'Digital Assets / RWA', '{"digital assets","tokenisation","tokenization","custody","stablecoin","collateral","treasury","market infrastructure","securities finance","regulation"}'::text[], false, 'Inactive starter source. Uses the existing RSS scanner; test manually before activating.'
where not exists (
  select 1 from public.radar_sources where url = 'https://www.digitalassetsedge.com/rssfeed.php'
);
