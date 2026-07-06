# Job Search Command Center — User & Architecture Manual

_Last updated: latest production version after Radar source simplification, 30-day signal filtering, interview screen-map workflow, prep-note save safety, and retro dark-mode UI._

## 1. Product purpose

Job Search Command Center is a private job-search operating system. It is designed to help Joris manage a targeted job search, not to automate job applications.

The product helps with:

- Tracking job opportunities and target companies.
- Prioritizing opportunities and next actions.
- Creating structured prompts for manual use in ChatGPT Plus.
- Saving resume tailoring notes, interview prep notes, general/call notes, outreach drafts, and interview screen maps.
- Discovering top-of-funnel company/opportunity signals through Opportunity Radar.
- Preparing compact second-screen interview reference maps.

Core philosophy:

- Manual, private, low-cost workflow.
- No automated outreach.
- No auto-apply.
- No LinkedIn scraping.
- No OpenAI API usage in the app.
- ChatGPT is used manually through copy/paste prompts.

## 2. Main user workflow

### 2.1 Dashboard

The dashboard is the main operating view for the job search.

It is used to:

- Review the active opportunity pipeline.
- See priority items.
- Track status and next actions.
- Create new opportunities.
- Open opportunity detail pages.

Opportunity statuses are defined centrally in `lib/database.types.ts` and currently follow this order:

```text
New / Identified
Selected
Researching
Outreach drafted
Outreach sent
Follow-up due
Applied
Interviewing
Offer
Rejected
Closed / Archived
```

The status order matters because it reflects the user workflow: outreach can happen before a formal application.

### 2.2 Opportunity detail page

The opportunity detail page is the workspace for one company/role.

Main fields:

- Company
- Role
- Location
- Source URL
- Status
- Priority
- Resume template / role bucket
- Job description
- Listing posted date
- Next action date
- Network notes
- Resume tailoring notes
- General / call notes
- Interview prep notes
- Interview screen map

Expected workflow:

1. Save the job opportunity.
2. Choose the right role bucket / resume template.
3. Generate a resume tailoring prompt.
4. Paste ChatGPT output into Resume Tailoring Notes.
5. Generate general/call notes and interview prep prompts.
6. Save all prep notes.
7. Generate the interview screen-map prompt.
8. Paste and save the final screen map.
9. Open the second-screen view during the interview.

The three prep-note boxes are important and are protected by a visible save panel:

- `Resume Tailoring Notes`
- `General / Call Notes`
- `Interview Prep Notes`

The app now includes:

- A large `Save all prep notes` control.
- Individual `Save this note` buttons.
- Unsaved badges.
- Local browser emergency draft storage using `localStorage`.
- Browser close/reload warning when prep notes are unsaved.

The local emergency draft is only a safety net. The user should click `Save all prep notes` before closing the app or relying on the notes for interview prep.

### 2.3 Interview Screen Map

The Interview Screen Map is a final one-page interview cockpit view.

It is generated manually:

1. The app builds a prompt using the current opportunity plus the three prep-note boxes.
2. The user copies the prompt into ChatGPT Plus.
3. ChatGPT returns a compact one-page interview map.
4. The user pastes it back into the app.
5. The user saves it.
6. The user opens `/opportunities/[id]/screen-map` on a second monitor.

The app does not generate a PDF. It uses a browser-based full-screen/landscape-style page.

### 2.4 Outreach Drafts

The app can generate a ChatGPT prompt for outreach.

Workflow:

1. Copy the outreach prompt from an opportunity.
2. Paste into ChatGPT Plus.
3. Paste the final subject/body back into the app.
4. Save the draft.

The app stores one current outreach draft per opportunity by updating the latest existing draft rather than inserting endless duplicates.

Nothing is sent automatically.

### 2.5 Resume Templates

Resume templates live in their own section.

The opportunity detail page tries to match the selected role bucket to a saved resume template.

Important: the resume tailoring prompt uses the selected/matched template. It does not compare every saved resume version unless that is implemented later.

### 2.6 Opportunity Radar

Opportunity Radar is the top-of-funnel sourcing module.

It scans selected sources and creates signals. Signals can then be:

- Dismissed.
- Saved as target companies.
- Watched.
- Converted into normal opportunities.
- Used to generate research, unposted-role, or proposal-outreach prompts.

Radar is intentionally lightweight. It is not a full CRM.

Current implemented source types:

- RSS feeds.
- Hacker News optional search.
- RWA.xyz Tokenization News.
- Tokenized Asset Coalition Research Hub.
- Digital Assets Edge RSS.

Source management workflow:

1. Use recommended presets first.
2. Keep new sources inactive.
3. Test one source manually.
4. Activate only if the source is useful.
5. Keep noisy sources inactive.

The Sources / Scanner page is intentionally simplified:

- Recommended source buttons are visible.
- Advanced custom source creation is hidden under `Advanced`.
- Delete source is hidden under `More`.

The Radar scanner filters dated signals older than 30 days. This is important because older articles are usually not actionable for job search or outreach.

## 3. Technical stack

