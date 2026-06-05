"use client";

import { useEffect, useState } from "react";
import type { RadarMessage, StrategicAngle, TargetCompany } from "../lib/radar-types";

type PromptType = "company_research" | "unposted_role" | "proposal_outreach" | "contact_strategy" | "strategic_angle";
type ApiPayload<T> = { data?: T; error?: string };

type PromptSlot = {
  key: PromptType;
  label: string;
  help: string;
  targetField: keyof TargetCompany;
  targetFieldLabel: string;
};

const promptSlots: PromptSlot[] = [
  { key: "company_research", label: "Company research", help: "Start here. Decide whether the company is worth pursuing and what the signal may imply.", targetField: "why_interesting", targetFieldLabel: "Why interesting" },
  { key: "unposted_role", label: "Unposted role", help: "Use this if the company looks like a possible role-creation or founder's-office target.", targetField: "unposted_role_thesis", targetFieldLabel: "Unposted role thesis" },
  { key: "proposal_outreach", label: "Proposal outreach", help: "Use this if the company may be better approached as a consulting, advisory, or fractional engagement.", targetField: "proposal_angle", targetFieldLabel: "Proposal angle" },
  { key: "contact_strategy", label: "Contact strategy", help: "Use this to decide who to look for manually and how to approach them.", targetField: "contact_strategy", targetFieldLabel: "Contact strategy" },
  { key: "strategic_angle", label: "Strategic angle", help: "Use this to turn the signal into a concise point of view.", targetField: "pain_hypothesis", targetFieldLabel: "Pain hypothesis" },
];

function emptyPromptMap(): Record<PromptType, string> {
  return { company_research: "", unposted_role: "", proposal_outreach: "", contact_strategy: "", strategic_angle: "" };
}

