import { NextResponse } from "next/server";
import { radarError, readJson } from "../../../../lib/radar-api";
import { scanSource } from "../../../../lib/radar-scanner";
import { getServerSupabaseClient } from "../../../../lib/supabase";
import type { RadarSource } from "../../../../lib/radar-types";

export async function POST(request: Request) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await readJson<{ source_id?: string }>(request);
    let query = (supabase as any).from("radar_sources").select("*");
    if (body.source_id) query = query.eq("id", body.source_id);
    else query = query.eq("is_active", true);
    const { data: sources, error: sourceError } = await query;
    if (sourceError) throw sourceError;
    let created = 0;
    const errors: string[] = [];
    for (const source of (sources ?? []) as RadarSource[]) {
      try {
        const scanned = await scanSource(source);
        for (const signal of scanned) {
          const { error } = await (supabase as any).from("radar_signals").insert(signal);
          if (!error) created += 1;
          else if (!String(error.message || "").toLowerCase().includes("duplicate")) errors.push(error.message);
        }
        await (supabase as any).from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: errors.length ? errors[errors.length - 1] : null }).eq("id", source.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scan failed.";
        errors.push(`${source.name}: ${message}`);
        await (supabase as any).from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: message }).eq("id", source.id);
      }
    }
    return NextResponse.json({ data: { created, scanned_sources: sources?.length ?? 0, errors } });
  } catch (error) {
    return radarError(error);
  }
}
