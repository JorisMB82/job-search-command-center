"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Opportunity, OpportunityInsert, OpportunityPriority, OpportunityStatus, ResumeTemplate } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, STATUS_LABELS } from "../lib/database.types";

const CLOSED_STATUSES: OpportunityStatus[] = ["closed", "rejected"];
const ACTIVE_PIPELINE_STATUSES: OpportunityStatus[] = [
  "new", "selected", "researching", "outreach_drafted",
  "outreach_sent", "follow_up_due", "applied", "interviewing", "offer",
];

function todayIso() { return new Date().toISOString().slice(0, 10); }

function daysSince(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
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

function matchesSearch(opportunity: Opportunity, term: string) {
  if (!term.trim()) return true;
  const query = term.trim().toLowerCase();
  const searchable = [
    opportunity.company, opportunity.role, opportunity.location,
    opportunity.url, opportunity.source, opportunity.role_bucket,
    opportunity.priority, STATUS_LABELS[opportunity.status],
    opportunity.listing_posted_date, opportunity.created_at,
    opportunity.notes, opportunity.general_notes, opportunity.network_notes,
  ].filter(Boolean).join(" ").toLowerCase();
  return searchable.includes(query);
}

function getAttentionReasons(opportunity: Opportunity, today: string) {
  const reasons: string[] = [];
  if (CLOSED_STATUSES.includes(opportunity.status)) return reasons;
  if (opportunity.next_action_date && opportunity.next_action_date <= today) reasons.push(`Next action due ${opportunity.next_action_date}`);
  if (opportunity.priority === "high" && !opportunity.next_action_date) reasons.push("High priority — no next action date");
  if (["new", "selected", "researching"].includes(opportunity.status) && daysSince(opportunity.created_at) >= 7) reasons.push(`Saved ${daysSince(opportunity.created_at)}d ago, still early-stage`);
  if (daysSince(opportunity.updated_at) >= 7) reasons.push(`No update in ${daysSince(opportunity.updated_at)}d`);
  return reasons;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function statusCount(opportunities: Opportunity[], status: OpportunityStatus) {
  return opportunities.filter((o) => o.status === status).length;
}

export function PipelineClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [resumeTemplates, setResumeTemplates] = useState<ResumeTemplate[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | "all">("all");
  const [showClosed, setShowClosed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  async function loadAll() {
    const [oppRes, tplRes] = await Promise.all([fetch("/api/opportunities"), fetch("/api/resume-templates")]);
    const oppPayload = (await oppRes.json()) as { data?: Opportunity[]; error?: string };
    const tplPayload = (await tplRes.json()) as { data?: ResumeTemplate[]; error?: string };
    if (oppPayload.error) setMessage(oppPayload.error);
    else setOpportunities(oppPayload.data ?? []);
    if (!tplPayload.error) setResumeTemplates(tplPayload.data ?? []);
  }

  useEffect(() => { void loadAll(); }, []);

  const today = todayIso();

  async function patchOpportunity(id: string, update: Partial<OpportunityInsert>) {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const payload = (await res.json()) as { data?: Opportunity; error?: string };
    if (!res.ok || payload.error || !payload.data) { setMessage(payload.error ?? "Update failed."); return; }
    setOpportunities((cur) => cur.map((o) => o.id === id ? payload.data as Opportunity : o));
  }

  const bucketOptions = useMemo(() => {
    const names = [
      ...resumeTemplates.map((t) => t.name.trim()),
      ...opportunities.map((o) => o.role_bucket.trim()),
    ].filter(Boolean);
    return Array.from(new Set(names));
  }, [resumeTemplates, opportunities]);

  const bucketCounts = useMemo(() =>
    bucketOptions.map((bucket) => ({ bucket, count: opportunities.filter((o) => o.role_bucket === bucket).length })),
    [bucketOptions, opportunities]);
  const maxBucketCount = Math.max(1, ...bucketCounts.map((b) => b.count));

  const funnelCounts = ACTIVE_PIPELINE_STATUSES.map((s) => statusCount(opportunities, s));
  const maxFunnelCount = Math.max(1, ...funnelCounts);
  const total = opportunities.length;
  const funnelStages = ACTIVE_PIPELINE_STATUSES.map((status) => {
    const count = statusCount(opportunities, status);
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
    const width = total === 0 ? 100 : count === 0 ? 26 : Math.max(34, Math.round((count / maxFunnelCount) * 100));
    return { status, label: STATUS_LABELS[status], count, percent, width };
  });

  const filteredOpportunities = useMemo(() => opportunities.filter((o) => {
    if (!showClosed && CLOSED_STATUSES.includes(o.status)) return false;
    if (!matchesSearch(o, searchTerm)) return false;
    if (bucketFilter !== "all" && o.role_bucket !== bucketFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
    return true;
  }), [opportunities, showClosed, searchTerm, bucketFilter, statusFilter, priorityFilter]);

  function clearFilters() {
    setBucketFilter("all"); setStatusFilter("all"); setPriorityFilter("all");
    setShowClosed(false); setSearchTerm("");
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <h1>Full Pipeline</h1>
          <Link className="button secondary" href="/">← Dashboard</Link>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="card stack funnel-card">
        <h2>Status funnel</h2>
        <p className="muted">Click a stage to filter the list below.</p>
        <div className="visual-funnel" aria-label="Opportunity status funnel">
          {funnelStages.map((stage) => (
            <div
              className="funnel-band"
              key={stage.status}
              style={{ width: `${stage.width}%`, cursor: "pointer" }}
              onClick={() => setStatusFilter(statusFilter === stage.status ? "all" : stage.status)}
            >
              <span className="funnel-label">{stage.label}</span>
              <strong className="funnel-value">{stage.count} · {formatPercent(stage.count, total)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Resume template map</h2>
        <p className="muted">Volume by saved resume version.</p>
        {bucketCounts.map(({ bucket, count }) => <Bar key={bucket} label={bucket} value={count} max={maxBucketCount} />)}
      </section>

      <section className="card stack opportunities-panel">
        <h2>All Opportunities</h2>
        <div className="opportunities-search-box">
          <label className="search-row">Search
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search company, role, source, notes…" />
          </label>
          <div className="filter-grid">
            <label>Resume template
              <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value)}>
                <option value="all">All templates</option>
                {bucketOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label>Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OpportunityStatus | "all")}>
                <option value="all">All statuses</option>
                {OPPORTUNITY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as OpportunityPriority | "all")}>
                <option value="all">All priorities</option>
                {OPPORTUNITY_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
              Include closed / rejected
            </label>
            <button className="secondary" type="button" onClick={clearFilters}>Clear filters</button>
          </div>
          <p className="muted">Showing {filteredOpportunities.length} of {opportunities.length} opportunities.</p>
        </div>

        <div className="opportunities-scroll">
          {filteredOpportunities.length === 0 ? (
            <p className="muted">No opportunities match these filters.</p>
          ) : filteredOpportunities.map((o) => {
            const reasons = getAttentionReasons(o, today);
            return (
              <article className="card opportunity-card" key={o.id}>
                <div className="row card-title-row">
                  <Link className="card-title-link" href={`/opportunities/${o.id}`}>{o.role}</Link>
                  <span className="badge">{STATUS_LABELS[o.status]}</span>
                  {o.priority === "high" ? <span className="badge warning">High</span> : null}
                  {o.is_pinned ? <span className="badge accent">Pinned</span> : null}
                  {reasons.length ? <span className="badge warning">Needs attention</span> : null}
                </div>
                <Link className="card-click-area" href={`/opportunities/${o.id}`}>
                  <p>{o.company}{o.location ? ` · ${o.location}` : ""}{o.source ? ` · via ${o.source}` : ""}</p>
                  <p className="date-line">Posted: {formatDate(o.listing_posted_date)} · Saved: {formatDate(o.created_at)} ({formatAgeFrom(o.created_at)})</p>
                  <p className="muted">Next: {o.next_action_date ?? "No next action date"}</p>
                  {reasons.length ? <p className="attention-note">⚠ {reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1} more` : ""}</p> : null}
                </Link>
                <div className="card-control-grid">
                  <label>Status
                    <select value={o.status} onChange={(e) => void patchOpportunity(o.id, { status: e.target.value as OpportunityStatus })}>
                      {OPPORTUNITY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </label>
                  <label>Priority
                    <select value={o.priority} onChange={(e) => void patchOpportunity(o.id, { priority: e.target.value as OpportunityPriority })}>
                      {OPPORTUNITY_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </label>
                  <label>Next action
                    <input type="date" value={o.next_action_date ?? ""} onChange={(e) => void patchOpportunity(o.id, { next_action_date: e.target.value || null })} />
                  </label>
                  <button className="secondary" type="button" onClick={() => void patchOpportunity(o.id, { is_pinned: !o.is_pinned })}>
                    {o.is_pinned ? "Unpin" : "Pin"}
                  </button>
                  <Link href={`/opportunities/${o.id}`}>Open detail</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
