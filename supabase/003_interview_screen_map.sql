alter table public.opportunities
  add column if not exists interview_screen_map text;