The app is a private Next.js application.

Core stack:

- Next.js 14
- React 18
- TypeScript
- Supabase
- Vercel
- GitHub

Main package scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

The app does not call the OpenAI API. Prompt generation happens in app code, and the user manually pastes prompts into ChatGPT Plus.

## 4. Repository structure

Key files and folders:

```text
app/
  Main Next.js app routes and API routes.

app/api/opportunities/
  Opportunity create/list API.

app/api/opportunities/[id]/
  Opportunity read/update/delete API.

app/api/radar/
  Radar APIs for sources, signals, targets, angles, prompts, scans, and conversion.

components/
  Main React UI components.

components/DashboardClient.tsx
  Main dashboard UI.

components/OpportunityDetailClient.tsx
  Opportunity detail page, prep notes, prompts, outreach draft flow, and screen-map workflow.

components/OpportunityRadarClient.tsx
  Opportunity Radar UI, signal inbox, saved targets, angle library, sources/scanner.

components/AppHeader.tsx
  Header, navigation, theme toggle, JSCC clock.

lib/
  Shared types, Supabase client, prompt builders, scanner logic.

lib/database.types.ts
  Core app TypeScript data types, opportunity statuses, labels, role buckets.

lib/radar-types.ts
  Radar-specific TypeScript types.

lib/supabase.ts
  Supabase client factory.

lib/prompts.ts
  Opportunity prompt builders.

lib/radar-scanner.ts
  Radar source scanning, classification, scoring, relevance filtering.

supabase/
  SQL migrations and cleanup scripts.
```

## 5. Data model overview

### 5.1 Opportunities

The core table is `opportunities`.

Important fields include:

- `company`
- `role`
- `location`
- `url`
- `status`
- `priority`
- `role_bucket`
- `job_description`
- `notes`
- `resume_tailoring_notes`
- `general_notes`
- `interview_prep_notes`
- `interview_screen_map`
- `network_notes`
- `listing_posted_date`
- `next_action_date`
- `is_pinned`
- `source`

When adding new fields, update all of the following:

1. Supabase SQL migration.
2. `lib/database.types.ts`.
3. `app/api/opportunities/route.ts`.
4. `app/api/opportunities/[id]/route.ts`.
5. Relevant UI component.

### 5.2 Resume templates

Resume templates store reusable resume versions. The opportunity detail page uses the opportunity's role bucket to find a matching template.

### 5.3 Outreach drafts

Outreach drafts store the final human-reviewed message generated externally through ChatGPT. The current design updates the latest draft per opportunity instead of creating unlimited duplicates.

### 5.4 Radar tables

Opportunity Radar uses separate Supabase tables, including:

- `radar_sources`
- `radar_signals`
- `strategic_angles`
- `target_companies`
- `radar_messages`

If Radar fails at runtime while Vercel is deployed successfully, first check whether Supabase is paused or whether the Radar tables exist.

## 6. API routes

### 6.1 Opportunities API

`GET /api/opportunities`

- Lists opportunities ordered by `updated_at` descending.

`POST /api/opportunities`

- Creates a new opportunity.
- Requires company, role, and job description.
- Normalizes optional fields.

`GET /api/opportunities/[id]`

- Loads one opportunity.

`PATCH /api/opportunities/[id]`

- Updates only fields explicitly sent.
- Used for status, priority, notes, screen map, dates, network notes, and other edits.

`DELETE /api/opportunities/[id]`

- Deletes an opportunity.

### 6.2 Radar API

`GET /api/radar/signals`

- Loads visible Radar signals.
- Current logic hides stale dated signals older than 30 days.

`POST /api/radar/scan`

- Scans all active sources or one source by `source_id`.
- Inserts new deduped signals.
- Updates `last_scanned_at` and `last_error` for each source.

`POST /api/radar/convert-to-opportunity`

- Converts a Radar signal into a normal opportunity.

`POST /api/radar/prompts`

- Builds manual ChatGPT prompts for research, unposted roles, proposal outreach, strategic angles, and source discovery.

## 7. Radar scanner logic

Radar scanner lives in:

```text
lib/radar-scanner.ts
```

It is responsible for:

- Fetching source content.
- Parsing RSS/Atom items.
- Searching Hacker News through Algolia.
- Parsing RWA.xyz public tokenization news links.
- Parsing TAC Research Hub public links.
- Creating normalized `ScannedSignal` objects.
- Classifying signal type.
- Scoring relevance.
- Suggesting an angle.
- Filtering stale or low-relevance signals.
- Returning signals for insertion by the API route.

Relevant signal categories include:

- Funding
- Expansion
- Partnership
- Regulatory
- Hiring
- Product launch
- Other

Relevance scoring looks for themes such as:

- Funding
- U.S. expansion
- RWA / tokenization
- Digital assets
- Stablecoins
- Custody
- Partnerships
- Regulation
- Hiring
- Strategy
- Operations
- GTM

Freshness rule:

- Dated signals older than 30 days are filtered out.
- Undated custom-source items may still be accepted if relevant, because some public pages do not expose dates reliably.

