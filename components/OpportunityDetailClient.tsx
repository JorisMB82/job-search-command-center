"use client";

import { FormEvent, useEffect, useState } from "react";
import { buildOpportunityAnalysisPrompt, buildShortOpportunityAnalysisPrompt } from "../lib/prompts";
import type { Opportunity, OpportunityPriority, OpportunityStatus, OpportunityUpdate, OutreachDraftInsert, RoleBucket } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, ROLE_BUCKETS, STATUS_LABELS } from "../lib/database.types";

export function OpportunityDetailClient({ id }: { id: string }) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [draft, setDraft] = useState<OutreachDraftInsert>({ opportunity_id: id, recipient: "", channel: "email", subject: "", body: "" });
  const [shortPromptCopied, setShortPromptCopied] = useState(false);
  const [fullPromptCopied, setFullPromptCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [prepNotes, setPrepNotes] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/opportunities/${id}`);
      const payload = (await response.json()) as { data?: Opportunity; error?: string };
      if (!response.ok || payload.error) setMessage(payload.error ?? "Could not load opportunity.");
      else {
        setOpportunity(payload.data ?? null);
        setPrepNotes(payload.data?.notes ?? "");
      }
    }
    void load();
  }, [id]);

  const shortPrompt = opportunity ? buildShortOpportunityAnalysisPrompt(opportunity) : "";
  const fullPrompt = opportunity ? buildOpportunityAnalysisPrompt(opportunity) : "";

  async function copyShortPrompt() {
    if (!shortPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shortPrompt);
    setShortPromptCopied(true);
    setFullPromptCopied(false);
  }

  async function copyFullPrompt() {
    if (!fullPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(fullPrompt);
    setFullPromptCopied(true);
    setShortPromptCopied(false);
  }

  async function updateOpportunity(update: OpportunityUpdate) {
    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const payload = (await response.json()) as { data?: Opportunity; error?: string };
    if (!response.ok || payload.error || !payload.data) {
      setMessage(payload.error ?? "Could not update opportunity.");
      return;
    }
    setOpportunity(payload.data);
    if (update.notes !== undefined) setPrepNotes(payload.data.notes ?? "");
    setMessage("Opportunity updated.");
  }

  async function savePrepNotes() {
    await updateOpportunity({ notes: prepNotes });
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/outreach-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) setMessage(payload.error ?? "Could not save outreach draft.");
    else {
      setMessage("Outreach draft saved. Nothing was sent automatically.");
      setDraft({ opportunity_id: id, recipient: "", channel: "email", subject: "", body: "" });
    }
  }

  if (!opportunity) {
    return <section className="card"><p>{message || "Loading opportunity..."}</p></section>;
  }

  return (
    <>
      <section className="card stack">
        <div className="row"><h1>{opportunity.role}</h1><span className="badge">{STATUS_LABELS[opportunity.status]}</span>{opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}</div>
        <p><strong>{opportunity.company}</strong>{opportunity.location ? ` · ${opportunity.location}` : ""}</p>
        {opportunity.url ? <p><a href={opportunity.url} target="_blank" rel="noreferrer">Open source posting</a></p> : null}
        <div className="filter-grid">
          <label>Status<select value={opportunity.status} onChange={(event) => void updateOpportunity({ status: event.target.value as OpportunityStatus })}>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
          <label>Priority<select value={opportunity.priority} onChange={(event) => void updateOpportunity({ priority: event.target.value as OpportunityPriority })}>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label>
          <label>Role bucket<select value={opportunity.role_bucket} onChange={(event) => void updateOpportunity({ role_bucket: event.target.value as RoleBucket })}>{ROLE_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label>
          <label>Next action date<input type="date" value={opportunity.next_action_date ?? ""} onChange={(event) => void updateOpportunity({ next_action_date: event.target.value || null })} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={opportunity.is_pinned} onChange={(event) => void updateOpportunity({ is_pinned: event.target.checked })} /> Pin as top opportunity</label>
        </div>
        <label>Network notes<textarea value={opportunity.network_notes ?? ""} onChange={(event) => setOpportunity({ ...opportunity, network_notes: event.target.value })} onBlur={(event) => void updateOpportunity({ network_notes: event.target.value })} placeholder="Warm intro path, LinkedIn search notes, alumni/contact ideas" /></label>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="card stack">
        <div className="row"><h2>Prep / Analysis Notes</h2><button className="secondary" type="button" onClick={() => void savePrepNotes()}>Save prep notes</button></div>
        <p className="muted">Paste the ChatGPT interview-prep brief or your call notes here so everything for this opportunity stays in one place.</p>
        <textarea className="prep-notes" value={prepNotes} onChange={(event) => setPrepNotes(event.target.value)} placeholder="Paste the INTERVIEW PREP BRIEF here after running the short ChatGPT prompt." />
      </section>

      <section className="card stack">
        <div className="row"><h2>Short ChatGPT prompt</h2><button className="secondary" type="button" onClick={copyShortPrompt}>Copy short prompt</button></div>
        <p className="muted">Recommended for normal use. It asks ChatGPT to return a paste-back-ready interview prep brief.</p>
        {shortPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Prep / Analysis Notes above.</p> : null}
        <pre>{shortPrompt}</pre>
      </section>

      <section className="card stack">
        <div className="row"><h2>Full ChatGPT prompt</h2><button className="secondary" type="button" onClick={copyFullPrompt}>Copy full prompt</button></div>
        <p className="muted">Use only when you want the entire saved job description included.</p>
        {fullPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually.</p> : null}
        <pre>{fullPrompt}</pre>
      </section>

      <section className="card stack">
        <h2>Job description</h2>
        <p>{opportunity.job_description}</p>
      </section>

      <section className="card stack">
        <h2>Save outreach draft</h2>
        <p className="muted">Drafts are saved only. The app never auto-sends emails or messages.</p>
        <form className="stack" onSubmit={saveDraft}>
          <label>Recipient<input value={draft.recipient ?? ""} onChange={(event) => setDraft({ ...draft, recipient: event.target.value })} /></label>
          <label>Channel<input value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} /></label>
          <label>Subject<input value={draft.subject ?? ""} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /></label>
          <label>Body<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required /></label>
          <button type="submit">Save draft</button>
        </form>
      </section>
    </>
  );
}
