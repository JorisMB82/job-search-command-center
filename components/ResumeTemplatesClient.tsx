"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ResumeTemplate, ResumeTemplateInsert } from "../lib/database.types";

export function ResumeTemplatesClient() {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [draft, setDraft] = useState<ResumeTemplateInsert>({ name: "", content: "", notes: "" });
  const [message, setMessage] = useState("");

  async function loadTemplates() {
    const response = await fetch("/api/resume-templates");
    const payload = (await response.json()) as { data?: ResumeTemplate[]; error?: string };
    if (!response.ok || payload.error) setMessage(payload.error ?? "Could not load resume templates.");
    else setTemplates(payload.data ?? []);
  }

  useEffect(() => { void loadTemplates(); }, []);

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/resume-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) setMessage(payload.error ?? "Could not save resume template.");
    else {
      setMessage("Resume template saved.");
      setDraft({ name: "", content: "", notes: "" });
      await loadTemplates();
    }
  }

  return (
    <div className="grid">
      <section className="card stack">
        <h2>New template</h2>
        <form className="stack" onSubmit={saveTemplate}>
          <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
          <label>Content<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} required /></label>
          <label>Notes<textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <button type="submit">Save template</button>
        </form>
        {message ? <p className="muted">{message}</p> : null}
      </section>
      <section className="card stack">
        <h2>Saved templates</h2>
        {templates.length === 0 ? <p className="muted">No templates yet.</p> : templates.map((template) => (
          <article className="card stack" key={template.id}>
            <strong>{template.name}</strong>
            <p>{template.notes}</p>
            <pre>{template.content}</pre>
          </article>
        ))}
      </section>
    </div>
  );
}
