"use client";

import { useEffect, useMemo, useState } from "react";
import type { RadarSignal, RadarSource } from "../lib/radar-types";
import { STARTER_JOB_SOURCES } from "../lib/radar-types";

type Tab = "signals" | "sources";
type ApiPayload<T> = { data?: T; error?: string; existing?: boolean };

function sourceTypeLabel(type: string) {
  if (type === "rss" || type === "atom") return "RSS feed";
  if (type === "wellfound") return "Wellfound API";
  if (type === "builtin") return "Builtin NYC";
  if (type === "manual") return "Manual only";
  return type;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  try { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "Unknown date"; }
}

function scoreColor(score: number): string {
  if (score >= 7) return "warning";
  if (score >= 4) return "accent";
  return "";
}

export function OpportunityRadarClient() {
  const [tab, setTab] = useState<Tab>("signals");
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [sources, setSources] = useState<RadarSource[]>([]);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", url: "", source_type: "rss", category: "", keywords: "", is_active: false });

  async function loadAll() {
    const [sigRes, srcRes] = await Promise.all([
      fetch("/api/radar/signals"),
      fetch("/api/radar/sources"),
    ]);
    const sigPayload = (await sigRes.json()) as ApiPayload<RadarSignal[]>;
    const srcPayload = (await srcRes.json()) as ApiPayload<RadarSource[]>;
    if (sigPayload.error || srcPayload.error) setMessage(sigPayload.error ?? srcPayload.error ?? "Load failed.");
    setSignals(sigPayload.data ?? []);
    setSources(srcPayload.data ?? []);
  }

  useEffect(() => { void loadAll(); }, []);

  const metrics = useMemo(() => ({
    newSignals: signals.filter((s) => s.status === "new").length,
    highRelevance: signals.filter((s) => s.relevance_score >= 7 && s.status !== "dismissed").length,
    saved: signals.filter((s) => s.status === "saved").length,
    converted: signals.filter((s) => s.status === "converted").length,
    activeSources: sources.filter((s) => s.is_active).length,
  }), [signals, sources]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(signals.map((s) => s.category).filter(Boolean)));
    return cats.sort();
  }, [signals]);

  const shownSignals = useMemo(() => signals.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    const text = `${s.company ?? ""} ${s.headline} ${s.summary ?? ""} ${s.signal_type}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [signals, statusFilter, categoryFilter, search]);

  async function patchSignal(id: string, update: Partial<RadarSignal>) {
    const res = await fetch("/api/radar/signals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...update }),
    });
    const payload = (await res.json()) as ApiPayload<RadarSignal>;
    if (payload.error || !payload.data) { setMessage(payload.error ?? "Signal update failed."); return; }
    setSignals((cur) => cur.map((s) => s.id === id ? payload.data as RadarSignal : s));
  }

  async function convertSignal(signal: RadarSignal) {
    const res = await fetch("/api/radar/convert-to-opportunity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: signal.id }),
    });
    const payload = (await res.json()) as ApiPayload<unknown>;
    if (payload.error) { setMessage(payload.error); return; }
    setMessage(`Converted "${signal.headline}" to an opportunity. Find it on the dashboard.`);
    await loadAll();
  }

  async function scan(sourceId?: string) {
    setScanning(true);
    setMessage("Scanning…");
    const res = await fetch("/api/radar/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: sourceId }),
    });
    const payload = (await res.json()) as ApiPayload<{ created: number; scanned_sources: number; errors: string[] }>;
    if (payload.error || !payload.data) { setMessage(payload.error ?? "Scan failed."); }
    else {
      const { created, scanned_sources, errors } = payload.data;
      setMessage(`Scan complete. ${created} new job${created !== 1 ? "s" : ""} found across ${scanned_sources} source${scanned_sources !== 1 ? "s" : ""}${errors.length ? ` (${errors.length} error${errors.length > 1 ? "s" : ""})` : ""}.`);
    }
    setScanning(false);
    await loadAll();
  }

  async function addSource() {
    if (!newSource.name || !newSource.url) { setMessage("Name and URL are required."); return; }
    if (sources.some((s) => s.url === newSource.url)) { setMessage("Source already exists."); return; }
    const keywords = newSource.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const res = await fetch("/api/radar/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newSource, keywords }),
    });
    const payload = (await res.json()) as ApiPayload<RadarSource>;
    if (payload.error || !payload.data) { setMessage(payload.error ?? "Could not add source."); return; }
    setSources((cur) => [payload.data as RadarSource, ...cur]);
    setNewSource({ name: "", url: "", source_type: "rss", category: "", keywords: "", is_active: false });
    setMessage("Source added. Keep it inactive, test it, then activate if useful.");
  }

  async function seedStarterSources() {
    let added = 0;
    for (const source of STARTER_JOB_SOURCES) {
      if (sources.some((s) => s.url === source.url)) continue;
      const res = await fetch("/api/radar/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      const payload = (await res.json()) as ApiPayload<RadarSource>;
      if (payload.data) { setSources((cur) => [payload.data as RadarSource, ...cur]); added++; }
    }
    await loadAll();
    setMessage(added > 0 ? `Added ${added} starter source${added !== 1 ? "s" : ""}.` : "All starter sources already exist.");
  }

  async function patchSource(id: string, update: Partial<RadarSource>) {
    const res = await fetch("/api/radar/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...update }),
    });
    const payload = (await res.json()) as ApiPayload<RadarSource>;
    if (payload.error || !payload.data) { setMessage(payload.error ?? "Source update failed."); return; }
    setSources((cur) => cur.map((s) => s.id === id ? payload.data as RadarSource : s));
  }

  async function deleteSource(id: string) {
    if (!window.confirm("Delete this source? Existing signals stay, but the source won't be scanned again.")) return;
    const res = await fetch("/api/radar/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await res.json()) as ApiPayload<unknown>;
    if (payload.error) { setMessage(payload.error); return; }
    setSources((cur) => cur.filter((s) => s.id !== id));
    setMessage("Source deleted.");
  }

  async function dismissAll() {
    const toDismiss = shownSignals.filter((s) => s.status === "new" && s.relevance_score < 4);
    if (!toDismiss.length) { setMessage("No low-relevance new signals to dismiss."); return; }
    if (!window.confirm(`Dismiss ${toDismiss.length} low-relevance signal${toDismiss.length > 1 ? "s" : ""}?`)) return;
    await Promise.all(toDismiss.map((s) => patchSignal(s.id, { status: "dismissed" })));
    setMessage(`Dismissed ${toDismiss.length} signals.`);
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <h1>Job Scanner</h1>
          {metrics.activeSources > 0
            ? <button disabled={scanning} onClick={() => void scan()}>{scanning ? "Scanning…" : `Scan ${metrics.activeSources} active source${metrics.activeSources !== 1 ? "s" : ""}`}</button>
            : <button className="secondary" onClick={() => void seedStarterSources()}>Set up starter sources</button>}
        </div>
        <p className="muted">Scans job board feeds for relevant openings. Review, save, and convert matches into tracked opportunities.</p>
        {message ? <p className={message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") ? "error" : "muted"}>{message}</p> : null}
      </section>

      <section className="metric-grid">
        <div className="metric-card"><span>New jobs</span><strong>{metrics.newSignals}</strong></div>
        <div className="metric-card"><span>High relevance</span><strong>{metrics.highRelevance}</strong></div>
        <div className="metric-card"><span>Saved</span><strong>{metrics.saved}</strong></div>
        <div className="metric-card"><span>Converted</span><strong>{metrics.converted}</strong></div>
        <div className="metric-card"><span>Active sources</span><strong>{metrics.activeSources}</strong></div>
      </section>

      <div className="radar-tabs">
        <button className={tab === "signals" ? "" : "secondary"} onClick={() => setTab("signals")}>Job Inbox</button>
        <button className={tab === "sources" ? "" : "secondary"} onClick={() => setTab("sources")}>Sources / Scanner</button>
      </div>

      {tab === "signals" && (
        <section className="card stack">
          <div className="row">
            <h2>Job Inbox</h2>
            <button className="secondary" onClick={dismissAll}>Dismiss low-relevance</button>
          </div>
          <p className="muted">Jobs found by the scanner. Save interesting ones, dismiss noise, convert strong matches into tracked opportunities.</p>
          <div className="filter-grid">
            <label>Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="new">New</option>
                <option value="saved">Saved</option>
                <option value="dismissed">Dismissed</option>
                <option value="converted">Converted</option>
                <option value="all">All</option>
              </select>
            </label>
            <label>Category
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Search
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Role, company, keyword…" />
            </label>
          </div>
          <p className="muted">Showing {shownSignals.length} of {signals.length} signals.</p>
          <div className="radar-scroll">
            {shownSignals.length === 0 ? (
              <p className="muted">{signals.length === 0 ? "No jobs yet. Go to Sources / Scanner, add sources, and run a scan." : "No signals match these filters."}</p>
            ) : shownSignals.map((signal) => (
              <article className="card radar-card" key={signal.id}>
                <div className="row card-title-row">
                  <strong>{signal.headline}</strong>
                  <span className="badge">{signal.signal_type}</span>
                  <span className={`badge ${scoreColor(signal.relevance_score)}`}>Score {signal.relevance_score}/10</span>
                </div>
                <p>{signal.company ?? "Unknown company"}{signal.category ? ` · ${signal.category}` : ""}</p>
                <p className="muted">Posted: {formatDate(signal.published_at)} · via {signal.source_name}</p>
                {signal.summary ? <p className="muted">{signal.summary.slice(0, 280)}{signal.summary.length > 280 ? "…" : ""}</p> : null}
                {signal.suggested_angle ? <p className="muted">Angle: {signal.suggested_angle}</p> : null}
                <div className="row">
                  {signal.url ? <a href={signal.url} target="_blank" rel="noreferrer">Open posting ↗</a> : null}
                  {signal.status === "new" && <button className="secondary" onClick={() => void patchSignal(signal.id, { status: "saved" })}>Save</button>}
                  {signal.status === "new" && <button className="secondary" onClick={() => void patchSignal(signal.id, { status: "dismissed" })}>Dismiss</button>}
                  {signal.status === "saved" && <button className="secondary" onClick={() => void patchSignal(signal.id, { status: "new" })}>Unsave</button>}
                  {(signal.status === "new" || signal.status === "saved") && (
                    <button onClick={() => void convertSignal(signal)}>→ Add to pipeline</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "sources" && (
        <section className="card stack">
          <div className="row">
            <h2>Sources / Scanner</h2>
            <button className="secondary" onClick={() => void seedStarterSources()}>
              {sources.length === 0 ? "Set up starter sources" : "Add missing starters"}
            </button>
            {sources.some((s) => s.is_active) && (
              <button disabled={scanning} onClick={() => void scan()}>{scanning ? "Scanning…" : "Scan all active"}</button>
            )}
          </div>
          <p className="muted">Add job board feeds. Keep new sources inactive, test them once, then activate only the useful ones.</p>
          <article className="mini-card stack">
            <strong>Recommended sources</strong>
            <p className="muted">One click to add. All start inactive so you can test before activating.</p>
            <div className="row" style={{ flexWrap: "wrap", gap: "8px" }}>
              {STARTER_JOB_SOURCES.map((s) => {
                const exists = sources.some((src) => src.url === s.url);
                return (
                  <button
                    key={s.name}
                    className="secondary"
                    disabled={exists}
                    onClick={async () => {
                      if (exists) return;
                      const res = await fetch("/api/radar/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
                      const payload = (await res.json()) as ApiPayload<RadarSource>;
                      if (payload.data) setSources((cur) => [payload.data as RadarSource, ...cur]);
                      setMessage(exists ? "Already added." : `${s.name} added.`);
                    }}
                  >
                    {exists ? "✓ " : "+ "}{s.name}
                  </button>
                );
              })}
            </div>
          </article>
          <details>
            <summary>Add custom source</summary>
            <div className="stack" style={{ marginTop: "12px" }}>
              <label>Name<input value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} /></label>
              <label>URL / search query<input value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} /></label>
              <label>Type
                <select value={newSource.source_type} onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}>
                  <option value="rss">RSS / Atom feed</option>
                  <option value="wellfound">Wellfound API</option>
                  <option value="builtin">Builtin NYC</option>
                  <option value="manual">Manual only</option>
                </select>
              </label>
              <label>Category<input value={newSource.category} onChange={(e) => setNewSource({ ...newSource, category: e.target.value })} /></label>
              <label>Keywords<input value={newSource.keywords} onChange={(e) => setNewSource({ ...newSource, keywords: e.target.value })} placeholder="strategy, operations, chief of staff" /></label>
              <button onClick={() => void addSource()}>Add source</button>
            </div>
          </details>
          {sources.length === 0 ? (
            <p className="muted">No sources yet. Add the starter sources above.</p>
          ) : sources.map((source) => (
            <article className="mini-card stack" key={source.id}>
              <div className="row">
                <strong>{source.name}</strong>
                <span className="badge">{sourceTypeLabel(source.source_type)}</span>
                <span className={source.is_active ? "badge accent" : "badge warning"}>{source.is_active ? "Active" : "Inactive"}</span>
              </div>
              <p className="muted">{source.url}</p>
              {source.keywords?.length ? <p className="muted">Keywords: {source.keywords.join(", ")}</p> : null}
              <p className="muted">Last scan: {source.last_scanned_at ? new Date(source.last_scanned_at).toLocaleString() : "Never"}</p>
              {source.last_error ? <p className="error">Last error: {source.last_error}</p> : null}
              <div className="row">
                <button className="secondary" disabled={scanning} onClick={() => void scan(source.id)}>Test this source</button>
                <button className="secondary" onClick={() => void patchSource(source.id, { is_active: !source.is_active })}>
                  {source.is_active ? "Deactivate" : "Activate"}
                </button>
                <button className="secondary" onClick={() => void deleteSource(source.id)}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
