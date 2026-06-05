import { NextResponse } from "next/server";

export function radarError(error: unknown, fallback = "Radar request failed.") {
  const message = error instanceof Error ? error.message : fallback;
  const needsMigration = message.toLowerCase().includes("radar_") || message.toLowerCase().includes("target_companies") || message.toLowerCase().includes("strategic_angles");
  return NextResponse.json({ error: needsMigration ? "Opportunity Radar tables are not available yet. Run supabase/005_opportunity_radar.sql in Supabase, then refresh." : message }, { status: needsMigration ? 503 : 500 });
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
