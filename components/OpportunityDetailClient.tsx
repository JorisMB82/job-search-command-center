"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon } from "./CopyIcon";
import {
  buildInterviewScreenMapPrompt,
  buildOpportunityAnalysisPrompt,
  buildOutreachDraftPrompt,
  buildResumeTailoringPrompt,
  buildShortOpportunityAnalysisPrompt,
} from "../lib/prompts";
import type { Opportunity, OpportunityPriority, OpportunityStatus, OpportunityUpdate, OutreachDraftInsert, ResumeTemplate } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from "../lib/database.types";

const PREP_DRAFT_STORAGE_PREFIX = "job-search-command-center:prep-draft-v1";

type PrepDraft = {
  resumeTailoringNotes: string;
  generalNotes: string;
  interviewPrepNotes: string;
  updatedAt: string;
};

type PrepDraftContent = Omit<PrepDraft, "updatedAt">;

type PrepDirtyFields = {
  resumeTailoringNotes: boolean;
  generalNotes: boolean;
  interviewPrepNotes: boolean;
};

const EMPTY_PREP_DIRTY_FIELDS: PrepDirtyFields = {
  resumeTailoringNotes: false,
  generalNotes: false,
  interviewPrepNotes: false,
};

function getPrepDraftStorageKey(opportunityId: string) {
  return `${PREP_DRAFT_STORAGE_PREFIX}:${opportunityId}`;
}

function readPrepLocalDraft(opportunityId: string): PrepDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getPrepDraftStorageKey(opportunityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrepDraft>;
    if (typeof parsed.updatedAt !== "string") return null;
    return {
      resumeTailoringNotes: parsed.resumeTailoringNotes ?? "",
      generalNotes: parsed.generalNotes ?? "",
      interviewPrepNotes: parsed.interviewPrepNotes ?? "",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writePrepLocalDraft(opportunityId: string, content: PrepDraftContent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getPrepDraftStorageKey(opportunityId), JSON.stringify({ ...content, updatedAt: new Date().toISOString() }));
  } catch {
    // Ignore localStorage failures so note editing still works.
  }
}

function removePrepLocalDraft(opportunityId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getPrepDraftStorageKey(opportunityId));
  } catch {
    // Ignore localStorage failures so note editing still works.
  }
}

function hasDirtyPrepFields(fields: PrepDirtyFields) {
  return fields.resumeTailoringNotes || fields.generalNotes || fields.interviewPrepNotes;
}

