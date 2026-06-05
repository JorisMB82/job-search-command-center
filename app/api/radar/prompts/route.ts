import { NextResponse } from "next/server";
import { buildRadarPrompt } from "../../../../lib/radar-prompts";
import { readJson } from "../../../../lib/radar-api";

export async function POST(request: Request) {
  try {
    const body = await readJson<any>(request);
    const prompt = buildRadarPrompt(body.type || "company_research", { signal: body.signal, target: body.target, angle: body.angle });
    return NextResponse.json({ data: { prompt } });
  } catch {
    return NextResponse.json({ error: "Could not build Radar prompt." }, { status: 400 });
  }
}
