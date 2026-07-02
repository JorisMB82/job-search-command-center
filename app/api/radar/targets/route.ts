import { NextResponse } from "next/server";
import { normalizeDate, normalizeText, radarError, readJson } from "../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../lib/supabase";

const RECOMMENDED_ACTIONS = new Set(["apply", "message", "monitor", "ignore"]);

function clampScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

function normalizeRecommendedAction(value: unknown) {
  const normalized = normalizeText(value);
  return normalized && RECOMMENDED_ACTIONS.has(normalized) ? normalized : null;
}

function shape(body: any) {
  return {
    company: normalizeText(body.company),
    website: normalizeText(body.website),
    sector: normalizeText(body.sector),
    stage: normalizeText(body.stage),
    target_status: normalizeText(body.target_status) ?? "watching",
    best_signal_id: body.best_signal_id ?? null,
    best_angle_id: body.best_angle_id ?? null,
    selected_resume_template: normalizeText(body.selected_resume_template),
    recommended_action: normalizeRecommendedAction(body.recommended_action),
    message_type: normalizeText(body.message_type),
    fit_score: clampScore(body.fit_score),
    fit_thesis: normalizeText(body.fit_thesis),
    risk_notes: normalizeText(body.risk_notes),
    why_interesting: normalizeText(body.why_interesting),
    pain_hypothesis: normalizeText(body.pain_hypothesis),
    unposted_role_thesis: normalizeText(body.unposted_role_thesis),
    proposal_angle: normalizeText(body.proposal_angle),
    contact_strategy: normalizeText(body.contact_strategy),
    outreach_status: normalizeText(body.outreach_status) ?? "not_contacted",
    contact_name: normalizeText(body.contact_name),
    contact_title: normalizeText(body.contact_title),
    contact_url: normalizeText(body.contact_url),
    last_touch_date: normalizeDate(body.last_touch_date),
    next_action_date: normalizeDate(body.next_action_date),
    notes: normalizeText(body.notes),
  };
}

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any).from("target_companies").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<any>(request);
    const insert = shape(body);
    if (!insert.company) return NextResponse.json({ error: "Company is required." }, { status: 400 });
    const { data, error } = await (supabase as any).from("target_companies").insert(insert).select("*").single();
    if (error) throw error;
    if (insert.best_signal_id) await (supabase as any).from("radar_signals").update({ status: "saved" }).eq("id", insert.best_signal_id);
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
    if (!body.id) return NextResponse.json({ error: "Target id is required." }, { status: 400 });
    const update = shape(body);
    if (body.company === undefined) delete (update as any).company;
    for (const [key] of Object.entries(update)) {
      if (body[key] === undefined) delete (update as any)[key];
    }
    const { data, error } = await (supabase as any).from("target_companies").update(update).eq("id", body.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}
