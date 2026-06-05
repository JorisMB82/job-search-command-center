"use client";

import { useEffect, useState } from "react";
import type { RadarMessage, StrategicAngle, TargetCompany } from "../lib/radar-types";

type PromptType = "company_research" | "unposted_role" | "proposal_outreach" | "contact_strategy" | "strategic_angle";
type ApiPayload<T> = { data?: T; error?: string };

type PromptSlot = {
  key: PromptType;
  label: string;
  help: string;
};

const promptSlots: PromptSlot[] = [
  { key: "company_research", label: "Company research", help: "Understand whether the company is worth your time." },
  { key: "unposted_role", label: "Unposted role", help: "Explore whether there is a credible role thesis before a job is posted." },
  { key: "proposal_outreach", label: "Proposal outreach", help: "Frame a possible consulting, advisory, or fractional engagement." },
  { key: "contact_strategy", label: "Contact strategy", help: "Decide who to look for manually and how to approach them." },
  { key: "strategic_angle", label: "Strategic angle", help: "Turn the public signal into a concise point of view." },
];

export function RadarTargetDetailClient({ id }: { id: string }) {
  const [target, setTarget] = useState<TargetCompany | null>(null);
  const [angles, setAngles] = useState<StrategicAngle[]>([]);
  const [messages, setMessages] = useState<RadarMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [researchNotes, setResearchNotes] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [targetRes, angleRes, messageRes] = await Promise.all([
      fetch(`/api/radar/targets/${id}`),
      fetch("/api/radar/angles"),
      fetch(`/api/radar/messages?target_company_id=${id}`),
    ]);
    const targetPayload = await targetRes.json() as ApiPayload<TargetCompany>;
    const anglePayload = await angleRes.json() as ApiPayload<StrategicAngle[]>;
    const messagePayload = await messageRes.json() as ApiPayload<RadarMessage[]>;
    if (targetPayload.error || anglePayload.error || messagePayload.error) setMessage(targetPayload.error || anglePayload.error || messagePayload.error || "Radar target load failed.");
    setTarget(targetPayload.data ?? null);
    setAngles(anglePayload.data ?? []);
    setMessages(messagePayload.data ?? []);
    setResearchNotes(targetPayload.data?.notes ?? "");
  }

  useEffect(() => { void load(); }, [id]);

  async function save(update: Partial<TargetCompany>, successMessage = "Target updated.") {
    const response = await fetch("/api/radar/targets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...update }) });
    const payload = await response.json() as ApiPayload<TargetCompany>;
    if (payload.error || !payload.data) {
      setMessage(payload.error || "Target update failed.");
      return false;
    }
    setTarget(payload.data);
    setMessage(successMessage);
    return true;
  }

  async function build(type: PromptType) {
    if (!target) return;
    const angle = angles.find((item) => item.id === target.best_angle_id) ?? null;
    const response = await fetch("/api/radar/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, target, angle }) });
    const payload = await response.json() as ApiPayload<{ prompt: string }>;
    if (payload.error || !payload.data) {
      setMessage(payload.error || "Prompt generation failed.");
      return;
    }
    setPrompt(payload.data.prompt);
    setMessage(`${promptSlots.find((slot) => slot.key === type)?.label ?? "Prompt"} copied. Paste it into ChatGPT Plus manually, then paste useful output into Research Notes.`);
    await navigator.clipboard?.writeText(payload.data.prompt).catch(() => undefined);
  }

  async function saveResearchNotes() {
    const saved = await save({ notes: researchNotes }, "Research notes saved.");
    if (!saved) return;
    const response = await fetch("/api/radar/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id, message_type: "research_notes", prompt_text: prompt || null, output_text: researchNotes, status: "used" }) });
    const payload = await response.json() as ApiPayload<RadarMessage>;
    if (!payload.error && payload.data) setMessages((current) => [payload.data as RadarMessage, ...current]);
  }

  async function convert() {
    const response = await fetch("/api/radar/convert-to-opportunity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id }) });
    const payload = await response.json() as ApiPayload<unknown>;
    if (payload.error) setMessage(payload.error); else { setMessage("Converted to opportunity. Check the main dashboard."); await load(); }
  }

  if (!target) return <section className="card"><p>{message || "Loading target..."}</p></section>;

  return <div className="stack">
    <section className="card stack"><div className="row"><h1>{target.company}</h1><span className="badge">{target.target_status}</span><span className="badge accent">{target.outreach_status}</span></div><p className="muted">Simple workflow: copy one prompt, use ChatGPT manually, paste useful output into Research Notes, write a short Decision Brief, then convert only if this target is worth pursuing.</p>{message ? <p className="muted">{message}</p> : null}</section>

    <section className="card stack"><h2>1. Original signal / context</h2><p className="muted">Use this as the reason this target was saved.</p><div className="mini-card stack"><p><strong>Why saved:</strong> {target.why_interesting || "No signal summary saved yet."}</p>{target.pain_hypothesis ? <p><strong>Initial summary:</strong> {target.pain_hypothesis}</p> : null}{target.proposal_angle ? <p><strong>Initial angle:</strong> {target.proposal_angle}</p> : null}{target.notes?.startsWith("http") ? <a href={target.notes} target="_blank" rel="noreferrer">Open original source</a> : null}</div></section>

    <section className="card stack"><h2>2. Copy ChatGPT prompt</h2><p className="muted">These buttons only generate and copy prompts. They do not call an AI API and do not save anything by themselves.</p><div className="row">{promptSlots.map((slot) => <button key={slot.key} className="secondary" onClick={() => void build(slot.key)}>{slot.label}</button>)}</div>{prompt ? <div className="stack"><div className="row"><strong>Last generated prompt</strong><button className="secondary" onClick={() => navigator.clipboard.writeText(prompt)}>Copy again</button></div><pre>{prompt}</pre></div> : null}</section>

    <section className="card stack"><h2>3. Research Notes</h2><p className="muted">Paste ChatGPT output, web research, call notes, or your own thinking here. This is the single place for raw research on this target.</p><label>Research notes<textarea value={researchNotes} onChange={(e) => setResearchNotes(e.target.value)} placeholder="Paste ChatGPT output or your own research notes here..." /></label><button onClick={() => void saveResearchNotes()}>Save research notes</button></section>

    <section className="card stack"><h2>4. Decision Brief</h2><p className="muted">Keep this short. These are the distilled notes that decide whether to pursue the company.</p><div className="filter-grid"><label>Website<input value={target.website ?? ""} onChange={(e) => setTarget({ ...target, website: e.target.value })} onBlur={(e) => void save({ website: e.target.value })} /></label><label>Sector<input value={target.sector ?? ""} onChange={(e) => setTarget({ ...target, sector: e.target.value })} onBlur={(e) => void save({ sector: e.target.value })} /></label><label>Status<input value={target.target_status} onChange={(e) => setTarget({ ...target, target_status: e.target.value })} onBlur={(e) => void save({ target_status: e.target.value })} /></label><label>Next action date<input type="date" value={target.next_action_date ?? ""} onChange={(e) => setTarget({ ...target, next_action_date: e.target.value })} onBlur={(e) => void save({ next_action_date: e.target.value || null })} /></label></div><label>Why this company matters<textarea value={target.why_interesting ?? ""} onChange={(e) => setTarget({ ...target, why_interesting: e.target.value })} onBlur={(e) => void save({ why_interesting: e.target.value })} /></label><label>My possible angle<textarea value={target.proposal_angle ?? ""} onChange={(e) => setTarget({ ...target, proposal_angle: e.target.value })} onBlur={(e) => void save({ proposal_angle: e.target.value })} /></label><label>Best next action<textarea value={target.unposted_role_thesis ?? ""} onChange={(e) => setTarget({ ...target, unposted_role_thesis: e.target.value })} onBlur={(e) => void save({ unposted_role_thesis: e.target.value })} /></label><label>Contact / intro notes<textarea value={target.contact_strategy ?? ""} onChange={(e) => setTarget({ ...target, contact_strategy: e.target.value })} onBlur={(e) => void save({ contact_strategy: e.target.value })} /></label></section>

    <section className="card stack"><h2>5. Convert when ready</h2><p className="muted">Click this only when the target becomes concrete enough to track in the main job pipeline: a real job, a credible unposted-role thesis, an active outreach conversation, or a consulting/proposal lead.</p><div className="row"><button onClick={() => void convert()}>Convert to opportunity</button></div></section>

    <section className="card stack"><h2>Saved research history</h2>{messages.length === 0 ? <p className="muted">No saved research history yet.</p> : messages.map((item) => <article className="mini-card stack" key={item.id}><div className="row"><strong>{item.message_type}</strong><span className="badge">{item.status}</span></div>{item.output_text ? <p>{item.output_text}</p> : null}</article>)}</section>
  </div>;
}
