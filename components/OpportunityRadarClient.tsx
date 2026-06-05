"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RadarSignal, RadarSource, StrategicAngle, TargetCompany } from "../lib/radar-types";

type Tab = "signals" | "targets" | "angles" | "sources";

const starterSources = [
  { name: "TechCrunch Startups RSS", url: "https://techcrunch.com/category/startups/feed/", source_type: "rss", category: "General Startup News", keywords: ["funding", "launch", "fintech", "market"] },
  { name: "CoinDesk RSS", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source_type: "rss", category: "Digital Assets / RWA", keywords: ["tokenization", "rwa", "stablecoin", "custody"] },
  { name: "Hacker News Optional Search", url: "fintech startup funding", source_type: "hackernews", category: "Venture / Startup", keywords: ["fintech", "startup", "funding"], is_active: false },
];

function emptyAngle(): Partial<StrategicAngle> {
  return { name: "", category: "", best_fit_company: "", trigger_signals: [], pain_hypothesis: "", credibility_points: "", short_pitch: "", longer_thesis: "", cta: "", relevant_resume_template: "", is_active: true, sort_order: 0 };
}

export function OpportunityRadarClient() {
  const [tab, setTab] = useState<Tab>("signals");
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [sources, setSources] = useState<RadarSource[]>([]);
  const [targets, setTargets] = useState<TargetCompany[]>([]);
  const [angles, setAngles] = useState<StrategicAngle[]>([]);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [newSource, setNewSource] = useState({ name: "", url: "", source_type: "rss", category: "", keywords: "" });
  const [newAngle, setNewAngle] = useState<Partial<StrategicAngle>>(emptyAngle());
  const [filter, setFilter] = useState("new");
  const [search, setSearch] = useState("");

  async function loadAll() {
    const [signalRes, sourceRes, targetRes, angleRes] = await Promise.all([fetch("/api/radar/signals"), fetch("/api/radar/sources"), fetch("/api/radar/targets"), fetch("/api/radar/angles")]);
    const signalPayload = await signalRes.json();
    const sourcePayload = await sourceRes.json();
    const targetPayload = await targetRes.json();
    const anglePayload = await angleRes.json();
    if (signalPayload.error || sourcePayload.error || targetPayload.error || anglePayload.error) setMessage(signalPayload.error || sourcePayload.error || targetPayload.error || anglePayload.error);
    setSignals(signalPayload.data ?? []);
    setSources(sourcePayload.data ?? []);
    setTargets(targetPayload.data ?? []);
    setAngles(anglePayload.data ?? []);
  }

  useEffect(() => { void loadAll(); }, []);

  const metrics = useMemo(() => ({
    newSignals: signals.filter((s) => s.status === "new").length,
    savedTargets: targets.length,
    highSignals: signals.filter((s) => s.relevance_score >= 7 && s.status !== "dismissed").length,
    outreachActive: targets.filter((t) => !["not_contacted", "archived", "converted"].includes(t.outreach_status)).length,
    converted: signals.filter((s) => s.status === "converted").length + targets.filter((t) => t.target_status === "converted").length,
  }), [signals, targets]);

  const shownSignals = signals.filter((signal) => {
    if (filter !== "all" && signal.status !== filter) return false;
    const text = `${signal.company ?? ""} ${signal.headline} ${signal.summary ?? ""} ${signal.suggested_angle ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  async function patchSignal(id: string, update: Partial<RadarSignal>) {
    const response = await fetch("/api/radar/signals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...update }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else setSignals((current) => current.map((item) => item.id === id ? payload.data : item));
  }

  async function createTarget(signal: RadarSignal, status = "watching") {
    const response = await fetch("/api/radar/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: signal.company || signal.headline, sector: signal.category, target_status: status, best_signal_id: signal.id, why_interesting: signal.headline, pain_hypothesis: signal.summary, proposal_angle: signal.suggested_angle, notes: signal.url }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setTargets((current) => [payload.data, ...current]); await patchSignal(signal.id, { status: status === "watching" ? "watching" : "saved" }); }
  }

  async function buildPrompt(type: string, signal?: RadarSignal, target?: TargetCompany, angle?: StrategicAngle) {
    const response = await fetch("/api/radar/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, signal, target, angle }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setPrompt(payload.data.prompt); await navigator.clipboard?.writeText(payload.data.prompt).catch(() => undefined); }
  }

  async function convertSignal(signal: RadarSignal) {
    const response = await fetch("/api/radar/convert-to-opportunity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signal_id: signal.id }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setMessage("Converted to opportunity."); await loadAll(); }
  }

  async function scan(sourceId?: string) {
    setMessage("Scanning sources...");
    const response = await fetch("/api/radar/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_id: sourceId }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else setMessage(`Scan complete. New signals: ${payload.data.created}.`);
    await loadAll();
  }

  async function createSource(source = newSource) {
    const response = await fetch("/api/radar/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...source, keywords: typeof source.keywords === "string" ? source.keywords.split(",") : source.keywords }) });
    const payload = await response.json();
    if (payload.error) setMessage(payload.error); else { setSources((current) => [payload.data, ...current]); setNewSource({ name: "", url: "", source_type: "rss", category: "", keywords: "" }); }
  }

  async function seedSources() { for (const source of starterSources) await createSource(source as typeof newSource); await loadAll(); }
  async function seedAngles() { const response = await fetch("/api/radar/angles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed_defaults: true }) }); const payload = await response.json(); if (payload.error) setMessage(payload.error); else await loadAll(); }
  async function saveAngle(angle: Partial<StrategicAngle>) { const response = await fetch("/api/radar/angles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(angle) }); const payload = await response.json(); if (payload.error) setMessage(payload.error); else { setAngles((current) => [...current, payload.data]); setNewAngle(emptyAngle()); } }

  return <div className="stack">
    <section className="card stack"><h1>Opportunity Radar</h1><p className="muted">Signal-led sourcing for untapped roles, advisory conversations, and companies to watch. Manual ChatGPT prompts only; no automated outreach.</p>{message ? <p className={message.includes("not available") || message.includes("error") ? "error" : "muted"}>{message}</p> : null}</section>
    <section className="metric-grid"><div className="metric-card"><span>New signals</span><strong>{metrics.newSignals}</strong></div><div className="metric-card"><span>Saved targets</span><strong>{metrics.savedTargets}</strong></div><div className="metric-card"><span>High relevance</span><strong>{metrics.highSignals}</strong></div><div className="metric-card"><span>Outreach active</span><strong>{metrics.outreachActive}</strong></div><div className="metric-card"><span>Converted</span><strong>{metrics.converted}</strong></div></section>
    <div className="radar-tabs">{(["signals", "targets", "angles", "sources"] as Tab[]).map((item) => <button key={item} className={tab === item ? "" : "secondary"} onClick={() => setTab(item)}>{item === "signals" ? "Signal Inbox" : item === "targets" ? "Saved Targets" : item === "angles" ? "Angle Library" : "Sources / Scanner"}</button>)}</div>

    {tab === "signals" ? <section className="card stack"><div className="row"><h2>Signal Inbox</h2><button onClick={() => void scan()}>Refresh all active sources</button></div><div className="filter-grid"><label>Status<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="new">New</option><option value="saved">Saved</option><option value="watching">Watching</option><option value="dismissed">Dismissed</option><option value="converted">Converted</option><option value="all">All</option></select></label><label>Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company, headline, angle..." /></label></div><div className="radar-scroll">{shownSignals.map((signal) => <article className="card radar-card" key={signal.id}><div className="row"><strong>{signal.company || "Unknown company"}</strong><span className="badge">{signal.signal_type}</span><span className="badge warning">Score {signal.relevance_score}</span></div><h3>{signal.headline}</h3><p className="muted">{signal.source_name} · {signal.published_at ? new Date(signal.published_at).toLocaleDateString() : "Unknown date"}</p><p>{signal.summary}</p><p className="muted">Suggested angle: {signal.suggested_angle || "None"}</p>{signal.url ? <a href={signal.url} target="_blank" rel="noreferrer">Open source</a> : null}<label>Company<input value={signal.company ?? ""} onChange={(e) => void patchSignal(signal.id, { company: e.target.value })} /></label><div className="row"><button className="secondary" onClick={() => void createTarget(signal, "research")}>Save target</button><button className="secondary" onClick={() => void createTarget(signal, "watching")}>Watch</button><button className="secondary" onClick={() => void patchSignal(signal.id, { status: "dismissed" })}>Dismiss</button><button className="secondary" onClick={() => void buildPrompt("company_research", signal)}>Research prompt</button><button className="secondary" onClick={() => void buildPrompt("unposted_role", signal)}>Unposted role</button><button className="secondary" onClick={() => void buildPrompt("proposal_outreach", signal)}>Proposal outreach</button><button onClick={() => void convertSignal(signal)}>Convert</button></div></article>)}</div></section> : null}

    {tab === "targets" ? <section className="card stack"><h2>Saved Targets</h2><div className="radar-scroll">{targets.map((target) => <article className="card radar-card" key={target.id}><div className="row"><strong>{target.company}</strong><span className="badge">{target.target_status}</span><span className="badge accent">{target.outreach_status}</span></div><p>{target.why_interesting}</p><p className="muted">{target.proposal_angle || target.pain_hypothesis}</p><div className="row"><Link href={`/radar/targets/${target.id}`}>Open detail</Link><button className="secondary" onClick={() => void buildPrompt("proposal_outreach", undefined, target)}>Build outreach</button><button className="secondary" onClick={() => void buildPrompt("unposted_role", undefined, target)}>Build role</button></div></article>)}</div></section> : null}

    {tab === "angles" ? <section className="card stack"><div className="row"><h2>Angle Library</h2>{angles.length === 0 ? <button onClick={() => void seedAngles()}>Seed default angles</button> : null}</div><article className="mini-card stack"><label>Name<input value={newAngle.name ?? ""} onChange={(e) => setNewAngle({ ...newAngle, name: e.target.value })} /></label><label>Pain hypothesis<textarea value={newAngle.pain_hypothesis ?? ""} onChange={(e) => setNewAngle({ ...newAngle, pain_hypothesis: e.target.value })} /></label><label>Short pitch<textarea value={newAngle.short_pitch ?? ""} onChange={(e) => setNewAngle({ ...newAngle, short_pitch: e.target.value })} /></label><button onClick={() => void saveAngle(newAngle)}>Add angle</button></article>{angles.map((angle) => <article className="mini-card stack" key={angle.id}><div className="row"><strong>{angle.name}</strong><span className="badge">{angle.category || "Angle"}</span></div><p>{angle.short_pitch}</p><p className="muted">{angle.pain_hypothesis}</p><button className="secondary" onClick={() => void buildPrompt("strategic_angle", undefined, undefined, angle)}>Copy strategic angle prompt</button></article>)}</section> : null}

    {tab === "sources" ? <section className="card stack"><div className="row"><h2>Sources / Scanner</h2>{sources.length === 0 ? <button onClick={() => void seedSources()}>Create starter sources</button> : null}<button className="secondary" onClick={() => void buildPrompt("source_discovery")}>Copy source discovery prompt</button></div><article className="mini-card stack"><label>Name<input value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} /></label><label>URL<input value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} /></label><label>Type<select value={newSource.source_type} onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}><option value="rss">RSS implemented</option><option value="hackernews">Hacker News optional</option><option value="manual">Manual</option><option value="github_search">GitHub Search placeholder</option><option value="sec_edgar">SEC EDGAR placeholder</option></select></label><label>Keywords<input value={newSource.keywords} onChange={(e) => setNewSource({ ...newSource, keywords: e.target.value })} placeholder="comma separated" /></label><button onClick={() => void createSource()}>Add source</button></article>{sources.map((source) => <article className="mini-card stack" key={source.id}><div className="row"><strong>{source.name}</strong><span className="badge">{source.source_type}</span><span className="badge">{source.is_active ? "Active" : "Inactive"}</span></div><p className="muted">{source.url}</p><p className="muted">Last scan: {source.last_scanned_at ? new Date(source.last_scanned_at).toLocaleString() : "Never"}</p>{source.last_error ? <p className="error">{source.last_error}</p> : null}<button className="secondary" onClick={() => void scan(source.id)}>Test / scan source</button></article>)}</section> : null}

    {prompt ? <section className="card stack"><div className="row"><h2>Generated prompt</h2><button className="secondary" onClick={() => navigator.clipboard.writeText(prompt)}>Copy again</button></div><p className="muted">Paste this into ChatGPT Plus manually, then paste useful output back into the relevant signal or target notes.</p><pre>{prompt}</pre></section> : null}
  </div>;
}
