# Job Search Command Center V1

A private internal Next.js app for managing job opportunities, resume templates, outreach drafts, and copy/paste ChatGPT analysis prompts.

V1 is intentionally lightweight:

- No OpenAI API integration.
- No AI API key required.
- No LinkedIn automation or scraping.
- No auto-sent emails.
- No auto-applies.
- AI help is limited to prompts you manually copy into ChatGPT Plus.

## Features

- Create opportunities from a public job-posting URL or pasted job description.
- Review and manually edit extracted fields before saving.
- View saved opportunities on the dashboard.
- Open opportunity detail pages.
- Generate and copy a ChatGPT analysis prompt.
- Save outreach drafts without sending them.
- Manage resume templates.
- Protect the private app with a simple one-user password gate.

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
```

Notes:

- Use only the Supabase public anon key.
- Do not add a Supabase service role key to this app.
- Do not hardcode secrets in source files.
- `APP_ACCESS_PASSWORD` is required for private app access in local and deployed environments.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Copy the contents of `supabase/migration.sql`.
4. Run the SQL in the SQL editor.
5. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
6. Copy the public anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The migration creates:

- `public.opportunities`
- `public.outreach_drafts`
- `public.resume_templates`
- `updated_at` triggers for all three tables

This V1 app is protected by the app password gate before Supabase calls are made from the browser. It does not require any Supabase service role key.

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
3. Use a strong unique value for `APP_ACCESS_PASSWORD`.
4. Deploy.
5. Visit the Vercel deployment URL and log in with the app password.

Vercel deployments are reachable by URL, so do not skip `APP_ACCESS_PASSWORD` for this private internal app.

## URL extraction behavior

The URL extraction route is best-effort and intentionally conservative:

- It accepts only `http` and `https` URLs.
- It rejects malformed, localhost, and private-network URLs.
- It rejects LinkedIn URLs because V1 does not scrape LinkedIn.
- It times out slow requests.
- It returns clean errors when a page is blocked, unavailable, non-HTML, or cannot be fetched.
- Manual paste of the job description is always supported as the fallback.

## What V1 does not automate

V1 does not:

- Call the OpenAI API.
- Require an OpenAI or AI provider API key.
- Scrape LinkedIn or logged-in websites.
- Automate LinkedIn actions.
- Send emails automatically.
- Apply to jobs automatically.

Use saved prompts and drafts manually, and review all generated or extracted content before using it.
