"use client";

import { FormEvent, useEffect, useState } from "react";
import { buildOpportunityAnalysisPrompt } from "../lib/prompts";
import type { Opportunity, OutreachDraftInsert } from "../lib/database.types";

export function OpportunityDetailClient({ id }: { id: string }) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [draft, setDraft] = useState<OutreachDraftInsert>({ opportunity_id: id, recipient: "", channel: "email", subject: "", body: "" });
  const [promptCopied, setPromptCopied] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/opportunities/${id}`);
      const payload = (await response.json()) as { data?: Opportunity; error?: string };
      if (!response.ok || payload.error) setMessage(payload.error ?? "Could not load opportunity.");
      else setOpportunity(payload.data ?? null);
    }
    void load();
  }, [id]);

  const prompt = opportunity ? buildOpportunityAnalysisPrompt(opportunity) : "";

  async function copyPrompt() {
    if (!prompt || typeof navigator === "undefined") return;
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
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
        <div className="row"><h1>{opportunity.role}</h1><span className="badge">{opportunity.status}</span></div>
        <p><strong>{opportunity.company}</strong>{opportunity.location ? ` · ${opportunity.location}` : ""}</p>
        {opportunity.url ? <p><a href={opportunity.url} target="_blank" rel="noreferrer">Open source posting</a></p> : null}
        <h2>Job description</h2>
        <p>{opportunity.job_description}</p>
        {opportunity.notes ? <><h2>Notes</h2><p>{opportunity.notes}</p></> : null}
      </section>

      <section className="card stack">
        <div className="row"><h2>ChatGPT analysis prompt</h2><button className="secondary" type="button" onClick={copyPrompt}>Copy prompt</button></div>
        {promptCopied ? <p className="muted">Copied. Paste this into ChatGPT Plus manually.</p> : null}
        <pre>{prompt}</pre>
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
        {message ? <p className="muted">{message}</p> : null}
      </section>
    </>
  );
}
