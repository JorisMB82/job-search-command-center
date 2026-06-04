import { NextResponse } from "next/server";
import type { OpportunityInsert, OpportunityPriority, OpportunityStatus, RoleBucket } from "../../../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, ROLE_BUCKETS } from "../../../lib/database.types";
import { getServerSupabaseClient } from "../../../lib/supabase";

function isRoleBucket(value: unknown): value is RoleBucket {
  return typeof value === "string" && (ROLE_BUCKETS as readonly string[]).includes(value);
}

function isPriority(value: unknown): value is OpportunityPriority {
  return typeof value === "string" && (OPPORTUNITY_PRIORITIES as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

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
    location: normalizeText(body.location),
    url: normalizeText(body.url),
    status: isStatus(body.status) ? body.status : "new",
    job_description: body.job_description,
    notes: normalizeText(body.notes),
    interview_prep_notes: normalizeText(body.interview_prep_notes),
    resume_tailoring_notes: normalizeText(body.resume_tailoring_notes),
    general_notes: normalizeText(body.general_notes),
    role_bucket: isRoleBucket(body.role_bucket) ? body.role_bucket : "General Strategy & Operations",
    priority: isPriority(body.priority) ? body.priority : "medium",
    is_pinned: Boolean(body.is_pinned),
    listing_posted_date: normalizeDate(body.listing_posted_date),
    next_action_date: normalizeDate(body.next_action_date),
    network_notes: normalizeText(body.network_notes),
    source: normalizeText(body.source),
  };
  const { data, error } = await supabase.from("opportunities").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
