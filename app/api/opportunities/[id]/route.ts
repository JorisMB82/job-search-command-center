import { NextResponse } from "next/server";
import type { OpportunityPriority, OpportunityStatus, OpportunityUpdate, RoleBucket } from "../../../../lib/database.types";
import { OPPORTUNITY_PRIORITIES, OPPORTUNITY_STATUSES, ROLE_BUCKETS } from "../../../../lib/database.types";
import { getServerSupabaseClient } from "../../../../lib/supabase";

function isRoleBucket(value: unknown): value is RoleBucket {
  return typeof value === "string" && (ROLE_BUCKETS as readonly string[]).includes(value);
}

function isPriority(value: unknown): value is OpportunityPriority {
  return typeof value === "string" && (OPPORTUNITY_PRIORITIES as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

function normalizeText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  let body: Partial<OpportunityUpdate>;
  try {
    body = (await request.json()) as Partial<OpportunityUpdate>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const update: OpportunityUpdate = {};
  if (body.company !== undefined && body.company.trim()) update.company = body.company.trim();
  if (body.role !== undefined && body.role.trim()) update.role = body.role.trim();
  if (body.location !== undefined) update.location = normalizeText(body.location) ?? null;
  if (body.url !== undefined) update.url = normalizeText(body.url) ?? null;
  if (body.status !== undefined && isStatus(body.status)) update.status = body.status;
  if (body.job_description !== undefined && body.job_description.trim()) update.job_description = body.job_description;
  if (body.notes !== undefined) update.notes = normalizeText(body.notes) ?? null;
  if (body.role_bucket !== undefined && isRoleBucket(body.role_bucket)) update.role_bucket = body.role_bucket;
  if (body.priority !== undefined && isPriority(body.priority)) update.priority = body.priority;
  if (body.is_pinned !== undefined) update.is_pinned = Boolean(body.is_pinned);
  if (body.next_action_date !== undefined) update.next_action_date = normalizeText(body.next_action_date) ?? null;
  if (body.network_notes !== undefined) update.network_notes = normalizeText(body.network_notes) ?? null;
  if (body.source !== undefined) update.source = normalizeText(body.source) ?? null;

  const { data, error } = await supabase.from("opportunities").update(update).eq("id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
