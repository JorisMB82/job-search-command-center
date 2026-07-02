"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import type { Opportunity, OpportunityInsert, OpportunityPriority, OpportunityStatus, ResumeTemplate } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from "../lib/database.types";

const PRIORITY_ORDER_STORAGE_KEY = "job-search-command-center:priority-order-v1";
const LEGACY_PINNED_ORDER_STORAGE_KEY = "job-search-command-center:pinned-order-v1";

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

const ACTIVE_PIPELINE_STATUSES: OpportunityStatus[] = ["new", "selected", "researching", "outreach_drafted", "outreach_sent", "follow_up_due", "applied", "interviewing", "offer"];
const CLOSED_STATUSES: OpportunityStatus[] = ["closed", "rejected"];
const APPLICATION_PROGRESS_STATUSES: OpportunityStatus[] = ["outreach_drafted", "outreach_sent", "follow_up_due", "applied", "interviewing", "offer"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(isoDate: string) {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
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

function formatPercent(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function readStoredOrder(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readPriorityOrder() {
  const priorityOrder = readStoredOrder(PRIORITY_ORDER_STORAGE_KEY);
  return priorityOrder.length ? priorityOrder : readStoredOrder(LEGACY_PINNED_ORDER_STORAGE_KEY);
}

function writePriorityOrder(order: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIORITY_ORDER_STORAGE_KEY, JSON.stringify(order));
}

function reconcilePriorityOrder(candidateIds: string[], savedOrder: string[]) {
  const savedCandidateIds = savedOrder.filter((id) => candidateIds.includes(id));
  const newCandidateIds = candidateIds.filter((id) => !savedCandidateIds.includes(id));
  return [...savedCandidateIds, ...newCandidateIds];
}

function reorderPriorityIds(ids: string[], sourceId: string, targetId: string, position: "before" | "after") {
  if (sourceId === targetId) return ids;
  const withoutSource = ids.filter((id) => id !== sourceId);
  const targetIndex = withoutSource.indexOf(targetId);
  if (targetIndex === -1) return ids;
  const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
  return [...withoutSource.slice(0, insertIndex), sourceId, ...withoutSource.slice(insertIndex)];
}

function uniqueBucketNames(templates: ResumeTemplate[], opportunities: Opportunity[] = [], currentBucket?: string | null) {
  const names = [
    ...templates.map((template) => template.name.trim()).filter(Boolean),
    ...opportunities.map((opportunity) => opportunity.role_bucket.trim()).filter(Boolean),
  ];
  if (currentBucket?.trim()) names.unshift(currentBucket.trim());
  return Array.from(new Set(names));
}

function pickBucketByKeywords(role: string, description: string, bucketOptions: string[]): string {
  const fallback = bucketOptions[0] ?? "Neutral Resume";
  const text = `${role} ${description}`.toLowerCase();
  const findBucket = (keywords: string[]) => bucketOptions.find((bucket) => keywords.some((keyword) => bucket.toLowerCase().includes(keyword)));

  if (text.includes("chief of staff") || text.includes("founder's office") || text.includes("founder office") || text.includes("ceo office")) return findBucket(["chief", "staff"]) ?? fallback;
  if (text.includes("token") || text.includes("digital asset") || text.includes("rwa") || text.includes("blockchain") || text.includes("crypto") || text.includes("payments") || text.includes("fintech")) return findBucket(["digital", "rwa", "asset", "fintech", "crypto", "token"]) ?? fallback;
  if (text.includes("venture") || text.includes("startup") || text.includes("incubator") || text.includes("accelerator") || text.includes("operator")) return findBucket(["venture", "startup", "operator", "build"]) ?? fallback;
  if (text.includes("partnership") || text.includes("corporate development") || text.includes("corp dev") || text.includes("business development") || text.includes("strategic alliance")) return findBucket(["partnership", "corporate", "corp", "development", "business"]) ?? fallback;
  if (text.includes("strategy") || text.includes("operations") || text.includes("business operations")) return findBucket(["strategy", "operations", "ops"]) ?? fallback;
  return fallback;
}

function matchesSearch(opportunity: Opportunity, searchTerm: string) {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;
  const searchable = [opportunity.company, opportunity.role, opportunity.location, opportunity.url, opportunity.source, opportunity.role_bucket, opportunity.priority, STATUS_LABELS[opportunity.status], opportunity.listing_posted_date, opportunity.created_at, opportunity.notes, opportunity.interview_prep_notes, opportunity.resume_tailoring_notes, opportunity.general_notes, opportunity.network_notes].filter(Boolean).join(" ").toLowerCase();
  return searchable.includes(query);
}

function getAttentionReasons(opportunity: Opportunity, today: string) {
  const reasons: string[] = [];
  if (CLOSED_STATUSES.includes(opportunity.status)) return reasons;

  if (opportunity.next_action_date && opportunity.next_action_date <= today) reasons.push(`Next action due ${opportunity.next_action_date}`);
  if (opportunity.priority === "high" && !opportunity.next_action_date) reasons.push("High priority with no next action date");
  if (opportunity.priority === "high" && !opportunity.is_pinned) reasons.push("High priority but not pinned");
  if (["new", "selected", "researching"].includes(opportunity.status) && daysSince(opportunity.created_at) >= 7) reasons.push(`Saved ${daysSince(opportunity.created_at)} days ago and still early-stage`);
  if (opportunity.listing_posted_date && daysSince(opportunity.listing_posted_date) >= 30 && !APPLICATION_PROGRESS_STATUSES.includes(opportunity.status)) reasons.push(`Listing posted ${daysSince(opportunity.listing_posted_date)} days ago`);
  if (daysSince(opportunity.updated_at) >= 7) reasons.push(`No update in ${daysSince(opportunity.updated_at)} days`);
  return reasons;
}

function isPriorityQueueCandidate(opportunity: Opportunity) {
  if (CLOSED_STATUSES.includes(opportunity.status)) return false;
  return opportunity.is_pinned || opportunity.priority === "high";
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return <div className="bar-row"><div className="bar-label"><span>{label}</span><strong>{value}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div></div>;
}

function statusCount(opportunities: Opportunity[], status: OpportunityStatus) {
  return opportunities.filter((opportunity) => opportunity.status === status).length;
}

export function DashboardClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>([]);
  const [draft, setDraft] = useState<OpportunityInsert>(emptyDraft);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bucketFilter, setBucketFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | "all">("all");
  const [showPriorityItems, setShowPriorityItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [draggedPriorityId, setDraggedPriorityId] = useState<string | null>(null);
  const [dragOverPriorityId, setDragOverPriorityId] = useState<string | null>(null);

  async function loadOpportunities() {
    const [opportunitiesResponse, templatesResponse] = await Promise.all([
      fetch("/api/opportunities"),
      fetch("/api/resume-templates"),
    ]);
    const opportunitiesPayload = (await opportunitiesResponse.json()) as { data?: Opportunity[]; error?: string };
    const templatesPayload = (await templatesResponse.json()) as { data?: ResumeTemplate[]; error?: string };

    if (!opportunitiesResponse.ok || opportunitiesPayload.error) setMessage(opportunitiesPayload.error ?? "Could not load opportunities.");
    else setOpportunities(opportunitiesPayload.data ?? []);

    if (!templatesResponse.ok || templatesPayload.error) setMessage(templatesPayload.error ?? "Could not load resume templates.");
    else {
      const templates = templatesPayload.data ?? [];
      setResumeTemplates(templates);
      const templateNames = templates.map((template) => template.name.trim()).filter(Boolean);
      if (templateNames.length && !templateNames.some((name) => name.toLowerCase() === draft.role_bucket.toLowerCase())) {
        setDraft((current) => ({ ...current, role_bucket: templateNames[0] }));
      }
    }
  }

  useEffect(() => { void loadOpportunities(); }, []);
  useEffect(() => { setPriorityOrder(readPriorityOrder()); }, []);

  const bucketOptions = useMemo(() => uniqueBucketNames(resumeTemplates, opportunities, draft.role_bucket), [resumeTemplates, opportunities, draft.role_bucket]);

  async function extractFromUrl() {
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/extract-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: sourceUrl }) });
      const payload = (await response.json()) as { error?: string; data?: Partial<OpportunityInsert> };
      if (!response.ok || payload.error) {
        setDraft((current) => ({ ...current, url: sourceUrl }));
        setMessage(payload.error ?? "Could not extract that URL. Paste the job description manually.");
        return;
      }
      const next = { ...draft, ...payload.data, url: sourceUrl };
      next.role_bucket = pickBucketByKeywords(next.role, next.job_description, bucketOptions);
      setDraft(next);
      setMessage("Extraction complete. Review and edit fields before saving.");
    } catch {
      setDraft((current) => ({ ...current, url: sourceUrl }));
      setMessage("Could not extract that URL. Paste the job description manually.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, status: draft.status || "new" }) });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Could not save opportunity.");
      return;
    }
    setDraft({ ...emptyDraft, role_bucket: bucketOptions[0] ?? "Neutral Resume" });
    setSourceUrl("");
    setMessage("Opportunity saved.");
    await loadOpportunities();
  }

  function savePriorityOrder(nextOrder: string[], confirmation?: string) {
    setPriorityOrder(nextOrder);
    writePriorityOrder(nextOrder);
    if (confirmation) setMessage(confirmation);
  }

  async function patchOpportunity(id: string, update: Partial<OpportunityInsert>) {
    const response = await fetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
    const payload = (await response.json()) as { data?: Opportunity; error?: string };
    if (!response.ok || payload.error || !payload.data) {
      setMessage(payload.error ?? "Could not update opportunity.");
      return;
    }

    const updatedOpportunity = payload.data as Opportunity;
    setOpportunities((current) => current.map((opportunity) => opportunity.id === id ? updatedOpportunity : opportunity));

    if (update.is_pinned !== undefined || update.priority !== undefined || update.status !== undefined) {
      setPriorityOrder((current) => {
        const withoutCurrent = current.filter((priorityId) => priorityId !== updatedOpportunity.id);
        const nextOrder = isPriorityQueueCandidate(updatedOpportunity) ? [...withoutCurrent, updatedOpportunity.id] : withoutCurrent;
        writePriorityOrder(nextOrder);
        return nextOrder;
      });
    }
  }

  function handlePriorityDragStart(event: DragEvent<HTMLElement>, opportunityId: string) {
    setDraggedPriorityId(opportunityId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", opportunityId);
  }

  function handlePriorityDrop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedPriorityId;
    if (!sourceId || sourceId === targetId) {
      setDraggedPriorityId(null);
      setDragOverPriorityId(null);
      return;
    }

    const targetRect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY > targetRect.top + targetRect.height / 2 ? "after" : "before";
    const currentOrder = priorityQueueItems.map(({ opportunity }) => opportunity.id);
    const nextOrder = reorderPriorityIds(currentOrder, sourceId, targetId, position);
    savePriorityOrder(nextOrder, "Priority Queue order updated. Order is saved in this browser.");
    setDraggedPriorityId(null);
    setDragOverPriorityId(null);
  }

  function clearFilters() {
    setBucketFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setShowPriorityItems(false);
    setSearchTerm("");
  }

  const today = todayIso();
  const activeOpportunities = opportunities.filter((opportunity) => !CLOSED_STATUSES.includes(opportunity.status));

  const metrics = useMemo(() => ({
    total: opportunities.length,
    highPriority: opportunities.filter((opportunity) => opportunity.priority === "high").length,
    followUpsDue: opportunities.filter((opportunity) => opportunity.next_action_date && opportunity.next_action_date <= today && !["closed", "rejected", "offer"].includes(opportunity.status)).length,
    applicationsSent: opportunities.filter((opportunity) => ["applied", "outreach_drafted", "outreach_sent", "follow_up_due", "interviewing", "offer", "rejected", "closed"].includes(opportunity.status)).length,
    interviews: opportunities.filter((opportunity) => ["interviewing", "offer"].includes(opportunity.status)).length,
  }), [opportunities, today]);

  const bucketCounts = bucketOptions.map((bucket) => ({ bucket, count: opportunities.filter((opportunity) => opportunity.role_bucket === bucket).length }));
  const maxBucketCount = Math.max(1, ...bucketCounts.map((item) => item.count));

  const priorityQueueItems = useMemo(() => {
    const candidateMap = new Map<string, { opportunity: Opportunity; reasons: string[] }>();
    activeOpportunities.forEach((opportunity) => {
      if (isPriorityQueueCandidate(opportunity)) candidateMap.set(opportunity.id, { opportunity, reasons: getAttentionReasons(opportunity, today) });
    });

    const candidateIds = Array.from(candidateMap.keys());
    const seededOrder = priorityOrder.length ? priorityOrder : candidateIds;
    const orderedIds = reconcilePriorityOrder(candidateIds, seededOrder);

    return orderedIds
      .map((id) => candidateMap.get(id))
      .filter((item): item is { opportunity: Opportunity; reasons: string[] } => Boolean(item));
  }, [activeOpportunities, priorityOrder, today]);

  const priorityQueueIds = useMemo(() => new Set(priorityQueueItems.map(({ opportunity }) => opportunity.id)), [priorityQueueItems]);
  const otherOpportunityCount = opportunities.filter((opportunity) => !priorityQueueIds.has(opportunity.id)).length;

  const funnelCounts = ACTIVE_PIPELINE_STATUSES.map((status) => statusCount(opportunities, status));
  const maxFunnelCount = Math.max(1, ...funnelCounts);
  const funnelStages = ACTIVE_PIPELINE_STATUSES.map((status) => {
    const count = statusCount(opportunities, status);
    const percent = metrics.total === 0 ? 0 : Math.round((count / metrics.total) * 100);
    const width = metrics.total === 0 ? 100 : count === 0 ? 26 : Math.max(34, Math.round((count / maxFunnelCount) * 100));
    return { status, label: STATUS_LABELS[status], count, percent, width };
  });

  const filteredOpportunities = opportunities.filter((opportunity) => {
    if (!showPriorityItems && priorityQueueIds.has(opportunity.id)) return false;
    if (!matchesSearch(opportunity, searchTerm)) return false;
    if (bucketFilter !== "all" && opportunity.role_bucket !== bucketFilter) return false;
    if (statusFilter !== "all" && opportunity.status !== statusFilter) return false;
    if (priorityFilter !== "all" && opportunity.priority !== priorityFilter) return false;
    return true;
  });

  function renderOpportunityControls(opportunity: Opportunity, compact = false) {
    return <div className={compact ? "card-control-grid compact-controls" : "card-control-grid"}>
      <label>Status<select value={opportunity.status} onChange={(event) => void patchOpportunity(opportunity.id, { status: event.target.value as OpportunityStatus })}>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      <label>Priority<select value={opportunity.priority} onChange={(event) => void patchOpportunity(opportunity.id, { priority: event.target.value as OpportunityPriority })}>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label>
      <label>Next action<input type="date" value={opportunity.next_action_date ?? ""} onChange={(event) => void patchOpportunity(opportunity.id, { next_action_date: event.target.value || null })} /></label>
      <button className="secondary" type="button" onClick={() => void patchOpportunity(opportunity.id, { is_pinned: !opportunity.is_pinned })}>{opportunity.is_pinned ? "Unpin" : "Pin"}</button>
      <Link href={`/opportunities/${opportunity.id}`}>Open detail</Link>
    </div>;
  }

  function renderOpportunitySummary(opportunity: Opportunity, reasons: string[], compact = false) {
    return <Link className="card-click-area" href={`/opportunities/${opportunity.id}`} aria-label={`Open ${opportunity.role} at ${opportunity.company}`}>
      <p>{opportunity.company}{opportunity.location ? ` · ${opportunity.location}` : ""} · {opportunity.role_bucket}</p>
      {!compact ? <p className="date-line">Posted: {formatDate(opportunity.listing_posted_date)} · Saved: {formatDate(opportunity.created_at)} ({formatAgeFrom(opportunity.created_at)})</p> : null}
      <p className="muted">Next: {opportunity.next_action_date ?? "No next action date"}</p>
      {reasons.length ? <p className="attention-note">Needs attention: {reasons[0]}{reasons.length > 1 ? ` + ${reasons.length - 1} more` : ""}</p> : null}
      {opportunity.network_notes ? <p>{opportunity.network_notes}</p> : null}
    </Link>;
  }

  return (
    <div className="stack">
      <section className="metric-grid">
        <div className="metric-card"><span>Total opportunities</span><strong>{metrics.total}</strong></div>
        <div className="metric-card"><span>High priority</span><strong>{metrics.highPriority}</strong></div>
        <div className="metric-card"><span>Follow-ups due</span><strong>{metrics.followUpsDue}</strong></div>
        <div className="metric-card"><span>Applications sent</span><strong>{metrics.applicationsSent}</strong></div>
        <div className="metric-card"><span>Interviews</span><strong>{metrics.interviews}</strong></div>
      </section>

      <div className="dashboard-overview">
        <div className="dashboard-side stack">
          <section className="card stack">
            <h2>Priority Queue</h2>
            <p className="muted">Only high-priority or pinned opportunities. Click a card to open detail; use controls for quick updates; drag by the ↕ handle.</p>
            {priorityQueueItems.length === 0 ? <p className="muted">No high-priority or pinned items right now.</p> : <div className="priority-list">{priorityQueueItems.map(({ opportunity, reasons }) => <article className={`mini-card pinned-card priority-card${dragOverPriorityId === opportunity.id ? " drag-over" : ""}`} key={opportunity.id} onDragOver={(event) => { event.preventDefault(); setDragOverPriorityId(opportunity.id); }} onDragLeave={() => setDragOverPriorityId(null)} onDrop={(event) => handlePriorityDrop(event, opportunity.id)} onDragEnd={() => { setDraggedPriorityId(null); setDragOverPriorityId(null); }} aria-label={`Priority opportunity: ${opportunity.role}. Drag by the handle to reorder.`}>
              <div className="row card-title-row"><span className="drag-handle" draggable onDragStart={(event) => handlePriorityDragStart(event, opportunity.id)} aria-label="Drag to reorder" title="Drag to reorder">↕</span><Link className="card-title-link" href={`/opportunities/${opportunity.id}`}>{opportunity.role}</Link><span className="badge">{STATUS_LABELS[opportunity.status]}</span>{opportunity.priority === "high" ? <span className="badge warning">High</span> : null}{opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}{reasons.length ? <span className="badge warning">Needs attention</span> : null}</div>
              {renderOpportunitySummary(opportunity, reasons, true)}
              {renderOpportunityControls(opportunity, true)}
            </article>)}</div>}
          </section>

          <section className="card stack"><h2>Resume template map</h2><p className="muted">Shows market volume by saved resume version. Keep template names aligned with how you want prompts matched.</p>{bucketCounts.map(({ bucket, count }) => <Bar key={bucket} label={bucket} value={count} max={maxBucketCount} />)}</section>
        </div>

        <div className="dashboard-right stack">
          <section className="card stack funnel-card"><h2>Status funnel</h2><p className="muted">Count and percentage of the total pipeline in each stage.</p><div className="visual-funnel" aria-label="Opportunity status funnel">{funnelStages.map((stage) => <div className="funnel-band" key={stage.status} style={{ width: `${stage.width}%` }}><span className="funnel-label">{stage.label}</span><strong className="funnel-value">{stage.count} · {formatPercent(stage.count, metrics.total)}</strong></div>)}</div></section>

          <section className="card stack opportunities-panel">
            <div className="opportunities-search-box"><h2>Other Opportunities</h2><p className="muted">Everything not currently high-priority or pinned. Use filters to review the broader pipeline.</p><label className="search-row">Search<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search company, role, source, dates, notes, contact path..." /></label><div className="filter-grid"><label>Resume template<select value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value)}><option value="all">All templates</option>{bucketOptions.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OpportunityStatus | "all")}><option value="all">All statuses</option>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label><label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as OpportunityPriority | "all")}><option value="all">All priorities</option>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={showPriorityItems} onChange={(event) => setShowPriorityItems(event.target.checked)} /> Include Priority Queue items</label><button className="secondary" type="button" onClick={clearFilters}>Clear filters</button></div><p className="muted">Showing {filteredOpportunities.length} of {showPriorityItems ? opportunities.length : otherOpportunityCount} {showPriorityItems ? "total" : "other"} opportunities.</p></div>
            <div className="opportunities-scroll" aria-label="Scrollable opportunities list">
              {filteredOpportunities.length === 0 ? <p className="muted">No opportunities match these filters.</p> : filteredOpportunities.map((opportunity) => {
                const reasons = getAttentionReasons(opportunity, today);
                return (
                  <article className="card opportunity-card" key={opportunity.id}>
                    <div className="row card-title-row"><Link className="card-title-link" href={`/opportunities/${opportunity.id}`}>{opportunity.role}</Link><span className="badge">{STATUS_LABELS[opportunity.status]}</span>{opportunity.priority === "high" ? <span className="badge warning">High</span> : null}{opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}{reasons.length ? <span className="badge warning">Needs attention</span> : null}</div>
                    {renderOpportunitySummary(opportunity, reasons)}
                    {renderOpportunityControls(opportunity)}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <section className="card stack create-opportunity-panel">
        <h2>Create opportunity</h2>
        <label>Source URL (optional)<div className="row"><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://company.example/jobs/123" /><button type="button" disabled={!sourceUrl || loading} onClick={extractFromUrl}>Extract</button></div></label>
        <form className="stack" onSubmit={saveOpportunity}>
          <label>Company<input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} required /></label>
          <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value, role_bucket: pickBucketByKeywords(event.target.value, draft.job_description, bucketOptions) })} required /></label>
          <label>Location<input value={draft.location ?? ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
          <label>URL<input value={draft.url ?? ""} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
          <label>Source<input value={draft.source ?? ""} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="Wellfound, LinkedIn, company site, recruiter, referral" /></label>
          <label>Listing posted date<input type="date" value={draft.listing_posted_date ?? ""} onChange={(event) => setDraft({ ...draft, listing_posted_date: event.target.value || null })} /></label>
          <label>Resume template / bucket<select value={draft.role_bucket} onChange={(event) => setDraft({ ...draft, role_bucket: event.target.value })}>{bucketOptions.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label>
          <label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as OpportunityPriority })}>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label>
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OpportunityStatus })}>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
          <label>Next action date<input type="date" value={draft.next_action_date ?? ""} onChange={(event) => setDraft({ ...draft, next_action_date: event.target.value || null })} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={draft.is_pinned} onChange={(event) => setDraft({ ...draft, is_pinned: event.target.checked })} /> Pin as priority item</label>
          <label>Job description<textarea value={draft.job_description} onChange={(event) => setDraft({ ...draft, job_description: event.target.value, role_bucket: pickBucketByKeywords(draft.role, event.target.value, bucketOptions) })} required /></label>
          <label>Network notes<textarea value={draft.network_notes ?? ""} onChange={(event) => setDraft({ ...draft, network_notes: event.target.value })} placeholder="Warm intro path, LinkedIn search notes, alumni/contact ideas" /></label>
          <label>General notes<textarea value={draft.general_notes ?? draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, general_notes: event.target.value, notes: event.target.value })} placeholder="Manual call notes, recruiter context, compensation notes, or initial observations." /></label>
          <button type="submit">Save opportunity</button>
        </form>
        {message ? <p className={message.includes("not") || message.includes("Could") || message.includes("error") ? "error" : "muted"}>{message}</p> : null}
      </section>
    </div>
  );
}
