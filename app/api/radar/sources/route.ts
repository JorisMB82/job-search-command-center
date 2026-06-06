import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../../lib/supabase";
import { normalizeText, radarError, readJson } from "../../../../lib/radar-api";

function normalizeKeywords(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item: string) => item.trim()).filter(Boolean) : [];
}

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any)
      .from("radar_sources")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });
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

    const { data: existing, error: existingError } = await (supabase as any)
      .from("radar_sources")
      .select("*")
      .eq("url", url)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ data: existing, existing: true });

    const insert = {
      name,
      url,
      source_type: normalizeText(body.source_type) ?? "rss",
      category: normalizeText(body.category),
      keywords: normalizeKeywords(body.keywords),
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
    if (body.keywords !== undefined) update.keywords = normalizeKeywords(body.keywords);
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
