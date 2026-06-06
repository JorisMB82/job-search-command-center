"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon } from "./CopyIcon";
import { buildOpportunityAnalysisPrompt, buildOutreachDraftPrompt, buildResumeTailoringPrompt, buildShortOpportunityAnalysisPrompt } from "../lib/prompts";
import type { Opportunity, OpportunityPriority, OpportunityStatus, OpportunityUpdate, OutreachDraftInsert, ResumeTemplate } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from "../lib/database.types";

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

function formatAge(value: string | null | undefined) {
  const age = daysSince(value);
  if (age === null) return "Unknown age";
  return age === 0 ? "today" : `${age}d ago`;
}

function uniqueTemplateNames(templates: ResumeTemplate[], currentBucket?: string | null) {
  const names = templates.map((template) => template.name.trim()).filter(Boolean);
  if (currentBucket?.trim() && !names.some((name) => name.toLowerCase() === currentBucket.trim().toLowerCase())) names.unshift(currentBucket.trim());
  return Array.from(new Set(names));
}

function normalizeTemplateKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bgeneral\b/g, "")
    .replace(/\bresume\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingResumeTemplate(templates: ResumeTemplate[], bucket: string) {
  const bucketName = bucket.trim();
  const bucketKey = normalizeTemplateKey(bucketName);
  const exact = templates.find((template) => template.name.trim().toLowerCase() === bucketName.toLowerCase());
  if (exact) return exact;
  return templates.find((template) => {
    const templateKey = normalizeTemplateKey(template.name);
    return templateKey === bucketKey || templateKey.includes(bucketKey) || bucketKey.includes(templateKey);
  }) ?? null;
}

export function OpportunityDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>([]);
  const [draft, setDraft] = useState<OutreachDraftInsert>({ opportunity_id: id, recipient: "", channel: "email", subject: "", body: "" });
  const [shortPromptCopied, setShortPromptCopied] = useState(false);
  const [fullPromptCopied, setFullPromptCopied] = useState(false);
  const [resumePromptCopied, setResumePromptCopied] = useState(false);
  const [outreachPromptCopied, setOutreachPromptCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [interviewPrepNotes, setInterviewPrepNotes] = useState("");
  const [resumeTailoringNotes, setResumeTailoringNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
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
        const loaded = opportunityPayload.data ?? null;
        setOpportunity(loaded);
        setInterviewPrepNotes(loaded?.interview_prep_notes ?? "");
        setResumeTailoringNotes(loaded?.resume_tailoring_notes ?? "");
        setGeneralNotes(loaded?.general_notes ?? loaded?.notes ?? "");
      }

      if (!templatesResponse.ok || templatesPayload.error) setMessage(templatesPayload.error ?? "Could not load resume templates.");
      else setResumeTemplates(templatesPayload.data ?? []);
    }
    void load();
  }, [id]);

  const bucketOptions = useMemo(() => uniqueTemplateNames(resumeTemplates, opportunity?.role_bucket), [resumeTemplates, opportunity?.role_bucket]);

  const matchingResumeTemplate = useMemo(() => {
    if (!opportunity) return null;
    return findMatchingResumeTemplate(resumeTemplates, opportunity.role_bucket);
  }, [opportunity, resumeTemplates]);

  const templateMatchedByAlias = Boolean(opportunity && matchingResumeTemplate && matchingResumeTemplate.name.trim().toLowerCase() !== opportunity.role_bucket.trim().toLowerCase());
  const shortPrompt = opportunity ? buildShortOpportunityAnalysisPrompt(opportunity) : "";
  const fullPrompt = opportunity ? buildOpportunityAnalysisPrompt(opportunity) : "";
  const resumePrompt = opportunity && matchingResumeTemplate ? buildResumeTailoringPrompt(opportunity, matchingResumeTemplate) : "";
  const outreachPrompt = opportunity ? buildOutreachDraftPrompt(opportunity, matchingResumeTemplate) : "";

  async function copyShortPrompt() {
    if (!shortPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shortPrompt);
    setShortPromptCopied(true);
    setFullPromptCopied(false);
    setResumePromptCopied(false);
    setOutreachPromptCopied(false);
  }

  async function copyFullPrompt() {
    if (!fullPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(fullPrompt);
    setFullPromptCopied(true);
    setShortPromptCopied(false);
    setResumePromptCopied(false);
    setOutreachPromptCopied(false);
  }

  async function copyResumePrompt() {
    if (!resumePrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(resumePrompt);
    setResumePromptCopied(true);
    setShortPromptCopied(false);
    setFullPromptCopied(false);
    setOutreachPromptCopied(false);
  }

  async function copyOutreachPrompt() {
    if (!outreachPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(outreachPrompt);
    setOutreachPromptCopied(true);
    setShortPromptCopied(false);
    setFullPromptCopied(false);
    setResumePromptCopied(false);
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
    if (update.interview_prep_notes !== undefined) setInterviewPrepNotes(payload.data.interview_prep_notes ?? "");
    if (update.resume_tailoring_notes !== undefined) setResumeTailoringNotes(payload.data.resume_tailoring_notes ?? "");
    if (update.general_notes !== undefined || update.notes !== undefined) setGeneralNotes(payload.data.general_notes ?? payload.data.notes ?? "");
    setMessage("Opportunity updated.");
  }

  async function saveInterviewPrepNotes() { await updateOpportunity({ interview_prep_notes: interviewPrepNotes }); }
  async function saveResumeTailoringNotes() { await updateOpportunity({ resume_tailoring_notes: resumeTailoringNotes }); }
  async function saveGeneralNotes() { await updateOpportunity({ general_notes: generalNotes, notes: generalNotes }); }

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
    else setMessage("Outreach draft saved and kept visible for review. Nothing was sent automatically.");
  }

  if (!opportunity) return <section className="card"><p>{message || "Loading opportunity..."}</p></section>;

  return (
    <>
      <section className="card stack">
        <p className="muted"><strong>Opportunity Detail</strong></p>
        <div className="row"><h1>{opportunity.role}</h1><span className="badge">{STATUS_LABELS[opportunity.status]}</span>{opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}</div>
        <p><strong>{opportunity.company}</strong>{opportunity.location ? ` · ${opportunity.location}` : ""}</p>
        <p className="date-line">Posted: {formatDate(opportunity.listing_posted_date)} · Saved: {formatDate(opportunity.created_at)} ({formatAge(opportunity.created_at)})</p>
        {opportunity.url ? <p><a href={opportunity.url} target="_blank" rel="noreferrer">Open source posting</a></p> : null}
        <div className="filter-grid">
          <label>Status<select value={opportunity.status} onChange={(event) => void updateOpportunity({ status: event.target.value as OpportunityStatus })}>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
          <label>Priority<select value={opportunity.priority} onChange={(event) => void updateOpportunity({ priority: event.target.value as OpportunityPriority })}>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label>
          <label>Resume template / bucket<select value={opportunity.role_bucket} onChange={(event) => void updateOpportunity({ role_bucket: event.target.value })}>{bucketOptions.length === 0 ? <option value={opportunity.role_bucket}>{opportunity.role_bucket}</option> : bucketOptions.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label>
          <label>Listing posted date<input type="date" value={opportunity.listing_posted_date ?? ""} onChange={(event) => void updateOpportunity({ listing_posted_date: event.target.value || null })} /></label>
          <label>Next action date<input type="date" value={opportunity.next_action_date ?? ""} onChange={(event) => void updateOpportunity({ next_action_date: event.target.value || null })} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={opportunity.is_pinned} onChange={(event) => void updateOpportunity({ is_pinned: event.target.checked })} /> Pin as top opportunity</label>
        </div>
        <label>Network notes<textarea value={opportunity.network_notes ?? ""} onChange={(event) => setOpportunity({ ...opportunity, network_notes: event.target.value })} onBlur={(event) => void updateOpportunity({ network_notes: event.target.value })} placeholder="Warm intro path, LinkedIn search notes, alumni/contact ideas" /></label>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="grid">
        <article className="card stack"><div className="row"><h2>Interview Prep Notes</h2><button className="secondary" type="button" onClick={() => void saveInterviewPrepNotes()}>Save interview notes</button></div><p className="muted">Paste the INTERVIEW PREP BRIEF from the short ChatGPT prompt here.</p><textarea className="prep-notes" value={interviewPrepNotes} onChange={(event) => setInterviewPrepNotes(event.target.value)} placeholder="Paste INTERVIEW PREP BRIEF here." /></article>
        <article className="card stack"><div className="row"><h2>Resume Tailoring Notes</h2><button className="secondary" type="button" onClick={() => void saveResumeTailoringNotes()}>Save resume notes</button></div><p className="muted">Paste the RESUME TAILORING BRIEF from the resume prompt here.</p><textarea className="prep-notes" value={resumeTailoringNotes} onChange={(event) => setResumeTailoringNotes(event.target.value)} placeholder="Paste RESUME TAILORING BRIEF here." /></article>
        <article className="card stack"><div className="row"><h2>General / Call Notes</h2><button className="secondary" type="button" onClick={() => void saveGeneralNotes()}>Save general notes</button></div><p className="muted">Use this for call recap, recruiter notes, compensation, manual observations, or output from the full prompt.</p><textarea className="prep-notes" value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} placeholder="Paste call notes, general analysis, or follow-up context here." /></article>
      </section>

      <section className="card stack"><div className="row"><h2>Resume tailoring prompt</h2><button className="secondary" type="button" onClick={copyResumePrompt} disabled={!resumePrompt}><CopyIcon />Copy resume prompt</button></div>{matchingResumeTemplate ? <p className="muted">Matched resume template: <strong>{matchingResumeTemplate.name}</strong>{templateMatchedByAlias ? <>. Current bucket is <strong>{opportunity.role_bucket}</strong>, so the app is using the closest saved template. Select another saved template above if this is not the right fit.</> : <>. Paste the prompt into ChatGPT, then paste the returned tailoring brief into Resume Tailoring Notes.</>}</p> : <p className="error">No saved resume template matches the current bucket: <strong>{opportunity.role_bucket}</strong>. Select a saved template from the dropdown above or add resume text under the Resume Templates section.</p>}{matchingResumeTemplate && !matchingResumeTemplate.content.trim() ? <p className="error">This resume template has no resume content yet. Paste your resume text into the template before using this prompt.</p> : null}{resumePromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Resume Tailoring Notes above.</p> : null}{resumePrompt ? <pre>{resumePrompt}</pre> : null}</section>
      <section className="card stack"><div className="row"><h2>Short ChatGPT prompt</h2><button className="secondary" type="button" onClick={copyShortPrompt}><CopyIcon />Copy short prompt</button></div><p className="muted">Recommended for interview prep. It asks ChatGPT to return a paste-back-ready interview prep brief.</p>{shortPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Interview Prep Notes above.</p> : null}<pre>{shortPrompt}</pre></section>
      <section className="card stack"><div className="row"><h2>Full ChatGPT prompt</h2><button className="secondary" type="button" onClick={copyFullPrompt}><CopyIcon />Copy full prompt</button></div><p className="muted">Optional fallback. Use when you want broader analysis from the full saved job description; paste useful output into General / Call Notes.</p>{fullPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste useful output into General / Call Notes.</p> : null}<pre>{fullPrompt}</pre></section>
      <section className="card stack"><h2>Job description</h2><p>{opportunity.job_description}</p></section>
      <section className="card stack">
        <div className="row"><h2>Step 3 — Prepare outreach draft</h2><button className="secondary" type="button" onClick={copyOutreachPrompt} disabled={!outreachPrompt}><CopyIcon />Copy ChatGPT outreach prompt</button></div>
        <p className="muted">Use this sequence: 1) copy the ChatGPT outreach prompt, 2) paste it into ChatGPT Plus, 3) paste the final subject and message from ChatGPT into the blank fields below, then save. Nothing is sent automatically.</p>
        {outreachPromptCopied ? <p className="muted">Copied. The prompt is now on your clipboard. Paste it into ChatGPT Plus; do not paste it into the draft fields below.</p> : null}
        <details className="stack">
          <summary>Preview the ChatGPT outreach prompt being copied</summary>
          <pre>{outreachPrompt}</pre>
        </details>
        <form className="stack" onSubmit={saveDraft}>
          <label>Recipient / contact name or email<input value={draft.recipient ?? ""} onChange={(event) => setDraft({ ...draft, recipient: event.target.value })} placeholder="Optional: hiring manager, recruiter, or contact email." /></label>
          <label>Channel<input value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} /></label>
          <label>Final subject to save<input value={draft.subject ?? ""} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="Paste the final subject line from ChatGPT here." /></label>
          <label>Final message body to save<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Paste the final outreach email or message from ChatGPT here after reviewing it." required /></label>
          <button type="submit">Save draft</button>
        </form>
      </section>
      <section className="card stack"><h2>Delete opportunity</h2><p className="muted">Use delete only for duplicates, test entries, or mistakes. For real opportunities, prefer changing status to Closed / Archived.</p>{!confirmDelete ? <button className="danger" type="button" onClick={() => setConfirmDelete(true)}>Delete opportunity</button> : <div className="row"><button className="danger" type="button" onClick={() => void deleteOpportunity()}>Confirm delete permanently</button><button className="secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div>}</section>
    </>
  );
}
