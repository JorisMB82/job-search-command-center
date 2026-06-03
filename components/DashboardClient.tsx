"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Opportunity, OpportunityInsert, OpportunityStatus } from "../lib/database.types";

const emptyDraft: OpportunityInsert = {
  company: "",
  role: "",
  location: "",
  url: "",
  status: "new",
  job_description: "",
  notes: "",
};

export function DashboardClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [draft, setDraft] = useState<OpportunityInsert>(emptyDraft);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
        setMessage(payload.error ?? "Could not extract that URL. Paste the job description manually.");
        return;
      }
      setDraft((current) => ({ ...current, ...payload.data, url: sourceUrl }));
      setMessage("Extraction complete. Review and edit fields before saving.");
    } catch {
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

  return (
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
          <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} required /></label>
          <label>Location<input value={draft.location ?? ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
          <label>URL<input value={draft.url ?? ""} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
          <label>Status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OpportunityStatus })}>
              {(["new", "researching", "applied", "interviewing", "offer", "closed"] as OpportunityStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>Job description<textarea value={draft.job_description} onChange={(event) => setDraft({ ...draft, job_description: event.target.value })} required /></label>
          <label>Notes<textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <button type="submit">Save opportunity</button>
        </form>
        {message ? <p className={message.includes("not") || message.includes("Could") || message.includes("error") ? "error" : "muted"}>{message}</p> : null}
      </section>

      <section className="card stack">
        <h2>Opportunities</h2>
        {opportunities.length === 0 ? <p className="muted">No opportunities yet.</p> : opportunities.map((opportunity) => (
          <article className="card" key={opportunity.id}>
            <div className="row"><strong>{opportunity.role}</strong><span className="badge">{opportunity.status}</span></div>
            <p>{opportunity.company}{opportunity.location ? ` · ${opportunity.location}` : ""}</p>
            <Link href={`/opportunities/${opportunity.id}`}>Open detail</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
