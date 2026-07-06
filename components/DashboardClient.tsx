"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import type {
  Opportunity,
  OpportunityInsert,
  OpportunityPriority,
  OpportunityStatus,
  ResumeTemplate,
} from "../lib/database.types";
import {
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../lib/database.types";

const PRIORITY_ORDER_STORAGE_KEY = "job-search-command-center:priority-order-v1";
const LEGACY_PINNED_ORDER_STORAGE_KEY = "job-search-command-center:pinned-order-v1";

const CLOSED_STATUSES: OpportunityStatus[] = ["closed", "rejected"];
const APPLICATION_SENT_STATUSES: OpportunityStatus[] = [
  "outreach_drafted", "outreach_sent", "follow_up_due",
  "applied", "interviewing", "offer", "rejected", "closed",
];
const APPLICATION_PROGRESS_STATUSES: OpportunityStatus[] = [
  "outreach_drafted", "outreach_sent", "follow_up_due",
  "applied", "interviewing", "offer",
];

const emptyDraft: OpportunityInsert = {
  company: "",
  role: "",
  location: "",
  url: "",
  status: "new",
  job_description: "",
  notes: "",
  interview_prep_notes: "",
  resume_tailoring_notes: "",
  general_notes: "",
  role_bucket: "Neutral Resume",
  priority: "medium",
  is_pinned: false,
  listing_posted_date: null,
  next_action_date: null,
  network_notes: "",
  source: "",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function startOfWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAgeFrom(value: string | null | undefined) {
  if (!value) return "Unknown age";
  const age = Math.max(0, daysSince(value));
  return age === 0 ? "today" : `${age}d ago`;
}

function readStoredOrder(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((i): i is string => typeof i === "string") : [];
  } catch { return []; }
}

function readPriorityOrder() {
  const order = readStoredOrder(PRIORITY_ORDER_STORAGE_KEY);
  return order.length ? order : readStoredOrder(LEGACY_PINNED_ORDER_STORAGE_KEY);
}

function writePriorityOrder(order: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIORITY_ORDER_STORAGE_KEY, JSON.stringify(order));
}

function reconcilePriorityOrder(candidateIds: string[], savedOrder: string[]) {
  const saved = savedOrder.filter((id) => candidateIds.includes(id));
  const newIds = candidateIds.filter((id) => !saved.includes(id));
  return [...saved, ...newIds];
}

function reorderPriorityIds(ids: string[], sourceId: string, targetId: string, position: "before" | "after") {
  if (sourceId === targetId) return ids;
  const without = ids.filter((id) => id !== sourceId);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex === -1) return ids;
  const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
  return [...without.slice(0, insertIndex), sourceId, ...without.slice(insertIndex)];
}

function uniqueBucketNames(templates: ResumeTemplate[], opportunities: Opportunity[], currentBucket?: string | null) {
  const names = [
    ...templates.map((t) => t.name.trim()).filter(Boolean),
    ...opportunities.map((o) => o.role_bucket.trim()).filter(Boolean),
  ];
  if (currentBucket?.trim()) names.unshift(currentBucket.trim());
  return Array.from(new Set(names));
}

function pickBucketByKeywords(role: string, description: string, options: string[]): string {
  const fallback = options[0] ?? "Neutral Resume";
  const text = `${role} ${description}`.toLowerCase();
  const find = (kws: string[]) => options.find((b) => kws.some((k) => b.toLowerCase().includes(k)));
  if (text.includes("chief of staff") || text.includes("founder")) return find(["chief", "staff"]) ?? fallback;
  if (text.includes("token") || text.includes("rwa") || text.includes("blockchain") || text.includes("crypto") || text.includes("digital asset")) return find(["digital", "rwa", "asset", "fintech", "crypto", "token"]) ?? fallback;
  if (text.includes("venture") || text.includes("startup") || text.includes("operator")) return find(["venture", "startup", "operator"]) ?? fallback;
  if (text.includes("partnership") || text.includes("corporate development") || text.includes("business development")) return find(["partnership", "corporate", "development"]) ?? fallback;
  if (text.includes("strategy") || text.includes("operations")) return find(["strategy", "operations"]) ?? fallback;
  return fallback;
}

