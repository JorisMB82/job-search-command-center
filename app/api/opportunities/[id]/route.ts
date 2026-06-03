import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "../../../../lib/supabase";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}