export function RadarTargetDetailClient({ id }: { id: string }) {
  const [target, setTarget] = useState<TargetCompany | null>(null);
  const [angles, setAngles] = useState<StrategicAngle[]>([]);
  const [messages, setMessages] = useState<RadarMessage[]>([]);
  const [prompts, setPrompts] = useState<Record<PromptType, string>>(emptyPromptMap());
  const [outputs, setOutputs] = useState<Record<PromptType, string>>(emptyPromptMap());
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
    setPrompts((current) => ({ ...current, [type]: payload.data?.prompt ?? "" }));
    setMessage(`${promptSlots.find((slot) => slot.key === type)?.label ?? "Prompt"} copied. Paste it into ChatGPT Plus manually.`);
    await navigator.clipboard?.writeText(payload.data.prompt).catch(() => undefined);
  }

  async function saveRawOutput(type: PromptType) {
    const promptText = prompts[type];
    const outputText = outputs[type];
    const response = await fetch("/api/radar/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id, message_type: type, prompt_text: promptText, output_text: outputText, status: "used" }) });
    const payload = await response.json() as ApiPayload<RadarMessage>;
    if (payload.error || !payload.data) {
      setMessage(payload.error || "Output save failed.");
      return false;
    }
    setMessages((current) => [payload.data as RadarMessage, ...current]);
    setMessage("Raw ChatGPT output saved below. The text is kept here so you can still copy it into the working fields.");
    return true;
  }

  async function saveAndCopyToField(slot: PromptSlot) {
    const outputText = outputs[slot.key];
    if (!outputText.trim()) return;
    const rawSaved = await saveRawOutput(slot.key);
    if (!rawSaved) return;
    await save({ [slot.targetField]: outputText } as Partial<TargetCompany>, `Saved raw output and copied it to ${slot.targetFieldLabel}.`);
  }

  async function convert() {
    const response = await fetch("/api/radar/convert-to-opportunity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_company_id: id }) });
    const payload = await response.json() as ApiPayload<unknown>;
    if (payload.error) setMessage(payload.error); else { setMessage("Converted to opportunity. Check the main dashboard."); await load(); }
  }

  if (!target) return <section className="card"><p>{message || "Loading target..."}</p></section>;

  return <div className="stack">
    <section className="card stack"><div className="row"><h1>{target.company}</h1><span className="badge">{target.target_status}</span><span className="badge accent">{target.outreach_status}</span></div><p className="muted">Suggested workflow: generate a prompt, paste it into ChatGPT Plus, paste the useful output below, then either save it as raw backup or copy it into the working field. Convert only if this becomes a real opportunity or active outreach target.</p>{message ? <p className="muted">{message}</p> : null}</section>
    <section className="card stack"><h2>1. Prompt actions and paste-back</h2><p className="muted">Start here. “Save raw output” archives the full ChatGPT answer below. “Save + copy to field” also places the same text into the relevant working field in Step 2. Your pasted text will not disappear after saving.</p>{promptSlots.map((slot) => <article className="mini-card stack" key={slot.key}><div className="row"><strong>{slot.label}</strong><button className="secondary" onClick={() => void build(slot.key)}>Generate / copy prompt</button>{prompts[slot.key] ? <button className="secondary" onClick={() => navigator.clipboard.writeText(prompts[slot.key])}>Copy again</button> : null}</div><p className="muted">{slot.help}</p>{prompts[slot.key] ? <pre>{prompts[slot.key]}</pre> : null}<label>Paste ChatGPT output for {slot.label}<textarea value={outputs[slot.key]} onChange={(e) => setOutputs((current) => ({ ...current, [slot.key]: e.target.value }))} /></label><div className="row"><button className="secondary" onClick={() => void saveRawOutput(slot.key)} disabled={!outputs[slot.key].trim()}>Save raw output only</button><button onClick={() => void saveAndCopyToField(slot)} disabled={!outputs[slot.key].trim()}>Save + copy to {slot.targetFieldLabel}</button></div></article>)}</section>
    <section className="card stack"><h2>2. Working analysis fields</h2><p className="muted">These are the distilled notes you will actually use to decide whether to pursue the target. You can edit them directly, or populate them from Step 1 using “Save + copy to field.” Fields auto-save when you click out of them.</p><div className="filter-grid"><label>Website<input value={target.website ?? ""} onChange={(e) => setTarget({ ...target, website: e.target.value })} onBlur={(e) => void save({ website: e.target.value })} /></label><label>Sector<input value={target.sector ?? ""} onChange={(e) => setTarget({ ...target, sector: e.target.value })} onBlur={(e) => void save({ sector: e.target.value })} /></label><label>Status<input value={target.target_status} onChange={(e) => setTarget({ ...target, target_status: e.target.value })} onBlur={(e) => void save({ target_status: e.target.value })} /></label><label>Outreach status<input value={target.outreach_status} onChange={(e) => setTarget({ ...target, outreach_status: e.target.value })} onBlur={(e) => void save({ outreach_status: e.target.value })} /></label><label>Next action<input type="date" value={target.next_action_date ?? ""} onChange={(e) => setTarget({ ...target, next_action_date: e.target.value })} onBlur={(e) => void save({ next_action_date: e.target.value || null })} /></label><label>Contact URL<input value={target.contact_url ?? ""} onChange={(e) => setTarget({ ...target, contact_url: e.target.value })} onBlur={(e) => void save({ contact_url: e.target.value })} /></label></div><label>Why interesting<textarea value={target.why_interesting ?? ""} onChange={(e) => setTarget({ ...target, why_interesting: e.target.value })} onBlur={(e) => void save({ why_interesting: e.target.value })} /></label><label>Pain hypothesis<textarea value={target.pain_hypothesis ?? ""} onChange={(e) => setTarget({ ...target, pain_hypothesis: e.target.value })} onBlur={(e) => void save({ pain_hypothesis: e.target.value })} /></label><label>Unposted role thesis<textarea value={target.unposted_role_thesis ?? ""} onChange={(e) => setTarget({ ...target, unposted_role_thesis: e.target.value })} onBlur={(e) => void save({ unposted_role_thesis: e.target.value })} /></label><label>Proposal angle<textarea value={target.proposal_angle ?? ""} onChange={(e) => setTarget({ ...target, proposal_angle: e.target.value })} onBlur={(e) => void save({ proposal_angle: e.target.value })} /></label><label>Contact strategy<textarea value={target.contact_strategy ?? ""} onChange={(e) => setTarget({ ...target, contact_strategy: e.target.value })} onBlur={(e) => void save({ contact_strategy: e.target.value })} /></label></section>
    <section className="card stack"><h2>3. Convert when ready</h2><p className="muted">Click this only when the target becomes concrete enough to track in the main job pipeline: a real job, a credible unposted-role thesis, an active outreach conversation, or a consulting/proposal lead. It creates a normal dashboard opportunity with source “Opportunity Radar,” status “Researching,” and role “Unposted / exploratory...”</p><div className="row"><button onClick={() => void convert()}>Convert to opportunity</button></div></section>
    <section className="card stack"><h2>Saved raw outputs</h2>{messages.length === 0 ? <p className="muted">No saved raw outputs yet.</p> : messages.map((item) => <article className="mini-card stack" key={item.id}><div className="row"><strong>{item.message_type}</strong><span className="badge">{item.status}</span></div>{item.output_text ? <p>{item.output_text}</p> : null}</article>)}</section>
  </div>;
}
