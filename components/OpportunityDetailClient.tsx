"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildOpportunityAnalysisPrompt, buildResumeTailoringPrompt, buildShortOpportunityAnalysisPrompt } from "../lib/prompts";
import type { Opportunity, OpportunityPriority, OpportunityStatus, OpportunityUpdate, OutreachDraftInsert, ResumeTemplate, RoleBucket } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, ROLE_BUCKETS, STATUS_LABELS } from "../lib/database.types";

export function OpportunityDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>([]);
  const [draft, setDraft] = useState<OutreachDraftInsert>({ opportunity_id: id, recipient: "", channel: "email", subject: "", body: "" });
  const [shortPromptCopied, setShortPromptCopied] = useState(false);
  const [fullPromptCopied, setFullPromptCopied] = useState(false);
  const [resumePromptCopied, setResumePromptCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function load() {
      const [opportunityResponse, templatesResponse] = await Promise.all([
        fetch(`/api/opportunities/${id}`),
        fetch("/api/resume-templates"),
      ]);
      const opportunityPayload = (await opportunityResponse.json()) as { data?: Opportunity; error?: string };
      const templatesPayload = (await templatesResponse.json()) as { data?: ResumeTemplate[]; error?: string };

      if (!opportunityResponse.ok || opportunityPayload.error) setMessage(opportunityPayload.error ?? "Could not load opportunity.");
      else {
        setOpportunity(opportunityPayload.data ?? null);
        setPrepNotes(opportunityPayload.data?.notes ?? "");
      }

      if (!templatesResponse.ok || templatesPayload.error) setMessage(templatesPayload.error ?? "Could not load resume templates.");
      else setResumeTemplates(templatesPayload.data ?? []);
    }
    void load();
  }, [id]);

  const matchingResumeTemplate = useMemo(() => {
    if (!opportunity) return null;
    const exact = resumeTemplates.find((template) => template.name.trim().toLowerCase() === opportunity.role_bucket.trim().toLowerCase());
    if (exact) return exact;
    return resumeTemplates.find((template) => template.name.toLowerCase().includes(opportunity.role_bucket.toLowerCase())) ?? null;
  }, [opportunity, resumeTemplates]);

  const shortPrompt = opportunity ? buildShortOpportunityAnalysisPrompt(opportunity) : "";
  const fullPrompt = opportunity ? buildOpportunityAnalysisPrompt(opportunity) : "";
  const resumePrompt = opportunity && matchingResumeTemplate ? buildResumeTailoringPrompt(opportunity, matchingResumeTemplate) : "";

  async function copyShortPrompt() {
    if (!shortPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shortPrompt);
    setShortPromptCopied(true);
    setFullPromptCopied(false);
    setResumePromptCopied(false);
  }

  async function copyFullPrompt() {
    if (!fullPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(fullPrompt);
    setFullPromptCopied(true);
    setShortPromptCopied(false);
    setResumePromptCopied(false);
  }

  async function copyResumePrompt() {
    if (!resumePrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(resumePrompt);
    setResumePromptCopied(true);
    setShortPromptCopied(false);
    setFullPromptCopied(false);
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

  async function deleteOpportunity() {
    const response = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Could not delete opportunity.");
      return;
    }
    router.push("/");
    router.refresh();
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
        <p className="muted">Paste the ChatGPT interview-prep brief, resume tailoring brief, or your call notes here so everything for this opportunity stays in one place.</p>
        <textarea className="prep-notes" value={prepNotes} onChange={(event) => setPrepNotes(event.target.value)} placeholder="Paste the INTERVIEW PREP BRIEF or RESUME TAILORING BRIEF here after running the prompts below." />
      </section>

      <section className="card stack">
        <div className="row"><h2>Resume tailoring prompt</h2><button className="secondary" type="button" onClick={copyResumePrompt} disabled={!resumePrompt}>Copy resume prompt</button></div>
        {matchingResumeTemplate ? (
          <p className="muted">Matched resume template: <strong>{matchingResumeTemplate.name}</strong>. Paste the prompt into ChatGPT, then paste the returned tailoring brief into Prep / Analysis Notes.</p>
        ) : (
          <p className="error">No matching resume template found for this bucket. Add resume text under the Resume Templates section using the same bucket name.</p>
        )}
        {matchingResumeTemplate && !matchingResumeTemplate.content.trim() ? <p className="error">This resume template has no resume content yet. Paste your resume text into the template before using this prompt.</p> : null}
        {resumePromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Prep / Analysis Notes above.</p> : null}
        {resumePrompt ? <pre>{resumePrompt}</pre> : null}
      </section>

      <section className="card stack">
        <div className="row"><h2>Short ChatGPT prompt</h2><button className="secondary" type="button" onClick={copyShortPrompt}>Copy short prompt</button></div>
        <p className="muted">Recommended for interview prep. It asks ChatGPT to return a paste-back-ready interview prep brief.</p>
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

      <section className="card stack">
        <h2>Delete opportunity</h2>
        <p className="muted">Use delete only for duplicates, test entries, or mistakes. For real opportunities, prefer changing status to Closed / Archived.</p>
        {!confirmDelete ? (
          <button className="danger" type="button" onClick={() => setConfirmDelete(true)}>Delete opportunity</button>
        ) : (
          <div className="row">
            <button className="danger" type="button" onClick={() => void deleteOpportunity()}>Confirm delete permanently</button>
            <button className="secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </section>
    </>
  );
}
