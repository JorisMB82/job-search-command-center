import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../../lib/supabase";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any).from("radar_sources").select("*").order("updated_at", { ascending: false });
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
    const name = normalizeText(body.name);
    const url = normalizeText(body.url);
    if (!name || !url) return NextResponse.json({ error: "Name and URL are required." }, { status: 400 });
    const insert = {
      name,
      url,
      source_type: normalizeText(body.source_type) ?? "rss",
      category: normalizeText(body.category),
      keywords: Array.isArray(body.keywords) ? body.keywords.map(String).map((item) => item.trim()).filter(Boolean) : [],
      is_active: body.is_active !== false,
      notes: normalizeText(body.notes),
    };
    const { data, error } = await (supabase as any).from("radar_sources").insert(insert).select("*").single();
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
    if (!body.id) return NextResponse.json({ error: "Source id is required." }, { status: 400 });
    const update: Record<string, unknown> = {};
    for (const field of ["name", "url", "source_type", "category", "notes", "last_error"]) if (body[field] !== undefined) update[field] = normalizeText(body[field]);
    if (body.keywords !== undefined) update.keywords = Array.isArray(body.keywords) ? body.keywords.map(String).map((item) => item.trim()).filter(Boolean) : [];
    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
    if (body.last_scanned_at !== undefined) update.last_scanned_at = body.last_scanned_at;
    const { data, error } = await (supabase as any).from("radar_sources").update(update).eq("id", body.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}

export async function DELETE(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<{ id?: string }>(request);
    if (!body.id) return NextResponse.json({ error: "Source id is required." }, { status: 400 });
    const { error } = await (supabase as any).from("radar_sources").delete().eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return radarError(error);
  }
}
