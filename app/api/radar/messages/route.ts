import { NextResponse } from "next/server";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../lib/supabase";

export async function GET(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { searchParams } = new URL(request.url);
    let query = (supabase as any).from("radar_messages").select("*").order("updated_at", { ascending: false });
    const targetId = searchParams.get("target_company_id");
    const signalId = searchParams.get("signal_id");
    if (targetId) query = query.eq("target_company_id", targetId);
    if (signalId) query = query.eq("signal_id", signalId);
    const { data, error } = await query;
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
    const insert = {
      target_company_id: body.target_company_id || null,
      signal_id: body.signal_id || null,
      angle_id: body.angle_id || null,
      message_type: normalizeText(body.message_type) || "company_research",
      prompt_text: normalizeText(body.prompt_text),
      output_text: normalizeText(body.output_text),
      status: normalizeText(body.status) || "draft",
      notes: normalizeText(body.notes),
    };
    const { data, error } = await (supabase as any).from("radar_messages").insert(insert).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return radarError(error);
  }
}
