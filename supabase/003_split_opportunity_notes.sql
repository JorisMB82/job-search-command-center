alter table public.opportunities
  add column if not exists interview_prep_notes text,
  add column if not exists resume_tailoring_notes text,
  add column if not exists general_notes text;

update public.opportunities
set general_notes = coalesce(general_notes, notes)
where general_notes is null
  and notes is not null;
