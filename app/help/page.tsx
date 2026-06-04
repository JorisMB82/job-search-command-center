import { AppHeader } from "../../components/AppHeader";

export default function HelpPage() {
  return (
    <>
      <AppHeader />
      <main className="stack help-page">
        <div>
          <h1>Help / Workflow Guide</h1>
          <p className="muted">Use this page when you have not used the app for a few days and need to remember the process.</p>
        </div>

        <section className="card stack">
          <h2>The basic logic</h2>
          <p>This app is your private job-search command center. It stores the opportunity, job description, role bucket, resume template, prep notes, network notes, status, and next action. ChatGPT is used manually as the analysis engine.</p>
          <div className="help-flow">
            <div><strong>App stores</strong><span>Opportunity details, job post, role bucket, resume template, notes, status, next action.</span></div>
            <div><strong>App generates</strong><span>Interview prep prompt, resume tailoring prompt, full analysis prompt.</span></div>
            <div><strong>ChatGPT produces</strong><span>Interview Prep Brief, Resume Tailoring Brief, follow-up draft.</span></div>
            <div><strong>You paste back</strong><span>Useful output goes into Prep / Analysis Notes.</span></div>
          </div>
        </section>

        <section className="card stack">
          <h2>Normal opportunity workflow</h2>
          <ol className="help-steps">
            <li>Create or open the opportunity.</li>
            <li>Confirm the role bucket, priority, status, next action date, and whether it should be pinned.</li>
            <li>Open the opportunity detail page.</li>
            <li>Click <strong>Copy short prompt</strong>.</li>
            <li>Paste the prompt into ChatGPT.</li>
            <li>Copy ChatGPT’s Interview Prep Brief.</li>
            <li>Paste it into <strong>Prep / Analysis Notes</strong>.</li>
            <li>Click <strong>Save prep notes</strong>.</li>
          </ol>
        </section>

        <section className="card stack">
          <h2>Resume tailoring workflow</h2>
          <ol className="help-steps">
            <li>Go to <strong>Resume templates</strong>.</li>
            <li>Paste the full text of each resume version into the matching bucket template.</li>
            <li>Open an opportunity detail page.</li>
            <li>Confirm the opportunity has the right role bucket.</li>
            <li>Click <strong>Copy resume prompt</strong>.</li>
            <li>Paste the prompt into ChatGPT.</li>
            <li>Copy the Resume Tailoring Brief.</li>
            <li>Paste it into <strong>Prep / Analysis Notes</strong>.</li>
            <li>Use the brief to manually edit your resume before applying.</li>
          </ol>
        </section>

        <section className="card stack">
          <h2>When to add extra instructions in ChatGPT</h2>
          <p>For standard use, the app prompt already tells ChatGPT how to organize the answer. Add extra instructions only when you have special context that the app does not know.</p>
          <div className="grid">
            <article className="mini-card">
              <strong>Second-stage interview</strong>
              <p>I already had a first call and tomorrow I am speaking with the cofounder. Focus on second-stage interview preparation, likely objections, and sharp questions.</p>
            </article>
            <article className="mini-card">
              <strong>Conservative resume tailoring</strong>
              <p>I want this resume tailoring to be conservative. Avoid overstating technical experience or implying I directly owned things I only supported.</p>
            </article>
            <article className="mini-card">
              <strong>Referral / network angle</strong>
              <p>Focus on how I should use a warm introduction or LinkedIn contact for this specific opportunity.</p>
            </article>
          </div>
        </section>

        <section className="card stack">
          <h2>Dashboard habits</h2>
          <ul className="help-list">
            <li><strong>Use Pinned Top 5</strong> for opportunities that deserve extra effort, warm-intro search, or interview prep.</li>
            <li><strong>Use Needs attention</strong> to catch overdue, stale, or high-priority roles that should not slip.</li>
            <li><strong>Use Role bucket map</strong> to see where market volume is appearing across your target role families.</li>
            <li><strong>Use Status funnel</strong> to see where the pipeline is getting stuck.</li>
            <li><strong>Use Search</strong> once you have many opportunities.</li>
          </ul>
        </section>

        <section className="card stack">
          <h2>FAQ</h2>
          <div className="stack">
            <article className="mini-card">
              <strong>Should I delete or archive old opportunities?</strong>
              <p>For real opportunities, use <strong>Closed / Archived</strong> so you preserve history. Use <strong>Delete</strong> only for duplicates, tests, or mistakes.</p>
            </article>
            <article className="mini-card">
              <strong>Where do I store ChatGPT output?</strong>
              <p>Paste useful outputs into <strong>Prep / Analysis Notes</strong> inside the opportunity detail page.</p>
            </article>
            <article className="mini-card">
              <strong>Do I need to rewrite the prompt manually?</strong>
              <p>No. The app already generates structured prompts. Add manual context only when something special happened, such as a first call or a specific interviewer.</p>
            </article>
            <article className="mini-card">
              <strong>Does the app apply or send messages for me?</strong>
              <p>No. It stores data and generates copy/paste prompts. You stay in control of applications, outreach, and follow-ups.</p>
            </article>
            <article className="mini-card">
              <strong>What should I do before applying?</strong>
              <p>Confirm the bucket, copy the resume prompt, get the Resume Tailoring Brief, manually edit the resume, save the brief in notes, then apply manually.</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
