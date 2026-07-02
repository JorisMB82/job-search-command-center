import { NextResponse } from "next/server";
import { radarError, readJson } from "../../../../lib/radar-api";
import { scanSource } from "../../../../lib/radar-scanner";
import { getServerSupabaseClient } from "../../../../lib/supabase";
import type { RadarSource } from "../../../../lib/radar-types";

const DAY_MS = 1000 * 60 * 60 * 24;

function isDuplicateInsert(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "23505" || message.includes("duplicate");
}

function daysSince(value: string | null | undefined) {
  if (!value) return Infinity;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return Infinity;
  return (Date.now() - parsed) / DAY_MS;
}

function isWeekday() {
  const day = new Date().getDay();
  return day >= 1 && day <= 5;
}

function isSourceDue(source: RadarSource) {
  if (!source.is_active) return false;
  if (source.scan_frequency === "manual") return false;
  if (source.scan_frequency === "weekdays" && !isWeekday()) return false;
  const age = daysSince(source.last_scanned_at);
  if (source.scan_frequency === "daily" || source.scan_frequency === "weekdays") return age >= 0.75;
  if (source.scan_frequency === "twice_weekly") return age >= 3;
  return age >= 6;
}

async function loadSources(supabase: any, sourceId?: string, dueOnly = false) {
  let query = supabase.from("radar_sources").select("*");
  if (sourceId) query = query.eq("id", sourceId);
  else query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  const sources = (data ?? []) as RadarSource[];
  return dueOnly && !sourceId ? sources.filter(isSourceDue) : sources;
}

async function scanRadarSources(sources: RadarSource[], supabase: any) {
  let created = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const source of sources) {
    const sourceErrors: string[] = [];
    try {
      const scanned = await scanSource(source);
      for (const signal of scanned) {
        const { error } = await supabase.from("radar_signals").insert(signal);
        if (!error) created += 1;
        else if (isDuplicateInsert(error)) duplicates += 1;
        else sourceErrors.push(error.message || "Signal insert failed.");
      }
      const lastError = sourceErrors.length ? sourceErrors[sourceErrors.length - 1] : null;
      await supabase.from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: lastError }).eq("id", source.id);
      errors.push(...sourceErrors.map((message) => `${source.name}: ${message}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed.";
      errors.push(`${source.name}: ${message}`);
      await supabase.from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: message }).eq("id", source.id);
    }
  }

  return { created, duplicates, scanned_sources: sources.length, errors };
}

function isAuthorizedCron(request: Request) {
  const secret = process.env.RADAR_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized Radar cron request." }, { status: 401 });
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const sources = await loadSources(supabase as any, undefined, true);
    const data = await scanRadarSources(sources, supabase as any);
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<{ source_id?: string; due_only?: boolean }>(request);
    const sources = await loadSources(supabase as any, body.source_id, Boolean(body.due_only));
    const data = await scanRadarSources(sources, supabase as any);
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}
