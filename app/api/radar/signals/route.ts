import { NextResponse } from "next/server";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../lib/supabase";

const MAX_SIGNAL_AGE_DAYS = 30;
const DAY_MS = 1000 * 60 * 60 * 24;

function isFreshOrUndated(signal: { published_at?: string | null }) {
  if (!signal.published_at) return true;
  const published = new Date(signal.published_at).getTime();
  if (Number.isNaN(published)) return false;
  return Date.now() - published <= MAX_SIGNAL_AGE_DAYS * DAY_MS;
}

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any).from("radar_signals").select("*").order("relevance_score", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false }).limit(250);
    if (error) throw error;
    return NextResponse.json({ data: (data ?? []).filter(isFreshOrUndated) });
  } catch (error) {
    return radarError(error);
  }
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<any>(request);
    const headline = normalizeText(body.headline);
    if (!headline) return NextResponse.json({ error: "Headline is required." }, { status: 400 });
    const insert = {
      source_id: body.source_id ?? null,
      company: normalizeText(body.company),
      headline,
      url: normalizeText(body.url),
      source_name: normalizeText(body.source_name),
      published_at: normalizeText(body.published_at),
      signal_type: normalizeText(body.signal_type) ?? "other",
      category: normalizeText(body.category),
      summary: normalizeText(body.summary),
      raw_excerpt: normalizeText(body.raw_excerpt),
      relevance_score: Number.isFinite(Number(body.relevance_score)) ? Number(body.relevance_score) : 0,
      status: normalizeText(body.status) ?? "new",
      suggested_angle: normalizeText(body.suggested_angle),
      notes: normalizeText(body.notes),
      chatgpt_output: normalizeText(body.chatgpt_output),
      dedupe_key: normalizeText(body.dedupe_key),
    };
    const { data, error } = await (supabase as any).from("radar_signals").insert(insert).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return radarError(error);
  }
}

export async function PATCH(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<any>(request);
    if (!body.id) return NextResponse.json({ error: "Signal id is required." }, { status: 400 });
    const update: Record<string, unknown> = {};
    for (const field of ["company", "headline", "url", "source_name", "published_at", "signal_type", "category", "summary", "raw_excerpt", "status", "suggested_angle", "notes", "chatgpt_output", "dedupe_key"]) {
      if (body[field] !== undefined) update[field] = normalizeText(body[field]);
    }
    if (body.relevance_score !== undefined) update.relevance_score = Number(body.relevance_score) || 0;
    const { data, error } = await (supabase as any).from("radar_signals").update(update).eq("id", body.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}
