import { NextResponse } from "next/server";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../lib/supabase";

function fitScoreFromRadar(signal: any, target: any) {
  if (Number.isFinite(Number(target?.fit_score))) return Number(target.fit_score);
  if (Number.isFinite(Number(signal?.fit_score))) return Number(signal.fit_score);
  if (Number.isFinite(Number(signal?.relevance_score))) return Math.min(100, Number(signal.relevance_score) * 10);
  return 0;
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<{ signal_id?: string; target_company_id?: string }>(request);
    let signal: any = null;
    let target: any = null;
    if (body.signal_id) {
      const { data, error } = await (supabase as any).from("radar_signals").select("*").eq("id", body.signal_id).single();
      if (error) throw error;
      signal = data;
    }
    if (body.target_company_id) {
      const { data, error } = await (supabase as any).from("target_companies").select("*").eq("id", body.target_company_id).single();
      if (error) throw error;
      target = data;
    }
    if (!signal && !target) return NextResponse.json({ error: "signal_id or target_company_id is required." }, { status: 400 });
    const company = target?.company || signal?.company || "Unknown company";
    const angle = target?.proposal_angle || target?.unposted_role_thesis || signal?.suggested_angle || "Exploratory opportunity";
    const fitScore = fitScoreFromRadar(signal, target);
    const description = [
      signal?.headline ? `Radar signal: ${signal.headline}` : null,
      signal?.summary ? `Summary: ${signal.summary}` : null,
      signal?.url ? `Source: ${signal.url}` : null,
      target?.why_interesting ? `Why interesting: ${target.why_interesting}` : null,
      target?.fit_thesis ? `Fit thesis: ${target.fit_thesis}` : null,
      target?.risk_notes ? `Risks / concerns: ${target.risk_notes}` : null,
      target?.pain_hypothesis ? `Pain hypothesis: ${target.pain_hypothesis}` : null,
      target?.recommended_action ? `Recommended action: ${target.recommended_action}` : signal?.recommended_action ? `Recommended action: ${signal.recommended_action}` : null,
      `Radar fit score: ${fitScore}`,
      `Angle: ${angle}`,
    ].filter(Boolean).join("\n\n");
    const { data: templates } = await (supabase as any).from("resume_templates").select("name").order("updated_at", { ascending: false });
    const templateNames = (templates ?? []).map((template: { name: string }) => template.name);
    const selectedTemplate = target?.selected_resume_template || signal?.recommended_resume_template || templateNames.find((name: string) => angle.toLowerCase().includes(name.toLowerCase())) || templateNames[0] || "Neutral Resume";
    const { data, error } = await (supabase as any).from("opportunities").insert({
      company,
      role: `Unposted / exploratory: ${normalizeText(angle) || "Opportunity Radar"}`,
      location: null,
      url: signal?.url || target?.website || null,
      status: fitScore >= 80 ? "selected" : "researching",
      job_description: description || "Opportunity Radar target.",
      notes: target?.notes || signal?.notes || null,
      interview_prep_notes: null,
      resume_tailoring_notes: target?.fit_thesis || signal?.suggested_angle || null,
      general_notes: target?.risk_notes || null,
      role_bucket: selectedTemplate,
      priority: fitScore >= 80 ? "high" : fitScore >= 65 ? "medium" : "low",
      is_pinned: fitScore >= 80,
      listing_posted_date: null,
      next_action_date: target?.next_action_date || null,
      network_notes: target?.contact_strategy || null,
      source: "Opportunity Radar",
    }).select("*").single();
    if (error) throw error;
    if (signal?.id) await (supabase as any).from("radar_signals").update({ status: "converted" }).eq("id", signal.id);
    if (target?.id) await (supabase as any).from("target_companies").update({ target_status: "converted", outreach_status: "converted" }).eq("id", target.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return radarError(error);
  }
}
