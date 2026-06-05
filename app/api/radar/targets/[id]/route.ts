import { NextResponse } from "next/server";
import { radarError } from "../../../../../lib/radar-api";
import { getServerSupabaseClient } from "../../../../../lib/supabase";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const { data, error } = await (supabase as any).from("target_companies").select("*").eq("id", params.id).single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return radarError(error);
  }
}