function getAttentionReasons(opportunity: Opportunity, today: string) {
  const reasons: string[] = [];
  if (CLOSED_STATUSES.includes(opportunity.status)) return reasons;
  if (opportunity.next_action_date && opportunity.next_action_date <= today) reasons.push(`Next action due ${opportunity.next_action_date}`);
  if (opportunity.priority === "high" && !opportunity.next_action_date) reasons.push("High priority — no next action date");
  if (["new", "selected", "researching"].includes(opportunity.status) && daysSince(opportunity.created_at) >= 7) reasons.push(`Saved ${daysSince(opportunity.created_at)}d ago, still early-stage`);
  if (opportunity.listing_posted_date && daysSince(opportunity.listing_posted_date) >= 30 && !APPLICATION_PROGRESS_STATUSES.includes(opportunity.status)) reasons.push(`Listing ${daysSince(opportunity.listing_posted_date)}d old`);
  if (daysSince(opportunity.updated_at) >= 7) reasons.push(`No update in ${daysSince(opportunity.updated_at)}d`);
  return reasons;
}

function isPriorityQueueCandidate(opportunity: Opportunity) {
  if (CLOSED_STATUSES.includes(opportunity.status)) return false;
  return opportunity.is_pinned || opportunity.priority === "high";
}

function SourceBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label"><span>{label || "Direct / Unknown"}</span><strong>{value}</strong></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export function DashboardClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>([]);
  const [draft, setDraft] = useState<OpportunityInsert>(emptyDraft);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [draggedPriorityId, setDraggedPriorityId] = useState<string | null>(null);
  const [dragOverPriorityId, setDragOverPriorityId] = useState<string | null>(null);
  const [batchUrls, setBatchUrls] = useState("");
  const [batchDrafts, setBatchDrafts] = useState<Array<Partial<OpportunityInsert> & { _url: string; _loading?: boolean; _error?: string }>>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  async function loadOpportunities() {
    const [oppRes, tplRes] = await Promise.all([
      fetch("/api/opportunities"),
      fetch("/api/resume-templates"),
    ]);
    const oppPayload = (await oppRes.json()) as { data?: Opportunity[]; error?: string };
    const tplPayload = (await tplRes.json()) as { data?: ResumeTemplate[]; error?: string };
    if (oppPayload.error) setMessage(oppPayload.error);
    else setOpportunities(oppPayload.data ?? []);
    if (tplPayload.error) setMessage(tplPayload.error ?? "Could not load resume templates.");
    else {
      const templates = tplPayload.data ?? [];
      setResumeTemplates(templates);
      const names = templates.map((t) => t.name.trim()).filter(Boolean);
      if (names.length && !names.some((n) => n.toLowerCase() === draft.role_bucket.toLowerCase())) {
        setDraft((cur) => ({ ...cur, role_bucket: names[0] }));
      }
    }
  }

  useEffect(() => { void loadOpportunities(); }, []);
  useEffect(() => { setPriorityOrder(readPriorityOrder()); }, []);

  const bucketOptions = useMemo(() => uniqueBucketNames(resumeTemplates, opportunities, draft.role_bucket), [resumeTemplates, opportunities, draft.role_bucket]);

  const weekStart = startOfWeekIso();
  const today = todayIso();

  const metrics = useMemo(() => {
    const active = opportunities.filter((o) => !CLOSED_STATUSES.includes(o.status));
    return {
      total: opportunities.length,
      active: active.length,
      highPriority: opportunities.filter((o) => o.priority === "high" && !CLOSED_STATUSES.includes(o.status)).length,
      followUpsDue: opportunities.filter((o) => o.next_action_date && o.next_action_date <= today && !["closed", "rejected", "offer"].includes(o.status)).length,
      applicationsSent: opportunities.filter((o) => APPLICATION_SENT_STATUSES.includes(o.status)).length,
      interviews: opportunities.filter((o) => ["interviewing", "offer"].includes(o.status)).length,
      addedThisWeek: opportunities.filter((o) => o.created_at.slice(0, 10) >= weekStart).length,
      appliedThisWeek: opportunities.filter((o) => APPLICATION_SENT_STATUSES.includes(o.status) && o.updated_at.slice(0, 10) >= weekStart).length,
    };
  }, [opportunities, today, weekStart]);

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of opportunities) {
      if (CLOSED_STATUSES.includes(o.status)) continue;
      const key = o.source?.trim() || "";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [opportunities]);
  const maxSourceCount = Math.max(1, ...sourceCounts.map((s) => s.count));

  const priorityQueueItems = useMemo(() => {
    const active = opportunities.filter((o) => !CLOSED_STATUSES.includes(o.status));
    const candidateMap = new Map<string, { opportunity: Opportunity; reasons: string[] }>();
    active.forEach((o) => {
      if (isPriorityQueueCandidate(o)) candidateMap.set(o.id, { opportunity: o, reasons: getAttentionReasons(o, today) });
    });
    const candidateIds = Array.from(candidateMap.keys());
    const orderedIds = reconcilePriorityOrder(candidateIds, priorityOrder.length ? priorityOrder : candidateIds);
    return orderedIds.map((id) => candidateMap.get(id)).filter((item): item is { opportunity: Opportunity; reasons: string[] } => Boolean(item));
  }, [opportunities, priorityOrder, today]);

  async function patchOpportunity(id: string, update: Partial<OpportunityInsert>) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const payload = (await res.json()) as { data?: Opportunity; error?: string };
    if (!res.ok || payload.error || !payload.data) { setMessage(payload.error ?? "Update failed."); return; }
    const updated = payload.data;
    setOpportunities((cur) => cur.map((o) => o.id === id ? updated : o));
    if (update.is_pinned !== undefined || update.priority !== undefined || update.status !== undefined) {
      setPriorityOrder((cur) => {
        const without = cur.filter((pid) => pid !== updated.id);
        const next = isPriorityQueueCandidate(updated) ? [...without, updated.id] : without;
        writePriorityOrder(next);
        return next;
      });
    }
  }

  async function extractFromUrl() {
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/extract-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: sourceUrl }) });
      const payload = (await res.json()) as { error?: string; data?: Partial<OpportunityInsert> };
      if (!res.ok || payload.error) { setDraft((cur) => ({ ...cur, url: sourceUrl })); setMessage(payload.error ?? "Could not extract. Paste manually."); return; }
      const next = { ...draft, ...payload.data, url: sourceUrl };
      next.role_bucket = pickBucketByKeywords(next.role, next.job_description, bucketOptions);
      setDraft(next);
      setMessage("Extracted. Review fields before saving.");
    } catch { setDraft((cur) => ({ ...cur, url: sourceUrl })); setMessage("Could not extract. Paste manually."); }
    finally { setLoading(false); }
  }

  async function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const res = await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, status: draft.status || "new" }) });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok || payload.error) { setMessage(payload.error ?? "Could not save."); return; }
    setDraft({ ...emptyDraft, role_bucket: bucketOptions[0] ?? "Neutral Resume" });
    setSourceUrl("");
    setShowAddForm(false);
    setMessage("Opportunity saved.");
    await loadOpportunities();
  }

  async function runBatchExtract() {
    const urls = batchUrls.split(/\n|,/).map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { setMessage("Paste at least one URL."); return; }
    setBatchRunning(true);
    setBatchDrafts(urls.map((u) => ({ _url: u, _loading: true, company: "", role: "", job_description: "" })));
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch("/api/extract-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        const payload = (await res.json()) as { error?: string; data?: Partial<OpportunityInsert> };
        if (!res.ok || payload.error || !payload.data) throw new Error(payload.error ?? "Extraction failed");
        return { ...payload.data, url, _url: url };
      }),
    );
    setBatchDrafts(
      urls.map((url, i) => {
        const result = results[i];
        if (result.status === "fulfilled") return { ...result.value, _url: url, _loading: false };
        return { _url: url, _loading: false, _error: (result.reason as Error).message ?? "Failed", company: "", role: "", job_description: "" };
      }),
    );
    setBatchRunning(false);
  }

  async function saveBatchDraft(index: number) {
    const d = batchDrafts[index];
    if (!d.company || !d.role || !d.job_description) { setMessage("Company, role, and job description are required."); return; }
    const res = await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...emptyDraft, ...d, status: "new" }) });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok || payload.error) { setMessage(payload.error ?? "Could not save."); return; }
    setBatchDrafts((cur) => cur.filter((_, i) => i !== index));
    await loadOpportunities();
  }

  function dismissBatchDraft(index: number) {
    setBatchDrafts((cur) => cur.filter((_, i) => i !== index));
  }

  function handlePriorityDragStart(e: DragEvent<HTMLElement>, id: string) {
    setDraggedPriorityId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handlePriorityDrop(e: DragEvent<HTMLElement>, targetId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedPriorityId;
    if (!sourceId || sourceId === targetId) { setDraggedPriorityId(null); setDragOverPriorityId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY > rect.top + rect.height / 2 ? "after" : "before";
    const currentOrder = priorityQueueItems.map(({ opportunity }) => opportunity.id);
    const next = reorderPriorityIds(currentOrder, sourceId, targetId, position);
    setPriorityOrder(next);
    writePriorityOrder(next);
    setMessage("Order updated.");
    setDraggedPriorityId(null);
    setDragOverPriorityId(null);
  }

  function renderOpportunityControls(opportunity: Opportunity, compact = false) {
    return (
      <div className={compact ? "card-control-grid compact-controls" : "card-control-grid"}>
        <label>Status
          <select value={opportunity.status} onChange={(e) => void patchOpportunity(opportunity.id, { status: e.target.value as OpportunityStatus })}>
            {OPPORTUNITY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label>Priority
          <select value={opportunity.priority} onChange={(e) => void patchOpportunity(opportunity.id, { priority: e.target.value as OpportunityPriority })}>
            {OPPORTUNITY_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </label>
        <label>Next action
          <input type="date" value={opportunity.next_action_date ?? ""} onChange={(e) => void patchOpportunity(opportunity.id, { next_action_date: e.target.value || null })} />
        </label>
        <button className="secondary" type="button" onClick={() => void patchOpportunity(opportunity.id, { is_pinned: !opportunity.is_pinned })}>
          {opportunity.is_pinned ? "Unpin" : "Pin"}
        </button>
        <Link href={`/opportunities/${opportunity.id}`}>Open detail</Link>
      </div>
    );
  }

  function renderOpportunitySummary(opportunity: Opportunity, reasons: string[], compact = false) {
    return (
      <Link className="card-click-area" href={`/opportunities/${opportunity.id}`} aria-label={`Open ${opportunity.role} at ${opportunity.company}`}>
        <p>{opportunity.company}{opportunity.location ? ` · ${opportunity.location}` : ""}{opportunity.source ? ` · via ${opportunity.source}` : ""}</p>
        {!compact ? <p className="date-line">Posted: {formatDate(opportunity.listing_posted_date)} · Saved: {formatDate(opportunity.created_at)} ({formatAgeFrom(opportunity.created_at)})</p> : null}
        <p className="muted">Next: {opportunity.next_action_date ?? "No next action date"}</p>
        {reasons.length ? <p className="attention-note">⚠ {reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1} more` : ""}</p> : null}
        {opportunity.network_notes ? <p className="muted">{opportunity.network_notes}</p> : null}
      </Link>
    );
  }

  return (
    <div className="stack">
      <section className="metric-grid">
        <div className="metric-card"><span>Active</span><strong>{metrics.active}</strong></div>
        <div className="metric-card"><span>High priority</span><strong>{metrics.highPriority}</strong></div>
        <div className="metric-card"><span>Follow-ups due</span><strong>{metrics.followUpsDue}</strong></div>
        <div className="metric-card"><span>Applications sent</span><strong>{metrics.applicationsSent}</strong></div>
        <div className="metric-card"><span>Interviews</span><strong>{metrics.interviews}</strong></div>
        <div className="metric-card accent"><span>Added this week</span><strong>{metrics.addedThisWeek}</strong></div>
        <div className="metric-card accent"><span>Applied this week</span><strong>{metrics.appliedThisWeek}</strong></div>
      </section>

      {message ? <p className={message.includes("not") || message.includes("Could") || message.includes("error") ? "error" : "muted"}>{message}</p> : null}

      <div className="dashboard-overview">
        <div className="dashboard-side stack">
          <section className="card stack">
            <div className="row">
              <h2>Priority Queue</h2>
              <Link className="button secondary" href="/pipeline">View full pipeline →</Link>
            </div>
            <p className="muted">High-priority and pinned items. Drag ↕ to reorder.</p>
            {priorityQueueItems.length === 0 ? (
              <p className="muted">No high-priority or pinned items. Pin an opportunity or mark it High priority to see it here.</p>
            ) : (
              <div className="priority-list">
                {priorityQueueItems.map(({ opportunity, reasons }) => (
                  <article
                    className={`mini-card pinned-card priority-card${dragOverPriorityId === opportunity.id ? " drag-over" : ""}`}
                    key={opportunity.id}
                    onDragOver={(e) => { e.preventDefault(); setDragOverPriorityId(opportunity.id); }}
                    onDragLeave={() => setDragOverPriorityId(null)}
                    onDrop={(e) => handlePriorityDrop(e, opportunity.id)}
                    onDragEnd={() => { setDraggedPriorityId(null); setDragOverPriorityId(null); }}
                  >
                    <div className="row card-title-row">
                      <span className="drag-handle" draggable onDragStart={(e) => handlePriorityDragStart(e, opportunity.id)} title="Drag to reorder">↕</span>
                      <Link className="card-title-link" href={`/opportunities/${opportunity.id}`}>{opportunity.role}</Link>
                      <span className="badge">{STATUS_LABELS[opportunity.status]}</span>
                      {opportunity.priority === "high" ? <span className="badge warning">High</span> : null}
                      {opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}
                      {reasons.length ? <span className="badge warning">Needs attention</span> : null}
                    </div>
                    {renderOpportunitySummary(opportunity, reasons, true)}
                    {renderOpportunityControls(opportunity, true)}
                  </article>
                ))}
              </div>
            )}
          </section>

          {sourceCounts.length > 0 && (
            <section className="card stack">
              <h2>Pipeline by source</h2>
              <p className="muted">Where your active opportunities are coming from.</p>
              {sourceCounts.map(({ source, count }) => (
                <SourceBar key={source} label={source} value={count} max={maxSourceCount} />
              ))}
            </section>
          )}
        </div>

        <div className="dashboard-right stack">
          <section className="card stack create-opportunity-panel">
            <div className="row">
              <h2>Add opportunity</h2>
              <button className="secondary" type="button" onClick={() => setShowAddForm((v) => !v)}>
                {showAddForm ? "Collapse" : "Expand form"}
              </button>
            </div>
            <label>Source URL
              <div className="row">
                <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
                <button type="button" disabled={!sourceUrl || loading} onClick={extractFromUrl}>{loading ? "Extracting…" : "Extract"}</button>
              </div>
            </label>
            {showAddForm && (
              <form className="stack" onSubmit={saveOpportunity}>
                <label>Company<input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} required /></label>
                <label>Role<input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value, role_bucket: pickBucketByKeywords(e.target.value, draft.job_description, bucketOptions) })} required /></label>
                <label>Location<input value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label>
                <label>URL<input value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
                <label>Source<input value={draft.source ?? ""} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Wellfound, LinkedIn, Builtin, referral…" /></label>
                <label>Listing posted date<input type="date" value={draft.listing_posted_date ?? ""} onChange={(e) => setDraft({ ...draft, listing_posted_date: e.target.value || null })} /></label>
                <label>Resume template
                  <select value={draft.role_bucket} onChange={(e) => setDraft({ ...draft, role_bucket: e.target.value })}>
                    {bucketOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label>Priority
                  <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as OpportunityPriority })}>
                    {OPPORTUNITY_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                  </select>
                </label>
                <label>Next action date<input type="date" value={draft.next_action_date ?? ""} onChange={(e) => setDraft({ ...draft, next_action_date: e.target.value || null })} /></label>
                <label>Job description<textarea value={draft.job_description} onChange={(e) => setDraft({ ...draft, job_description: e.target.value, role_bucket: pickBucketByKeywords(draft.role, e.target.value, bucketOptions) })} required /></label>
                <label>Network notes<textarea value={draft.network_notes ?? ""} onChange={(e) => setDraft({ ...draft, network_notes: e.target.value })} placeholder="Warm intro path, LinkedIn notes, alumni/contact ideas" /></label>
                <div className="row">
                  <button type="submit">Save opportunity</button>
                  <button className="secondary" type="button" onClick={() => setShowAddForm(false)}>Collapse</button>
                </div>
              </form>
            )}
          </section>

          <section className="card stack">
            <h2>Batch import</h2>
            <p className="muted">Paste multiple job URLs — one per line. Extracts them all in parallel and queues for review.</p>
            <label>URLs
              <textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder={"https://wellfound.com/jobs/123\nhttps://builtin.com/jobs/456"}
                rows={4}
              />
            </label>
            <button type="button" disabled={!batchUrls.trim() || batchRunning} onClick={runBatchExtract}>
              {batchRunning ? "Extracting…" : "Extract all"}
            </button>
            {batchDrafts.length > 0 && (
              <div className="stack">
                <p className="muted">{batchDrafts.length} item{batchDrafts.length > 1 ? "s" : ""} in queue. Review and save what you want.</p>
                {batchDrafts.map((d, i) => (
                  <article className="mini-card stack" key={d._url}>
                    {d._loading ? (
                      <p className="muted">Extracting {d._url}…</p>
                    ) : d._error ? (
                      <div className="row">
                        <p className="error">{d._url} — {d._error}</p>
                        <button className="secondary" type="button" onClick={() => dismissBatchDraft(i)}>Dismiss</button>
                      </div>
                    ) : (
                      <>
                        <div className="row card-title-row">
                          <strong>{d.role || "Unknown role"}</strong>
                          <span className="badge">{d.company || "Unknown company"}</span>
                          {d.location ? <span className="muted">{d.location}</span> : null}
                        </div>
                        <p className="muted">{d._url}</p>
                        <div className="row">
                          <label>Company<input value={d.company ?? ""} onChange={(e) => setBatchDrafts((cur) => cur.map((item, idx) => idx === i ? { ...item, company: e.target.value } : item))} /></label>
                          <label>Role<input value={d.role ?? ""} onChange={(e) => setBatchDrafts((cur) => cur.map((item, idx) => idx === i ? { ...item, role: e.target.value } : item))} /></label>
                          <label>Source<input value={d.source ?? ""} onChange={(e) => setBatchDrafts((cur) => cur.map((item, idx) => idx === i ? { ...item, source: e.target.value } : item))} placeholder="Wellfound, Builtin…" /></label>
                        </div>
                        <div className="row">
                          <button type="button" onClick={() => void saveBatchDraft(i)}>Save</button>
                          <button className="secondary" type="button" onClick={() => dismissBatchDraft(i)}>Dismiss</button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
