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

  async function updateTemplate(template: ResumeTemplate) {
    const response = await fetch("/api/resume-templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, name: template.name, content: template.content, notes: template.notes }),
    });
    const payload = (await response.json()) as { data?: ResumeTemplate; error?: string };
    if (!response.ok || payload.error || !payload.data) setMessage(payload.error ?? "Could not update resume template.");
    else {
      setMessage("Resume template updated.");
      setTemplates((current) => current.map((item) => item.id === payload.data?.id ? payload.data : item));
    }
  }

  function editTemplate(id: string, update: Partial<ResumeTemplate>) {
    setTemplates((current) => current.map((template) => template.id === id ? { ...template, ...update } : template));
  }

  return (
    <div className="grid">
      <section className="card stack">
        <h2>New template</h2>
        <p className="muted">Create an additional resume version if needed. For the five default buckets, edit the saved templates on the right.</p>
        <form className="stack" onSubmit={saveTemplate}>
          <label>Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
          <label>Resume text<textarea className="resume-content" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} required placeholder="Paste the full text of this resume version here." /></label>
          <label>Notes<textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="When to use this resume version." /></label>
          <button type="submit">Save template</button>
        </form>
        {message ? <p className="muted">{message}</p> : null}
      </section>
      <section className="card stack">
        <h2>Saved templates</h2>
        <p className="muted">Paste the full text of each resume version into its matching bucket. The opportunity page will use the bucket to generate a resume-tailoring prompt.</p>
        {templates.length === 0 ? <p className="muted">No templates yet.</p> : templates.map((template) => (
          <article className="card stack" key={template.id}>
            <label>Name<input value={template.name} onChange={(event) => editTemplate(template.id, { name: event.target.value })} /></label>
            <label>Notes<textarea value={template.notes ?? ""} onChange={(event) => editTemplate(template.id, { notes: event.target.value })} placeholder="When to use this resume version." /></label>
            <label>Resume text<textarea className="resume-content" value={template.content} onChange={(event) => editTemplate(template.id, { content: event.target.value })} placeholder="Paste full resume text here." /></label>
            <button className="secondary" type="button" onClick={() => void updateTemplate(template)}>Save changes</button>
          </article>
        ))}
      </section>
    </div>
  );
}
