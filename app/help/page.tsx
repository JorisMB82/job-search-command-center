import { AppHeader } from "../../components/AppHeader";

export default function HelpPage() {
  return (
    <>
      <AppHeader />
      <main className="stack help-page">
        <div>
          <h1>Help</h1>
          <p className="muted">Use this page when you have not used the app for a few days and need to remember the process.</p>
        </div>

        <section className="card stack">
          <h2>The basic logic</h2>
          <p>This app is your private job-search command center. It stores opportunities, resume templates, notes, targets, Radar signals, and manual prompt outputs. ChatGPT is used manually as the analysis engine.</p>
          <div className="help-flow">
            <div><strong>App stores</strong><span>Opportunity details, job posts, resume template buckets, split notes, Radar signals, targets, status, and next actions.</span></div>
            <div><strong>App generates</strong><span>Interview prep, resume tailoring, Radar research, unposted role, proposal outreach, and contact strategy prompts.</span></div>
            <div><strong>ChatGPT produces</strong><span>Briefs, role theses, proposal angles, company analysis, and follow-up drafts.</span></div>
            <div><strong>You paste back</strong><span>Each useful output goes into its matching notes box or Radar target output section.</span></div>
          </div>
        </section>

        <section className="card stack">
          <h2>Opportunity Radar workflow</h2>
          <p>Opportunity Radar is for finding companies with latent hiring, advisory, or unposted-role demand before a job is obvious. It uses public/free sources and manual ChatGPT prompts only.</p>
          <ol className="help-steps">
            <li>Open <strong>Opportunity Radar</strong>.</li>
            <li>If the page says the Radar tables are missing, run <strong>supabase/005_opportunity_radar.sql</strong> in Supabase first.</li>
            <li>Add RSS/public sources or click <strong>Create starter sources</strong>.</li>
            <li>Click <strong>Refresh all active sources</strong> to create Signal Inbox cards.</li>
            <li>Review each signal quickly: Save target, Watch, Dismiss, Build Prompt, or Convert.</li>
            <li>Use <strong>Saved Targets</strong> only for companies worth monitoring or approaching.</li>
            <li>Use <strong>Angle Library</strong> to maintain reusable thesis/service angles.</li>
            <li>Use prompt buttons to manually copy prompts into ChatGPT Plus; paste useful outputs back into Radar target detail.</li>
            <li>Use <strong>Convert to opportunity</strong> only when the company becomes a real job, conversation, or unposted-role target worth tracking in the main dashboard.</li>
          </ol>
          <p className="muted">The app does not send outreach, apply, scrape LinkedIn, or call paid AI/news APIs.</p>
        </section>

        <section className="card stack">
          <h2>Normal opportunity workflow</h2>
          <ol className="help-steps">
            <li>Create or open the opportunity.</li>
            <li>Confirm the resume template / bucket, priority, status, next action date, and whether it should be pinned.</li>
            <li>Open the opportunity detail page.</li>
            <li>Click <strong>Copy short prompt</strong>.</li>
            <li>Paste the prompt into ChatGPT.</li>
            <li>Copy ChatGPT’s Interview Prep Brief.</li>
            <li>Paste it into <strong>Interview Prep Notes</strong>.</li>
            <li>Click <strong>Save interview notes</strong>.</li>
          </ol>
        </section>

        <section className="card stack">
          <h2>Resume tailoring workflow</h2>
          <ol className="help-steps">
            <li>Go to <strong>Resume templates</strong>.</li>
            <li>Paste the full text of each resume version into the matching template.</li>
            <li>Open an opportunity detail page.</li>
            <li>Confirm the opportunity has the right resume template / bucket.</li>
            <li>Click <strong>Copy resume prompt</strong>.</li>
            <li>Paste the prompt into ChatGPT.</li>
            <li>Copy the Resume Tailoring Brief.</li>
            <li>Paste it into <strong>Resume Tailoring Notes</strong>.</li>
            <li>Click <strong>Save resume notes</strong>.</li>
            <li>Use the brief to manually edit your resume before applying.</li>
          </ol>
        </section>

        <section className="card stack">
          <h2>Where each ChatGPT output goes</h2>
          <div className="help-flow">
            <div><strong>Short prompt</strong><span>Paste output into Interview Prep Notes.</span></div>
            <div><strong>Resume prompt</strong><span>Paste output into Resume Tailoring Notes.</span></div>
            <div><strong>Full prompt</strong><span>Paste useful output into General / Call Notes.</span></div>
            <div><strong>Radar prompt</strong><span>Paste output into the Radar target detail output box, then save it.</span></div>
          </div>
        </section>

        <section className="card stack">
          <h2>Dashboard habits</h2>
          <ul className="help-list">
            <li><strong>Use Pinned Top 5</strong> for opportunities that deserve extra effort, warm-intro search, or interview prep.</li>
            <li><strong>Use Needs attention</strong> to catch overdue, stale, or high-priority roles that should not slip.</li>
            <li><strong>Use Resume template map</strong> to see where market volume is appearing across your saved resume versions.</li>
            <li><strong>Use Status funnel</strong> to see where the pipeline is getting stuck.</li>
            <li><strong>Use Opportunity Radar</strong> to create targets before roles are posted.</li>
          </ul>
        </section>

        <section className="card stack">
          <h2>FAQ</h2>
          <div className="stack">
            <article className="mini-card"><strong>Should I delete or archive old opportunities?</strong><p>For real opportunities, use <strong>Closed / Archived</strong> so you preserve history. Use <strong>Delete</strong> only for duplicates, tests, or mistakes.</p></article>
            <article className="mini-card"><strong>Does Radar scan everything?</strong><p>No. It checks the public/free sources you add, mainly RSS feeds and optional Hacker News search. Source quality depends on the URLs you provide.</p></article>
            <article className="mini-card"><strong>Does the app apply or send messages for me?</strong><p>No. It stores data and generates copy/paste prompts. You stay in control of applications, outreach, and follow-ups.</p></article>
            <article className="mini-card"><strong>Do I need to run all prompts?</strong><p>No. Use the prompt that matches the decision you need: interview prep, resume tailoring, company research, unposted role, proposal outreach, or contact strategy.</p></article>
          </div>
        </section>
      </main>
    </>
  );
}