function syncPrepLocalDraft(opportunityId: string, dirtyFields: PrepDirtyFields, content: PrepDraftContent) {
  if (hasDirtyPrepFields(dirtyFields)) writePrepLocalDraft(opportunityId, content);
  else removePrepLocalDraft(opportunityId);
}

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
  const [screenMapPromptCopied, setScreenMapPromptCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [interviewPrepNotes, setInterviewPrepNotes] = useState("");
  const [resumeTailoringNotes, setResumeTailoringNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [interviewScreenMap, setInterviewScreenMap] = useState("");
  const [prepDirtyFields, setPrepDirtyFields] = useState<PrepDirtyFields>(EMPTY_PREP_DIRTY_FIELDS);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasUnsavedPrepChanges = hasDirtyPrepFields(prepDirtyFields);

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
        const savedPrep = {
          resumeTailoringNotes: loaded?.resume_tailoring_notes ?? "",
          generalNotes: loaded?.general_notes ?? loaded?.notes ?? "",
          interviewPrepNotes: loaded?.interview_prep_notes ?? "",
        };
        const localDraft = loaded ? readPrepLocalDraft(id) : null;
        const localDraftTime = localDraft ? new Date(localDraft.updatedAt).getTime() : Number.NaN;
        const savedTime = loaded ? new Date(loaded.updated_at).getTime() : Number.NaN;
        const localDraftDiffers = Boolean(
          localDraft &&
          (localDraft.resumeTailoringNotes !== savedPrep.resumeTailoringNotes ||
            localDraft.generalNotes !== savedPrep.generalNotes ||
            localDraft.interviewPrepNotes !== savedPrep.interviewPrepNotes),
        );
        const shouldRestoreLocalDraft = Boolean(localDraft && localDraftDiffers && !Number.isNaN(localDraftTime) && !Number.isNaN(savedTime) && localDraftTime > savedTime);
        const prepToShow = shouldRestoreLocalDraft && localDraft ? localDraft : savedPrep;

        setOpportunity(loaded);
        setInterviewPrepNotes(prepToShow.interviewPrepNotes);
        setResumeTailoringNotes(prepToShow.resumeTailoringNotes);
        setGeneralNotes(prepToShow.generalNotes);
        setInterviewScreenMap(loaded?.interview_screen_map ?? "");
        setPrepDirtyFields(
          shouldRestoreLocalDraft && localDraft
            ? {
                resumeTailoringNotes: localDraft.resumeTailoringNotes !== savedPrep.resumeTailoringNotes,
                generalNotes: localDraft.generalNotes !== savedPrep.generalNotes,
                interviewPrepNotes: localDraft.interviewPrepNotes !== savedPrep.interviewPrepNotes,
              }
            : { ...EMPTY_PREP_DIRTY_FIELDS },
        );
        if (shouldRestoreLocalDraft) setMessage("Restored an unsaved local prep-note draft from this browser. Click Save all prep notes to make it permanent.");
        else if (localDraft && !localDraftDiffers) removePrepLocalDraft(id);
      }

      if (!templatesResponse.ok || templatesPayload.error) setMessage(templatesPayload.error ?? "Could not load resume templates.");
      else setResumeTemplates(templatesPayload.data ?? []);
    }
    void load();
  }, [id]);

  useEffect(() => {
    if (!hasUnsavedPrepChanges) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedPrepChanges]);

  const bucketOptions = useMemo(() => uniqueTemplateNames(resumeTemplates, opportunity?.role_bucket), [resumeTemplates, opportunity?.role_bucket]);

  const matchingResumeTemplate = useMemo(() => {
    if (!opportunity) return null;
    return findMatchingResumeTemplate(resumeTemplates, opportunity.role_bucket);
  }, [opportunity, resumeTemplates]);

  const promptOpportunity = opportunity
    ? {
        ...opportunity,
        interview_prep_notes: interviewPrepNotes,
        resume_tailoring_notes: resumeTailoringNotes,
        general_notes: generalNotes,
        notes: generalNotes || opportunity.notes,
        interview_screen_map: interviewScreenMap,
      }
    : null;

  const templateMatchedByAlias = Boolean(opportunity && matchingResumeTemplate && matchingResumeTemplate.name.trim().toLowerCase() !== opportunity.role_bucket.trim().toLowerCase());
  const shortPrompt = promptOpportunity ? buildShortOpportunityAnalysisPrompt(promptOpportunity) : "";
  const fullPrompt = promptOpportunity ? buildOpportunityAnalysisPrompt(promptOpportunity) : "";
  const resumePrompt = promptOpportunity && matchingResumeTemplate ? buildResumeTailoringPrompt(promptOpportunity, matchingResumeTemplate) : "";
  const outreachPrompt = promptOpportunity ? buildOutreachDraftPrompt(promptOpportunity, matchingResumeTemplate) : "";
  const screenMapPrompt = promptOpportunity ? buildInterviewScreenMapPrompt(promptOpportunity) : "";
  const screenMapReady = Boolean(resumeTailoringNotes.trim() && generalNotes.trim() && interviewPrepNotes.trim());
  const hasSavedScreenMap = Boolean(opportunity?.interview_screen_map?.trim());
  const currentPrepDraft = { resumeTailoringNotes, generalNotes, interviewPrepNotes };

  function updateResumeTailoringNotes(value: string) {
    const nextDraft = { resumeTailoringNotes: value, generalNotes, interviewPrepNotes };
    const nextDirtyFields = { ...prepDirtyFields, resumeTailoringNotes: true };
    setResumeTailoringNotes(value);
    setPrepDirtyFields(nextDirtyFields);
    syncPrepLocalDraft(id, nextDirtyFields, nextDraft);
  }

  function updateGeneralNotes(value: string) {
    const nextDraft = { resumeTailoringNotes, generalNotes: value, interviewPrepNotes };
    const nextDirtyFields = { ...prepDirtyFields, generalNotes: true };
    setGeneralNotes(value);
    setPrepDirtyFields(nextDirtyFields);
    syncPrepLocalDraft(id, nextDirtyFields, nextDraft);
  }

  function updateInterviewPrepNotes(value: string) {
    const nextDraft = { resumeTailoringNotes, generalNotes, interviewPrepNotes: value };
    const nextDirtyFields = { ...prepDirtyFields, interviewPrepNotes: true };
    setInterviewPrepNotes(value);
    setPrepDirtyFields(nextDirtyFields);
    syncPrepLocalDraft(id, nextDirtyFields, nextDraft);
  }

  function markPrepFieldSaved(field: keyof PrepDirtyFields) {
    const nextDirtyFields = { ...prepDirtyFields, [field]: false };
    setPrepDirtyFields(nextDirtyFields);
    syncPrepLocalDraft(id, nextDirtyFields, currentPrepDraft);
  }

  function markAllPrepFieldsSaved() {
    setPrepDirtyFields({ ...EMPTY_PREP_DIRTY_FIELDS });
    removePrepLocalDraft(id);
  }

  function resetCopyFlags() {
    setShortPromptCopied(false);
    setFullPromptCopied(false);
    setResumePromptCopied(false);
    setOutreachPromptCopied(false);
    setScreenMapPromptCopied(false);
  }

  async function copyShortPrompt() {
    if (!shortPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(shortPrompt);
    resetCopyFlags();
    setShortPromptCopied(true);
  }

  async function copyFullPrompt() {
    if (!fullPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(fullPrompt);
    resetCopyFlags();
    setFullPromptCopied(true);
  }

  async function copyResumePrompt() {
    if (!resumePrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(resumePrompt);
    resetCopyFlags();
    setResumePromptCopied(true);
  }

  async function copyOutreachPrompt() {
    if (!outreachPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(outreachPrompt);
    resetCopyFlags();
    setOutreachPromptCopied(true);
  }

  async function copyScreenMapPrompt() {
    if (!screenMapReady || !screenMapPrompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(screenMapPrompt);
    resetCopyFlags();
    setScreenMapPromptCopied(true);
  }

  async function updateOpportunity(update: OpportunityUpdate, successMessage = "Opportunity updated.") {
    const response = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const payload = (await response.json()) as { data?: Opportunity; error?: string };
    if (!response.ok || payload.error || !payload.data) {
      setMessage(payload.error ?? "Could not update opportunity.");
      return false;
    }
    setOpportunity(payload.data);
    if (update.interview_prep_notes !== undefined) setInterviewPrepNotes(payload.data.interview_prep_notes ?? "");
    if (update.resume_tailoring_notes !== undefined) setResumeTailoringNotes(payload.data.resume_tailoring_notes ?? "");
    if (update.general_notes !== undefined || update.notes !== undefined) setGeneralNotes(payload.data.general_notes ?? payload.data.notes ?? "");
    if (update.interview_screen_map !== undefined) setInterviewScreenMap(payload.data.interview_screen_map ?? "");
    setMessage(successMessage);
    return true;
  }

  async function saveInterviewPrepNotes() {
    const saved = await updateOpportunity({ interview_prep_notes: interviewPrepNotes }, "Interview prep notes saved.");
    if (saved) markPrepFieldSaved("interviewPrepNotes");
  }

  async function saveResumeTailoringNotes() {
    const saved = await updateOpportunity({ resume_tailoring_notes: resumeTailoringNotes }, "Resume tailoring notes saved.");
    if (saved) markPrepFieldSaved("resumeTailoringNotes");
  }

  async function saveGeneralNotes() {
    const saved = await updateOpportunity({ general_notes: generalNotes, notes: generalNotes }, "General / call notes saved.");
    if (saved) markPrepFieldSaved("generalNotes");
  }

  async function saveAllPrepNotes() {
    const saved = await updateOpportunity(
      {
        resume_tailoring_notes: resumeTailoringNotes,
        general_notes: generalNotes,
        notes: generalNotes,
        interview_prep_notes: interviewPrepNotes,
      },
      "All prep notes saved. They are now stored permanently for this opportunity.",
    );
    if (saved) markAllPrepFieldsSaved();
  }

  async function saveInterviewScreenMap() { await updateOpportunity({ interview_screen_map: interviewScreenMap }, "Interview screen map saved."); }

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
        <div className="row">
          <h1>{opportunity.role}</h1>
          <span className="badge">{STATUS_LABELS[opportunity.status]}</span>
          {opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}
        </div>
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

      <section className={`card stack prep-save-panel ${hasUnsavedPrepChanges ? "has-unsaved" : ""}`}>
        <div className="prep-save-header">
          <div className="stack">
            <h2>Prep notes save control</h2>
            <p className="muted">Important: text in the three prep boxes is only permanent after saving. A local emergency draft is kept in this browser while you type, but use Save all prep notes before closing the app or relying on the screen-map workflow.</p>
          </div>
          <div className="prep-save-actions">
            {hasUnsavedPrepChanges ? <span className="badge warning">Unsaved prep notes</span> : <span className="badge accent">Prep notes saved</span>}
            <button type="button" onClick={() => void saveAllPrepNotes()}>Save all prep notes</button>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="card stack">
          <div className="row"><h2>Resume Tailoring Notes</h2>{prepDirtyFields.resumeTailoringNotes ? <span className="badge warning">Unsaved</span> : null}<button type="button" onClick={() => void saveResumeTailoringNotes()}>Save this note</button></div>
          <p className="muted">Paste the RESUME TAILORING BRIEF from the resume prompt here.</p>
          <textarea className={`prep-notes ${prepDirtyFields.resumeTailoringNotes ? "dirty" : ""}`} value={resumeTailoringNotes} onChange={(event) => updateResumeTailoringNotes(event.target.value)} placeholder="Paste RESUME TAILORING BRIEF here." />
        </article>
        <article className="card stack">
          <div className="row"><h2>General / Call Notes</h2>{prepDirtyFields.generalNotes ? <span className="badge warning">Unsaved</span> : null}<button type="button" onClick={() => void saveGeneralNotes()}>Save this note</button></div>
          <p className="muted">Use this for call recap, recruiter notes, compensation, manual observations, or output from the General / Call Notes prompt.</p>
          <textarea className={`prep-notes ${prepDirtyFields.generalNotes ? "dirty" : ""}`} value={generalNotes} onChange={(event) => updateGeneralNotes(event.target.value)} placeholder="Paste call notes, general analysis, or follow-up context here." />
        </article>
        <article className="card stack">
          <div className="row"><h2>Interview Prep Notes</h2>{prepDirtyFields.interviewPrepNotes ? <span className="badge warning">Unsaved</span> : null}<button type="button" onClick={() => void saveInterviewPrepNotes()}>Save this note</button></div>
          <p className="muted">Paste the INTERVIEW PREP BRIEF from the Interview Prep Notes prompt here.</p>
          <textarea className={`prep-notes ${prepDirtyFields.interviewPrepNotes ? "dirty" : ""}`} value={interviewPrepNotes} onChange={(event) => updateInterviewPrepNotes(event.target.value)} placeholder="Paste INTERVIEW PREP BRIEF here." />
        </article>
      </section>

      <section className="card stack">
        <div className="row">
          <h2>Step 4 — Interview Screen Map</h2>
          <button className="secondary" type="button" onClick={copyScreenMapPrompt} disabled={!screenMapReady}><CopyIcon />Copy screen-map prompt</button>
          {hasSavedScreenMap ? <a className="button secondary" href={`/opportunities/${id}/screen-map`} target="_blank" rel="noreferrer">Open second-screen view</a> : null}
        </div>
        <p className="muted">Use this after the three prep boxes above are filled. Copy the prompt, paste it into ChatGPT Plus, then paste the final one-page interview map below and save it. The second-screen view is browser-based, not a generated PDF.</p>
        {!screenMapReady ? <p className="error">Fill the Resume Tailoring Notes, General / Call Notes, and Interview Prep Notes boxes before generating the screen-map prompt.</p> : null}
        {hasUnsavedPrepChanges ? <p className="error">You have unsaved prep-note edits. Save all prep notes before relying on this prompt or closing the app.</p> : null}
        {screenMapPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned one-page map into the box below.</p> : null}
        {screenMapReady ? <details className="stack"><summary>Preview the interview screen-map prompt being copied</summary><pre>{screenMapPrompt}</pre></details> : null}
        <label>Final interview screen map<textarea className="screen-map-editor" value={interviewScreenMap} onChange={(event) => setInterviewScreenMap(event.target.value)} placeholder="Paste the final one-page interview screen map from ChatGPT here." /></label>
        <div className="row"><button type="button" onClick={() => void saveInterviewScreenMap()}>Save screen map</button>{hasSavedScreenMap ? <span className="badge accent">Saved</span> : null}</div>
      </section>

      <section className="card stack">
        <div className="row"><h2>Resume Tailoring Notes prompt</h2><button className="secondary" type="button" onClick={copyResumePrompt} disabled={!resumePrompt}><CopyIcon />Copy resume prompt</button></div>
        {matchingResumeTemplate ? <p className="muted">Matched resume template: <strong>{matchingResumeTemplate.name}</strong>{templateMatchedByAlias ? <>. Current bucket is <strong>{opportunity.role_bucket}</strong>, so the app is using the closest saved template. Select another saved template above if this is not the right fit.</> : <>. Paste the prompt into ChatGPT, then paste the returned tailoring brief into Resume Tailoring Notes.</>}</p> : <p className="error">No saved resume template matches the current bucket: <strong>{opportunity.role_bucket}</strong>. Select a saved template from the dropdown above or add resume text under the Resume Templates section.</p>}
        {matchingResumeTemplate && !matchingResumeTemplate.content.trim() ? <p className="error">This resume template has no resume content yet. Paste your resume text into the template before using this prompt.</p> : null}
        {resumePromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Resume Tailoring Notes above.</p> : null}
        {resumePrompt ? <pre>{resumePrompt}</pre> : null}
      </section>

      <section className="card stack">
        <div className="row"><h2>General / Call Notes prompt</h2><button className="secondary" type="button" onClick={copyFullPrompt}><CopyIcon />Copy general notes prompt</button></div>
        <p className="muted">Optional fallback. Use when you want broader analysis from the full saved job description; paste useful output into General / Call Notes.</p>
        {fullPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste useful output into General / Call Notes.</p> : null}
        <pre>{fullPrompt}</pre>
      </section>

      <section className="card stack">
        <div className="row"><h2>Interview Prep Notes prompt</h2><button className="secondary" type="button" onClick={copyShortPrompt}><CopyIcon />Copy interview prep prompt</button></div>
        <p className="muted">Recommended for interview prep. It asks ChatGPT to return a paste-back-ready interview prep brief.</p>
        {shortPromptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually, then paste the returned brief into Interview Prep Notes above.</p> : null}
        <pre>{shortPrompt}</pre>
      </section>

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

      <section className="card stack">
        <h2>Delete opportunity</h2>
        <p className="muted">Use delete only for duplicates, test entries, or mistakes. For real opportunities, prefer changing status to Closed / Archived.</p>
        {!confirmDelete ? <button className="danger" type="button" onClick={() => setConfirmDelete(true)}>Delete opportunity</button> : <div className="row"><button className="danger" type="button" onClick={() => void deleteOpportunity()}>Confirm delete permanently</button><button className="secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
      </section>
    </>
  );
}
