import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type DbError = { message: string } | null;
type DbResult<T = unknown> = { data: T | null; error: DbError };

type RadarQuery<T = unknown> = PromiseLike<DbResult<T>> & {
  select(columns?: string): RadarQuery<T>;
  order(column: string, options?: Record<string, unknown>): RadarQuery<T>;
  limit(count: number): RadarQuery<T>;
  eq(column: string, value: unknown): RadarQuery<T>;
  insert(values: unknown): RadarQuery<T>;
  update(values: unknown): RadarQuery<T>;
  delete(): RadarQuery<T>;
  single(): RadarQuery<T>;
};

type RadarClient = {
  from(table: string): RadarQuery;
};

export function getRadarClient(supabase: SupabaseClient<Database>): RadarClient {
  return supabase as unknown as RadarClient;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function keywordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}
