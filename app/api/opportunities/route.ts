import { NextResponse } from "next/server";
import type { OpportunityInsert } from "../../../lib/database.types";
import { getServerSupabaseClient } from "../../../lib/supabase";

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("opportunities").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let body: Partial<OpportunityInsert>;
  try {
    body = (await request.json()) as Partial<OpportunityInsert>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.company || !body.role || !body.job_description) {
    return NextResponse.json({ error: "Company, role, and job description are required." }, { status: 400 });
  }
  const insert: OpportunityInsert = {
    company: body.company,
    role: body.role,
    location: body.location ?? null,
    url: body.url ?? null,
    status: body.status ?? "new",
    job_description: body.job_description,
    notes: body.notes ?? null,
  };
  const { data, error } = await supabase.from("opportunities").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
