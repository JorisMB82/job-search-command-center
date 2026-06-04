"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Opportunity, OpportunityInsert, OpportunityPriority, OpportunityStatus, RoleBucket } from "../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, PRIORITY_LABELS, ROLE_BUCKETS, STATUS_LABELS } from "../lib/database.types";

const emptyDraft: OpportunityInsert = {
  company: "",
  role: "",
  location: "",
  url: "",
  status: "new",
  job_description: "",
  notes: "",
  role_bucket: "General Strategy & Operations",
  priority: "medium",
  is_pinned: false,
  next_action_date: null,
  network_notes: "",
  source: "",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function inferRoleBucket(role: string, description: string): RoleBucket {
  const text = `${role} ${description}`.toLowerCase();
  if (text.includes("chief of staff") || text.includes("founder's office") || text.includes("founder office") || text.includes("ceo office")) return "Chief of Staff";
  if (text.includes("token") || text.includes("digital asset") || text.includes("rwa") || text.includes("blockchain") || text.includes("crypto") || text.includes("payments") || text.includes("fintech")) return "Digital Assets / RWA";
  if (text.includes("venture") || text.includes("startup") || text.includes("incubator") || text.includes("accelerator") || text.includes("operator")) return "Venture Builder / Startup Operator";
  if (text.includes("partnership") || text.includes("corporate development") || text.includes("corp dev") || text.includes("business development") || text.includes("strategic alliance")) return "Partnerships / Corporate Development";
  return "General Strategy & Operations";
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
  return opportunities.filter((opportunity) => opportunity.status === status).length;
}

export function DashboardClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [draft, setDraft] = useState<OpportunityInsert>(emptyDraft);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [bucketFilter, setBucketFilter] = useState<RoleBucket | "all">("all");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority | "all">("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);

  async function loadOpportunities() {
    const response = await fetch("/api/opportunities");
    const payload = (await response.json()) as { data?: Opportunity[]; error?: string };
    if (!response.ok || payload.error) setMessage(payload.error ?? "Could not load opportunities.");
    else setOpportunities(payload.data ?? []);
  }

  useEffect(() => {
    void loadOpportunities();
  }, []);

  async function extractFromUrl() {
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const payload = (await response.json()) as { error?: string; data?: Partial<OpportunityInsert> };
      if (!response.ok || payload.error) {
        setDraft((current) => ({ ...current, url: sourceUrl }));
        setMessage(payload.error ?? "Could not extract that URL. Paste the job description manually.");
        return;
      }
      const next = { ...draft, ...payload.data, url: sourceUrl };
      next.role_bucket = inferRoleBucket(next.role, next.job_description);
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
    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, status: draft.status || "new" }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      setMessage(payload.error ?? "Could not save opportunity.");
      return;
    }
    setDraft(emptyDraft);
    setSourceUrl("");
    setMessage("Opportunity saved.");
    await loadOpportunities();
  }

  async function patchOpportunity(id: string, update: Partial<OpportunityInsert>) {
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
    setOpportunities((current) => current.map((opportunity) => opportunity.id === id ? payload.data as Opportunity : opportunity));
  }

  const metrics = useMemo(() => {
    const today = todayIso();
    return {
      total: opportunities.length,
      highPriority: opportunities.filter((opportunity) => opportunity.priority === "high").length,
      followUpsDue: opportunities.filter((opportunity) => opportunity.next_action_date && opportunity.next_action_date <= today && !["closed", "rejected", "offer"].includes(opportunity.status)).length,
      applicationsSent: opportunities.filter((opportunity) => ["applied", "outreach_drafted", "outreach_sent", "follow_up_due", "interviewing", "offer", "rejected", "closed"].includes(opportunity.status)).length,
      interviews: opportunities.filter((opportunity) => ["interviewing", "offer"].includes(opportunity.status)).length,
    };
  }, [opportunities]);

  const bucketCounts = ROLE_BUCKETS.map((bucket) => ({ bucket, count: opportunities.filter((opportunity) => opportunity.role_bucket === bucket).length }));
  const maxBucketCount = Math.max(1, ...bucketCounts.map((item) => item.count));
  const pinnedOpportunities = opportunities.filter((opportunity) => opportunity.is_pinned).slice(0, 5);
  const filteredOpportunities = opportunities.filter((opportunity) => {
    if (bucketFilter !== "all" && opportunity.role_bucket !== bucketFilter) return false;
    if (statusFilter !== "all" && opportunity.status !== statusFilter) return false;
    if (priorityFilter !== "all" && opportunity.priority !== priorityFilter) return false;
    if (pinnedOnly && !opportunity.is_pinned) return false;
    return true;
  });

  return (
    <div className="stack">
      <section className="metric-grid">
        <div className="metric-card"><span>Total opportunities</span><strong>{metrics.total}</strong></div>
        <div className="metric-card"><span>High priority</span><strong>{metrics.highPriority}</strong></div>
        <div className="metric-card"><span>Follow-ups due</span><strong>{metrics.followUpsDue}</strong></div>
        <div className="metric-card"><span>Applications sent</span><strong>{metrics.applicationsSent}</strong></div>
        <div className="metric-card"><span>Interviews</span><strong>{metrics.interviews}</strong></div>
      </section>

      <div className="grid dashboard-grid">
        <section className="card stack">
          <h2>Role bucket map</h2>
          <p className="muted">Shows market volume by target role family. Use traction later to decide where to focus.</p>
          {bucketCounts.map(({ bucket, count }) => <Bar key={bucket} label={bucket} value={count} max={maxBucketCount} />)}
        </section>

        <section className="card stack">
          <h2>Status funnel</h2>
          <div className="funnel">
            {OPPORTUNITY_STATUSES.map((status) => (
              <div className="funnel-step" key={status}>
                <span>{STATUS_LABELS[status]}</span>
                <strong>{statusCount(opportunities, status)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card stack">
          <h2>Pinned Top 5</h2>
          <p className="muted">Keep the roles that deserve extra effort, warm-intro search, and tighter follow-up here.</p>
          {pinnedOpportunities.length === 0 ? <p className="muted">No pinned opportunities yet.</p> : pinnedOpportunities.map((opportunity) => (
            <article className="mini-card" key={opportunity.id}>
              <div className="row"><strong>{opportunity.role}</strong><span className="badge">{PRIORITY_LABELS[opportunity.priority]}</span></div>
              <p>{opportunity.company} · {opportunity.role_bucket}</p>
              <p className="muted">Next: {opportunity.next_action_date ?? "No next action date"}</p>
              {opportunity.network_notes ? <p>{opportunity.network_notes}</p> : null}
              <Link href={`/opportunities/${opportunity.id}`}>Open detail</Link>
            </article>
          ))}
        </section>
      </div>

      <div className="grid">
        <section className="card stack">
          <h2>Create opportunity</h2>
          <label>
            Source URL (optional)
            <div className="row">
              <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://company.example/jobs/123" />
              <button type="button" disabled={!sourceUrl || loading} onClick={extractFromUrl}>Extract</button>
            </div>
          </label>
          <form className="stack" onSubmit={saveOpportunity}>
            <label>Company<input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} required /></label>
            <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value, role_bucket: inferRoleBucket(event.target.value, draft.job_description) })} required /></label>
            <label>Location<input value={draft.location ?? ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
            <label>URL<input value={draft.url ?? ""} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
            <label>Source<input value={draft.source ?? ""} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="Wellfound, LinkedIn, company site, recruiter, referral" /></label>
            <label>Role bucket
              <select value={draft.role_bucket} onChange={(event) => setDraft({ ...draft, role_bucket: event.target.value as RoleBucket })}>
                {ROLE_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as OpportunityPriority })}>
                {OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}
              </select>
            </label>
            <label>Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OpportunityStatus })}>
                {OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label>Next action date<input type="date" value={draft.next_action_date ?? ""} onChange={(event) => setDraft({ ...draft, next_action_date: event.target.value || null })} /></label>
            <label className="checkbox-row"><input type="checkbox" checked={draft.is_pinned} onChange={(event) => setDraft({ ...draft, is_pinned: event.target.checked })} /> Pin as top opportunity</label>
            <label>Job description<textarea value={draft.job_description} onChange={(event) => setDraft({ ...draft, job_description: event.target.value, role_bucket: inferRoleBucket(draft.role, event.target.value) })} required /></label>
            <label>Network notes<textarea value={draft.network_notes ?? ""} onChange={(event) => setDraft({ ...draft, network_notes: event.target.value })} placeholder="Warm intro path, LinkedIn search notes, alumni/contact ideas" /></label>
            <label>Notes<textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
            <button type="submit">Save opportunity</button>
          </form>
          {message ? <p className={message.includes("not") || message.includes("Could") || message.includes("error") ? "error" : "muted"}>{message}</p> : null}
        </section>

        <section className="card stack">
          <h2>Opportunities</h2>
          <div className="filter-grid">
            <label>Bucket<select value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value as RoleBucket | "all")}><option value="all">All buckets</option>{ROLE_BUCKETS.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}</select></label>
            <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OpportunityStatus | "all")}><option value="all">All statuses</option>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
            <label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as OpportunityPriority | "all")}><option value="all">All priorities</option>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select></label>
            <label className="checkbox-row"><input type="checkbox" checked={pinnedOnly} onChange={(event) => setPinnedOnly(event.target.checked)} /> Pinned only</label>
          </div>
          {filteredOpportunities.length === 0 ? <p className="muted">No opportunities match these filters.</p> : filteredOpportunities.map((opportunity) => (
            <article className="card" key={opportunity.id}>
              <div className="row"><strong>{opportunity.role}</strong><span className="badge">{STATUS_LABELS[opportunity.status]}</span>{opportunity.is_pinned ? <span className="badge accent">Pinned</span> : null}</div>
              <p>{opportunity.company}{opportunity.location ? ` · ${opportunity.location}` : ""}</p>
              <p className="muted">{opportunity.role_bucket} · {PRIORITY_LABELS[opportunity.priority]} priority{opportunity.source ? ` · ${opportunity.source}` : ""}</p>
              <div className="row">
                <select value={opportunity.status} onChange={(event) => void patchOpportunity(opportunity.id, { status: event.target.value as OpportunityStatus })}>{OPPORTUNITY_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
                <select value={opportunity.priority} onChange={(event) => void patchOpportunity(opportunity.id, { priority: event.target.value as OpportunityPriority })}>{OPPORTUNITY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>)}</select>
                <button className="secondary" type="button" onClick={() => void patchOpportunity(opportunity.id, { is_pinned: !opportunity.is_pinned })}>{opportunity.is_pinned ? "Unpin" : "Pin"}</button>
                <Link href={`/opportunities/${opportunity.id}`}>Open detail</Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
