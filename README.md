# Job Search Command Center V4

A private internal Next.js app for managing job opportunities, resume templates, outreach drafts, Opportunity Radar signals, and copy/paste ChatGPT analysis prompts.

The app remains intentionally manual-first:

- No OpenAI API integration.
- No paid AI API key required.
- No LinkedIn automation or scraping.
- No auto-sent emails.
- No auto-applies.
- AI help is limited to prompts you manually copy into ChatGPT Plus.

## Features

### Main pipeline

- Create opportunities from a public job-posting URL or pasted job description.
- Review and manually edit extracted fields before saving.
- View saved opportunities on the dashboard.
- Organize opportunities by role bucket, priority, source, status, and next action date.
- Pin priority opportunities for warm-intro and follow-up focus.
- View role-bucket volume and status funnel summaries.
- Open opportunity detail pages.
- Generate and copy short or full ChatGPT analysis prompts.
- Generate and save an interview screen map for a second-monitor interview view.
- Save outreach drafts without sending them.
- Manage resume templates.
- Protect the private app with a simple one-user password gate.

### Opportunity Radar V4

- Review Board for top signals, recent signals, and follow-ups due.
- Signal Inbox with fit scoring and action filters.
- Scorecard using: role fit 25, sector fit 20, seniority fit 15, Joris edge 20, network/access 10, timing 10.
- Recommended action: apply, message, monitor, or ignore.
- Recommended resume template per signal or target.
- Application-prep and review prompts for manual ChatGPT use.
- Saved Targets with fit score, thesis, risks, message type, and next action.
- Source priority and scan frequency fields.
- Optional Vercel cron refresh for due active sources.

## Environment variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Set these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-public-anon-key
APP_ACCESS_PASSWORD=choose-a-strong-private-password
CRON_SECRET=optional-secret-for-vercel-cron
```

Notes:

- Use only the Supabase public anon key.
- Do not add a Supabase service role key to this app.
- Do not hardcode secrets in source files.
- `APP_ACCESS_PASSWORD` is required for private app access in local and deployed environments.
- `CRON_SECRET` is only needed if you want the scheduled Radar scan endpoint enabled.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. For a new database, copy the contents of `supabase/migration.sql`.
4. Run the SQL in the SQL editor.
5. For an existing V1 database that already ran the first migration, run `supabase/002_dashboard_upgrade.sql` once.
6. For the interview screen-map upgrade, run `supabase/003_interview_screen_map.sql` once.
7. For Opportunity Radar tables, run `supabase/005_opportunity_radar.sql` once.
8. For Radar V4 fields, run `supabase/006_radar_v4_efficiency.sql` once.
9. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
10. Copy the public anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The migrations create or upgrade:

- `public.opportunities`
- `public.outreach_drafts`
- `public.resume_templates`
- `public.radar_sources`
- `public.radar_signals`
- `public.strategic_angles`
- `public.target_companies`
- `public.radar_messages`
- dashboard fields on `opportunities`: `role_bucket`, `priority`, `is_pinned`, `next_action_date`, `network_notes`, and `source`
- prep fields on `opportunities`: `interview_prep_notes`, `resume_tailoring_notes`, `general_notes`, and `interview_screen_map`
- Radar V4 fields: source priority/frequency, signal fit score/action/resume template, and target fit thesis/risk/action fields
- `updated_at` triggers and useful dashboard/Radar indexes

This app is protected by the app password gate before Supabase calls are made from the browser. It does not require any Supabase service role key.

## Local development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`, enter `APP_ACCESS_PASSWORD`, and use the app.

Recommended checks before merging or deploying:

```bash
npm run typecheck
npm run lint
npm run build
```

If the Codex or CI environment still receives an HTTP 403 from the npm registry/proxy during `npm install`, dependency installation and the typecheck/lint/build commands cannot complete there. Run the commands in an environment with registry access before merging.

## Deploying to Vercel

1. Import the repository into Vercel.
2. In Vercel Project Settings, add environment variables for Production and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_ACCESS_PASSWORD`
   - `CRON_SECRET` if using scheduled Radar scans
3. Use a strong unique value for `APP_ACCESS_PASSWORD`.
4. Deploy.
5. Visit the Vercel deployment URL and log in with the app password.

Vercel deployments are reachable by URL, so do not skip `APP_ACCESS_PASSWORD` for this private internal app.

## URL extraction behavior

The URL extraction route is best-effort and intentionally conservative:

- It accepts only `http` and `https` URLs.
- It rejects malformed, localhost, and private-network URLs.
- It rejects LinkedIn URLs because the app does not scrape LinkedIn.
- It times out slow requests.
- It returns clean errors when a page is blocked, unavailable, non-HTML, or cannot be fetched.
- Manual paste of the job description is always supported as the fallback.

## What this app does not automate

The app does not:

- Call the OpenAI API.
- Require an OpenAI or AI provider API key.
- Scrape LinkedIn or logged-in websites.
- Automate LinkedIn actions.
- Send emails automatically.
- Apply to jobs automatically.

Use saved prompts and drafts manually, and review all generated or extracted content before using it.
