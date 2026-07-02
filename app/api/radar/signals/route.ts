import { NextResponse } from "next/server";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../lib/supabase";

const MAX_SIGNAL_AGE_DAYS = 30;
const DAY_MS = 1000 * 60 * 60 * 24;
const SCORE_FIELDS = ["role_fit_score", "sector_fit_score", "seniority_fit_score", "joris_edge_score", "network_fit_score", "timing_score"] as const;
const RECOMMENDED_ACTIONS = new Set(["apply", "message", "monitor", "ignore"]);

function isFreshOrUndated(signal: { published_at?: string | null }) {
  if (!signal.published_at) return true;
  const published = new Date(signal.published_at).getTime();
  if (Number.isNaN(published)) return false;
  return Date.now() - published <= MAX_SIGNAL_AGE_DAYS * DAY_MS;
}

function clampScore(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return null;
  return Math.min(max, Math.max(0, numeric));
}

function recommendedAction(score: number | null | undefined) {
  if (score === null || score === undefined) return null;
  if (score >= 80) return "apply";
  if (score >= 65) return "message";
  if (score >= 50) return "monitor";
  return "ignore";
}

function normalizeRecommendedAction(value: unknown, score?: number | null) {
  const normalized = normalizeText(value);
  if (normalized && RECOMMENDED_ACTIONS.has(normalized)) return normalized;
  return recommendedAction(score);
}

function scoreFromParts(value: Record<string, any>): number | null {
  const parts = [
    clampScore(value.role_fit_score, 25),
    clampScore(value.sector_fit_score, 20),
    clampScore(value.seniority_fit_score, 15),
    clampScore(value.joris_edge_score, 20),
    clampScore(value.network_fit_score, 10),
    clampScore(value.timing_score, 10),
  ];
  return parts.every((part) => part === null) ? null : parts.reduce<number>((sum, part) => sum + (part ?? 0), 0);
}

function fallbackScoreFromRelevance(relevanceScore: number) {
  return Math.min(100, Math.max(0, Math.round(relevanceScore * 10)));
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
    const relevanceScore = Number.isFinite(Number(body.relevance_score)) ? Number(body.relevance_score) : 0;
    const manualFitScore = scoreFromParts(body);
    const fitScore = manualFitScore ?? fallbackScoreFromRelevance(relevanceScore);
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
      relevance_score: relevanceScore,
      role_fit_score: clampScore(body.role_fit_score, 25),
      sector_fit_score: clampScore(body.sector_fit_score, 20),
      seniority_fit_score: clampScore(body.seniority_fit_score, 15),
      joris_edge_score: clampScore(body.joris_edge_score, 20),
      network_fit_score: clampScore(body.network_fit_score, 10),
      timing_score: clampScore(body.timing_score, 10),
      fit_score: fitScore,
      recommended_action: normalizeRecommendedAction(body.recommended_action, fitScore),
      recommended_resume_template: normalizeText(body.recommended_resume_template),
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

    const { data: existing, error: existingError } = await (supabase as any).from("radar_signals").select("*").eq("id", body.id).single();
    if (existingError) throw existingError;

    const update: Record<string, unknown> = {};
    for (const field of ["company", "headline", "url", "source_name", "published_at", "signal_type", "category", "summary", "raw_excerpt", "status", "suggested_angle", "notes", "chatgpt_output", "dedupe_key", "recommended_resume_template"]) {
      if (body[field] !== undefined) update[field] = normalizeText(body[field]);
    }
    if (body.relevance_score !== undefined) update.relevance_score = Number(body.relevance_score) || 0;

    const nextForScore = { ...(existing ?? {}), ...body };
    for (const field of SCORE_FIELDS) {
      if (body[field] !== undefined) {
        const max = field === "role_fit_score" ? 25 : field === "sector_fit_score" || field === "joris_edge_score" ? 20 : field === "seniority_fit_score" ? 15 : 10;
        update[field] = clampScore(body[field], max);
        nextForScore[field] = update[field];
      }
    }

    if (SCORE_FIELDS.some((field) => body[field] !== undefined) || body.fit_score !== undefined || body.relevance_score !== undefined) {
      const manualFitScore = scoreFromParts(nextForScore);
      const relevanceScore = Number(nextForScore.relevance_score) || 0;
      const fitScore = body.fit_score !== undefined ? clampScore(body.fit_score, 100) : manualFitScore ?? fallbackScoreFromRelevance(relevanceScore);
      update.fit_score = fitScore;
      if (body.recommended_action === undefined) update.recommended_action = normalizeRecommendedAction(undefined, fitScore);
    }

    if (body.recommended_action !== undefined) update.recommended_action = normalizeRecommendedAction(body.recommended_action, Number(existing?.fit_score) || null);

    const { data, error } = await (supabase as any).from("radar_signals").update(update).eq("id", body.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}
