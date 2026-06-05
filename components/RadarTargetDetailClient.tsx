"use client";

import { useEffect, useState } from "react";
import type { RadarMessage, StrategicAngle, TargetCompany } from "../lib/radar-types";

type PromptType = "company_research" | "unposted_role" | "proposal_outreach" | "contact_strategy" | "strategic_angle";

export function RadarTargetDetailClient({ id }: { id: string }) {
  const [target, setTarget] = useState<TargetCompany | null>(null);
  const [angles, setAngles] = useState<StrategicAngle[]>([]);
  const [messages, setMessages] = useState<RadarMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [messageType, setMessageType] = useState<PromptType>("company_research");
  const [message, setMessage] = useState("");

  async function load() {
    const [targetRes, angleRes, messageRes] = await Promise.all([
      fetch(`/api/radar/targets/${id}`),
      fetch("/api/radar/angles"),
      fetch(`/api/radar/messages?target_company_id=${id}`),
    ]);
    const targetPayload = await targetRes.json();
    const anglePayload = await angleRes.json();
    const messagePayload = await messageRes.json();
    if (targetPayload.error || anglePayload.error || messagePayload.error) setMessage(targetPayload.error || anglePayload.error || messagePayload.error);
    setTarget(targetPayload.data ?? null);
    setAngles(anglePayload.data ?? []);
    setMessages(messagePayload.data ?? []);
  }

  useEffect(() => { void load(); }, [id]);

  async function save(update: Partial<TargetCompany>) {
    const response = await fetch("/api/radar/targets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...update }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setTarget(payload.data); setMessage("Target updated."); }
  }

  async function build(type: PromptType) {
    if (!target) return;
    const angle = angles.find((item) => item.id === target.best_angle_id) ?? null;
    const response = await fetch("/api/radar/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, target, angle }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setPrompt(payload.data.prompt); setMessageType(type); await navigator.clipboard?.writeText(payload.data.prompt).catch(() => undefined); }
  }

  async function saveOutput() {
    const response = await fetch("/api/radar/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id, message_type: messageType, prompt_text: prompt, output_text: output, status: "used" }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setMessages((current) => [payload.data, ...current]); setOutput(""); setMessage("Output saved."); }
  }

  async function convert() {
    const response = await fetch("/api/radar/convert-to-opportunity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setMessage("Converted to opportunity."); await load(); }
  }

  if (!target) return <section className="card"><p>{message || "Loading target..."}</p></section>;

  return <div className="stack">
    <section className="card stack"><div className="row"><h1>{target.company}</h1><span className="badge">{target.target_status}</span><span className="badge accent">{target.outreach_status}</span></div><p className="muted">Saved target from Opportunity Radar. Use this page to refine the thesis, copy prompts, and save paste-back outputs.</p>{message ? <p className="muted">{message}</p> : null}</section>
    <section className="card stack"><h2>Target fields</h2><div className="filter-grid"><label>Website<input value={target.website ?? ""} onChange={(e) => setTarget({ ...target, website: e.target.value })} onBlur={(e) => void save({ website: e.target.value })} /></label><label>Sector<input value={target.sector ?? ""} onChange={(e) => setTarget({ ...target, sector: e.target.value })} onBlur={(e) => void save({ sector: e.target.value })} /></label><label>Status<input value={target.target_status} onChange={(e) => setTarget({ ...target, target_status: e.target.value })} onBlur={(e) => void save({ target_status: e.target.value })} /></label><label>Outreach status<input value={target.outreach_status} onChange={(e) => setTarget({ ...target, outreach_status: e.target.value })} onBlur={(e) => void save({ outreach_status: e.target.value })} /></label><label>Next action<input type="date" value={target.next_action_date ?? ""} onChange={(e) => setTarget({ ...target, next_action_date: e.target.value })} onBlur={(e) => void save({ next_action_date: e.target.value || null })} /></label><label>Contact URL<input value={target.contact_url ?? ""} onChange={(e) => setTarget({ ...target, contact_url: e.target.value })} onBlur={(e) => void save({ contact_url: e.target.value })} /></label></div><label>Why interesting<textarea value={target.why_interesting ?? ""} onChange={(e) => setTarget({ ...target, why_interesting: e.target.value })} onBlur={(e) => void save({ why_interesting: e.target.value })} /></label><label>Pain hypothesis<textarea value={target.pain_hypothesis ?? ""} onChange={(e) => setTarget({ ...target, pain_hypothesis: e.target.value })} onBlur={(e) => void save({ pain_hypothesis: e.target.value })} /></label><label>Unposted role thesis<textarea value={target.unposted_role_thesis ?? ""} onChange={(e) => setTarget({ ...target, unposted_role_thesis: e.target.value })} onBlur={(e) => void save({ unposted_role_thesis: e.target.value })} /></label><label>Proposal angle<textarea value={target.proposal_angle ?? ""} onChange={(e) => setTarget({ ...target, proposal_angle: e.target.value })} onBlur={(e) => void save({ proposal_angle: e.target.value })} /></label><label>Contact strategy<textarea value={target.contact_strategy ?? ""} onChange={(e) => setTarget({ ...target, contact_strategy: e.target.value })} onBlur={(e) => void save({ contact_strategy: e.target.value })} /></label><div className="row"><button onClick={() => void convert()}>Convert to opportunity</button></div></section>
    <section className="card stack"><h2>Prompt actions</h2><div className="row"><button className="secondary" onClick={() => void build("company_research")}>Company research</button><button className="secondary" onClick={() => void build("unposted_role")}>Unposted role</button><button className="secondary" onClick={() => void build("proposal_outreach")}>Proposal outreach</button><button className="secondary" onClick={() => void build("contact_strategy")}>Contact strategy</button><button className="secondary" onClick={() => void build("strategic_angle")}>Strategic angle</button></div>{prompt ? <><pre>{prompt}</pre><label>Paste ChatGPT output<textarea value={output} onChange={(e) => setOutput(e.target.value)} /></label><button onClick={() => void saveOutput()} disabled={!output.trim()}>Save output</button></> : null}</section>
    <section className="card stack"><h2>Saved outputs</h2>{messages.length === 0 ? <p className="muted">No saved outputs yet.</p> : messages.map((item) => <article className="mini-card stack" key={item.id}><div className="row"><strong>{item.message_type}</strong><span className="badge">{item.status}</span></div>{item.output_text ? <p>{item.output_text}</p> : null}</article>)}</section>
  </div>;
}
