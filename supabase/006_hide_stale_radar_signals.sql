-- Optional cleanup for stale Radar signals.
-- Use this after changing the Radar scanner to focus on current opportunities only.
-- It dismisses dated, unsaved signals older than 30 days while preserving saved/watched/converted work.

update public.radar_signals
set
  status = 'dismissed',
  notes = trim(coalesce(notes || E'\n\n', '') || 'Auto-dismissed because the signal is older than 30 days.')
where published_at < now() - interval '30 days'
  and status = 'new';
