import { NextResponse } from "next/server";
import type { ResumeTemplateInsert } from "../../../lib/database.types";
import { getServerSupabaseClient } from "../../../lib/supabase";

export async function GET() {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("resume_templates").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let body: Partial<ResumeTemplateInsert>;
  try {
    body = (await request.json()) as Partial<ResumeTemplateInsert>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.name || !body.content) {
    return NextResponse.json({ error: "Name and content are required." }, { status: 400 });
  }
  const insert: ResumeTemplateInsert = {
    name: body.name,
    content: body.content,
    notes: body.notes ?? null,
  };
  const { data, error } = await supabase.from("resume_templates").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
