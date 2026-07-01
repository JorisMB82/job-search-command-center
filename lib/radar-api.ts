import { NextResponse } from "next/server";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const item = error as Record<string, unknown>;
    const message = [item.message, item.details, item.hint, item.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    if (message) return message;
  }
  return fallback;
}

export function radarError(error: unknown, fallback = "Radar request failed.") {
  const message = errorMessage(error, fallback);
  const lower = message.toLowerCase();
  const needsMigration = ["radar_", "target_companies", "strategic_angles", "does not exist", "schema cache"].some((text) => lower.includes(text));
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
