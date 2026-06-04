alter table public.opportunities
  add column if not exists listing_posted_date date;
