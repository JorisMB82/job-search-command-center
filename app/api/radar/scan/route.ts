import { NextResponse } from "next/server";
import { scanSource, scanAllActiveSources } from "../../../../lib/radar-scanner";
import { getServerSupabaseClient } from "../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { source_id?: string };

    if (body.source_id) {
      const supabase = getServerSupabaseClient();
      if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

      const { data: source, error } = await supabase
        .from("radar_sources")
        .select("*")
        .eq("id", body.source_id)
        .single();

      if (error || !source) {
        return NextResponse.json({ error: "Source not found." }, { status: 404 });
      }

      const result = await scanSource(source);
      return NextResponse.json({
        data: {
          created: result.created,
          scanned_sources: 1,
          errors: result.error ? [result.error] : [],
        },
      });
    }

    const result = await scanAllActiveSources();
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed." },
      { status: 500 }
    );
  }
}
