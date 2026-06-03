import { NextResponse } from "next/server";

const TIMEOUT_MS = 8_000;
const MAX_HTML_CHARS = 250_000;

function cleanText(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function getTitle(html: string): string | null {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null;
}

function isLinkedIn(hostname: string): boolean {
  return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
}

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(lower)) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

function parseUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const url = parseUrl((body as { url?: unknown }).url);
  if (!url) {
    return NextResponse.json({ error: "Enter a valid http or https URL." }, { status: 400 });
  }

  if (isLinkedIn(url.hostname)) {
    return NextResponse.json({ error: "LinkedIn scraping is intentionally not supported. Paste the job description manually." }, { status: 400 });
  }

  if (isPrivateHostname(url.hostname)) {
    return NextResponse.json({ error: "Private, localhost, and internal network URLs are not supported." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "JobSearchCommandCenter/1.0 (+manual user-requested URL extraction)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ error: "That page redirects and cannot be safely extracted. Paste the job description manually." }, { status: 400 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `The page returned HTTP ${response.status}. Paste the job description manually.` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json({ error: "That URL did not return an HTML page. Paste the job description manually." }, { status: 415 });
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    const title = getMeta(html, "og:title") ?? getTitle(html) ?? "";
    const description = getMeta(html, "description") ?? getMeta(html, "og:description") ?? cleanText(html).slice(0, 12_000);
    const role = title.split(/[|-]/)[0]?.trim() || "Review extracted title";
    const company = title.split(/[|-]/)[1]?.trim() || "Review extracted company";

    return NextResponse.json({
      data: {
        role,
        company,
        url: url.toString(),
        job_description: description,
        notes: "Extracted from a public URL. Review all fields before saving.",
      },
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "The page timed out. Paste the job description manually." : "The page could not be fetched. Paste the job description manually." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
