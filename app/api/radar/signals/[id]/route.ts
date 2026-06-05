import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../../../lib/supabase";
import { radarError } from "../../../../../lib/radar-api";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any).from("radar_signals").select("*").eq("id", params.id).single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { error } = await (supabase as any).from("radar_signals").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return radarError(error);
  }
}