## 8. Prompt architecture

Prompt generation is a core product feature.

The app builds prompts locally and the user manually pastes them into ChatGPT Plus.

Prompt types include:

- Resume tailoring prompt.
- Interview prep notes prompt.
- General / call notes prompt.
- Outreach draft prompt.
- Interview screen-map prompt.
- Radar company research prompt.
- Radar unposted-role prompt.
- Radar proposal-outreach prompt.
- Radar source-discovery prompt.

Important product constraint:

- The app should not send prompts to an AI API by itself.
- The user remains in control of what gets sent to ChatGPT and what gets saved back.

## 9. Supabase setup and migrations

Supabase stores app data.

Environment variables expected in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

SQL migrations and cleanup scripts live in:

```text
supabase/
```

SQL is run in:

```text
Supabase Dashboard -> SQL Editor -> New query -> Run
```

Do not run Supabase SQL in GitHub. Do not run it in the local terminal unless using Supabase CLI intentionally.

Current notable SQL scripts include:

- Base app schema.
- Opportunity Radar schema.
- Interview screen map field.
- Digital Assets Edge source seed.
- Stale Radar signal cleanup.

If Supabase is paused, the Vercel app can still build successfully but runtime data calls will fail. If the app shows a generic data error after inactivity, check Supabase project status first.

## 10. Deployment workflow

Current workflow used during development:

1. Inspect relevant files in GitHub.
2. Make small targeted changes.
3. Commit directly to the GitHub repository.
4. Vercel automatically builds and deploys the production branch.
5. User tests the live Vercel app.
6. If build fails, inspect Vercel build logs.
7. If runtime fails, check Supabase status, tables, migrations, and env vars.

Key distinction:

- GitHub stores source code.
- Vercel builds and hosts the app.
- Supabase stores data.
- Supabase SQL Editor applies schema/data scripts.
- ChatGPT Plus is used manually for AI output.

Future best practice:

- Create feature branches for bigger changes.
- Use Vercel preview deployments for testing.
- Merge to production only after user approval.

## 11. UI and theme

The app has a light/dark theme toggle.

Dark mode is a retro arcade/neon style. The header displays:

- `JSCC`
- local time
- local date
- primary navigation
- light/dark mode toggle
- logout

Theme preference is stored in browser `localStorage`.

## 12. Known warnings and operational issues

### 12.1 Vercel React hook warnings

There have been non-blocking Vercel warnings related to React Hook dependency arrays. These do not block deployment but should eventually be cleaned.

### 12.2 Supabase security warnings

Supabase may show function search-path warnings for timestamp trigger functions. These are hardening warnings, not app blockers. They can be fixed by setting a function search path in SQL.

### 12.3 Supabase paused project

If the Supabase free project is paused, the app may display runtime data errors even if Vercel shows a successful deployment.

### 12.4 Radar source noise

Some sources are noisy. Keep sources inactive until tested. Activate only reliable ones.

## 13. Development guardrails

A developer taking over should follow these rules:

1. Keep the app manual and private.
2. Do not add automated job applications.
3. Do not add automated outreach.
4. Do not scrape LinkedIn.
5. Avoid paid APIs unless explicitly approved.
6. Keep changes small and reversible.
7. Inspect current code before changing behavior.
8. Update Supabase SQL, types, API routes, and UI together when adding fields.
9. Keep Radar sources inactive by default unless they are proven useful.
10. Preserve the copy/paste ChatGPT workflow.
11. Prefer UX clarity over adding more buttons.
12. Treat saved user notes as high-value data; avoid changes that risk data loss.

## 14. Suggested next improvements

Potential next improvements:

- Manual Signal Capture / Telegram Paste Inbox.
- Better source quality controls: Useful, Noisy, Watch only.
- One-click dismiss all low-score signals.
- Cleaner Signal Inbox card hierarchy.
- Add source filters by category and active/inactive status.
- Add a compact onboarding/help page.
- Add a proper branch + preview deployment workflow.
- Add automated tests around prompt builders and API normalization.

## 15. Quick troubleshooting checklist

If Vercel build fails:

1. Open Vercel build logs.
2. Check TypeScript errors first.
3. Check lint errors second.
4. Fix code in GitHub and wait for redeploy.

If app loads but data fails:

1. Check Supabase project is active.
2. Check required tables exist.
3. Check Vercel env vars.
4. Check API route error messages.
5. Check recent migrations were run.

If Radar shows no sources:

1. Go to Sources / Scanner.
2. Click Add missing starter sources.
3. Keep them inactive.
4. Test one source at a time.
5. Activate only useful sources.

If old Radar signals appear:

1. Confirm latest deployment includes 30-day filtering.
2. Run stale signal cleanup SQL in Supabase if needed.
3. Refresh Radar.

If prep notes seem missing:

1. Check whether notes were saved with Save all prep notes.
2. Check if the local browser draft restored.
3. Search the original ChatGPT conversation used to generate the notes.
4. Going forward, save before closing or generating the screen map.
