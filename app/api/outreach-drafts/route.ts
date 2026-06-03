import { NextResponse } from "next/server";
import type { OutreachDraftInsert } from "../../../lib/database.types";
import { getServerSupabaseClient } from "../../../lib/supabase";

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let body: Partial<OutreachDraftInsert>;
  try {
    body = (await request.json()) as Partial<OutreachDraftInsert>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.opportunity_id || !body.body) {
    return NextResponse.json({ error: "Opportunity and body are required." }, { status: 400 });
  }
  const insert: OutreachDraftInsert = {
    opportunity_id: body.opportunity_id,
    recipient: body.recipient ?? null,
    channel: body.channel ?? "email",
    subject: body.subject ?? null,
    body: body.body,
  };
  const { data, error } = await supabase.from("outreach_drafts").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
