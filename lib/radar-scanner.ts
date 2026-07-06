import { getServerSupabaseClient } from "./supabase";
import type { RadarSource, RadarSignalInsert } from "./radar-types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const RELEVANCE_KEYWORDS: string[] = [
  "chief of staff", "head of", "vp of", "director of", "strategy", "operations",
  "business development", "partnerships", "corporate development", "growth",
  "general manager", "chief operating", "president",
  "tokenization", "digital assets", "rwa", "blockchain", "crypto", "web3",
  "defi", "stablecoin", "fintech", "payments", "capital markets",
  "asset management", "investment", "venture",
  "startup", "early stage", "seed", "series a", "series b",
  "remote", "new york", "nyc", "manhattan",
];

const ROLE_EXCLUDE_KEYWORDS: string[] = [
  "software engineer", "frontend", "backend", "fullstack", "full stack",
  "devops", "sre", "machine learning", "data scientist", "data engineer",
  "mobile developer", "ios developer", "android developer", "qa engineer",
  "security engineer", "cloud engineer", "platform engineer",
];

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  postedAt: Date | null;
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function extractAllTags(xml: string, tag: string): string[] {
  const results: string[] = [];
  const pattern = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[0]);
  }
  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function parseRssDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function parseLocationFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("new york") || lower.includes("nyc")) return "New York, NY";
  if (lower.includes("san francisco") || lower.includes("sf")) return "San Francisco, CA";
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("london")) return "London";
  return "";
}

async function parseJobRssFeed(source: RadarSource): Promise<ParsedJob[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; job-search-bot/1.0)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const items = extractAllTags(xml, "item");
  const jobs: ParsedJob[] = [];

  for (const item of items) {
    const title = stripHtml(extractTag(item, "title"));
    const link = extractTag(item, "link") || extractTag(item, "guid");
    const description = stripHtml(extractTag(item, "description") || extractTag(item, "content:encoded") || "");
    const pubDate = parseRssDate(extractTag(item, "pubDate") || extractTag(item, "dc:date"));

    let company = extractTag(item, "company") || extractTag(item, "author") || "";
    if (!company) {
      const atMatch = /\bat\s+([^[\]()\n]+?)(?:\s*[-|·]|$)/i.exec(title);
      if (atMatch) company = atMatch[1].trim();
    }

    const location = stripHtml(
      extractTag(item, "location") ||
      extractTag(item, "job:location") ||
      extractTag(item, "georss:featureName") || ""
    ) || parseLocationFromText(title + " " + description);

    jobs.push({
      title: title || "Unknown role",
      company: company || "Unknown company",
      location,
      url: link,
      description: description.slice(0, 2000),
      postedAt: pubDate,
    });
  }
  return jobs;
}

async function parseWellfoundFeed(source: RadarSource): Promise<ParsedJob[]> {
  const query = encodeURIComponent(source.url);
  const url = `https://wellfound.com/api/v2/jobs?query=${query}&page=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; job-search-bot/1.0)", "Accept": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Wellfound API HTTP ${response.status}`);

  type WellfoundJob = {
    title?: string;
    startup?: { name?: string };
    remote?: boolean;
    locationNames?: string[];
    jobUrl?: string;
    description?: string;
    createdAt?: string;
  };
  const data = (await response.json()) as { jobs?: WellfoundJob[] };
  return (data.jobs ?? []).map((job) => ({
    title: job.title ?? "Unknown role",
    company: job.startup?.name ?? "Unknown company",
    location: [...(job.remote ? ["Remote"] : []), ...(job.locationNames ?? [])].join(", ") || "Unknown",
    url: job.jobUrl ?? "",
    description: stripHtml(job.description ?? "").slice(0, 2000),
    postedAt: job.createdAt ? new Date(job.createdAt) : null,
  }));
}

async function parseBuiltinFeed(source: RadarSource): Promise<ParsedJob[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; job-search-bot/1.0)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const jsonLdMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  const jobs: ParsedJob[] = [];

  type JsonLdJob = {
    "@type"?: string;
    title?: string;
    hiringOrganization?: { name?: string };
    jobLocation?: { address?: { addressLocality?: string; addressRegion?: string } };
    url?: string;
    description?: string;
    datePosted?: string;
  };

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]) as JsonLdJob | JsonLdJob[];
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;
        const addr = item.jobLocation?.address;
        jobs.push({
          title: item.title ?? "Unknown role",
          company: item.hiringOrganization?.name ?? "Unknown company",
          location: [addr?.addressLocality, addr?.addressRegion].filter(Boolean).join(", ") || "NYC",
          url: item.url ?? source.url,
          description: stripHtml(item.description ?? "").slice(0, 2000),
          postedAt: item.datePosted ? new Date(item.datePosted) : null,
        });
      }
    } catch { continue; }
  }
  return jobs;
}

function scoreJob(job: ParsedJob, keywords: string[]): number {
  const text = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
  if (ROLE_EXCLUDE_KEYWORDS.some((kw) => job.title.toLowerCase().includes(kw))) return 0;
  let score = 0;
  for (const kw of keywords) { if (text.includes(kw.toLowerCase())) score += 2; }
  for (const kw of RELEVANCE_KEYWORDS) { if (text.includes(kw.toLowerCase())) score += 1; }
  return Math.min(10, score);
}

function describeSignalType(job: ParsedJob): string {
  const title = job.title.toLowerCase();
  if (title.includes("chief of staff")) return "Chief of Staff";
  if (title.includes("head of")) return "Head of Function";
  if (title.includes("director")) return "Director";
  if (title.includes("vp") || title.includes("vice president")) return "VP";
  if (title.includes("strategy")) return "Strategy";
  if (title.includes("operations")) return "Operations";
  if (title.includes("partnership") || title.includes("business development")) return "BD / Partnerships";
  if (title.includes("growth")) return "Growth";
  return "Open Role";
}

function buildSuggestedAngle(job: ParsedJob): string {
  const text = `${job.title} ${job.description}`.toLowerCase();
  if (text.includes("rwa") || text.includes("tokenization") || text.includes("digital asset")) return "RWA / Digital Assets expertise";
  if (text.includes("chief of staff") || text.includes("founder")) return "Chief of Staff / Founder Office track record";
  if (text.includes("partnership") || text.includes("business development")) return "BD & Partnerships background";
  if (text.includes("venture") || text.includes("startup")) return "Venture Builder / Startup Operator experience";
  return "Strategy & Operations generalist";
}

export async function scanSource(source: RadarSource): Promise<{ created: number; error?: string }> {
  const supabase = getServerSupabaseClient();
if (!supabase) return { created: 0, error: "Supabase not configured." };
  let jobs: ParsedJob[] = [];

  try {
    if (source.source_type === "rss" || source.source_type === "atom") {
      jobs = await parseJobRssFeed(source);
    } else if (source.source_type === "wellfound") {
      jobs = await parseWellfoundFeed(source);
    } else if (source.source_type === "builtin") {
      jobs = await parseBuiltinFeed(source);
    } else {
      return { created: 0, error: `Source type '${source.source_type}' not implemented.` };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("radar_sources").update({ last_error: errorMessage, last_scanned_at: new Date().toISOString() }).eq("id", source.id);
    return { created: 0, error: errorMessage };
  }

  const keywords = Array.isArray(source.keywords) ? source.keywords : [];
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  const relevant = jobs.filter((job) => {
    if (!job.url) return false;
    if (job.postedAt && job.postedAt < cutoff) return false;
    return scoreJob(job, keywords) > 0;
  });

  const { data: existingSignals } = await supabase
    .from("radar_signals")
    .select("url")
    .in("url", relevant.map((j) => j.url).filter(Boolean));

  const existingUrls = new Set((existingSignals ?? []).map((s: { url: string }) => s.url));
  const newJobs = relevant.filter((job) => !existingUrls.has(job.url));

  if (!newJobs.length) {
    await supabase.from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    return { created: 0 };
  }

  const signals: RadarSignalInsert[] = newJobs.map((job) => ({
    source_id: source.id,
    source_name: source.name,
    headline: job.title,
    company: job.company,
    url: job.url,
    summary: job.description.slice(0, 500) || null,
    published_at: job.postedAt?.toISOString() ?? null,
    signal_type: describeSignalType(job),
    category: source.category ?? "Job Posting",
    relevance_score: scoreJob(job, keywords),
    suggested_angle: buildSuggestedAngle(job),
    status: "new",
  }));

  const { error: insertError } = await supabase.from("radar_signals").insert(signals);
  if (insertError) return { created: 0, error: insertError.message };

  await supabase.from("radar_sources").update({ last_scanned_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
  return { created: signals.length };
}

export async function scanAllActiveSources(): Promise<{ created: number; scanned_sources: number; errors: string[] }> {
  const supabase = getServerSupabaseClient();
if (!supabase) return { created: 0, error: "Supabase not configured." };
  const { data: sources, error } = await supabase.from("radar_sources").select("*").eq("is_active", true);
  if (error || !sources) return { created: 0, scanned_sources: 0, errors: [error?.message ?? "Failed to load sources"] };

  let totalCreated = 0;
  const errors: string[] = [];

  for (const source of sources as RadarSource[]) {
    const result = await scanSource(source);
    totalCreated += result.created;
    if (result.error) errors.push(`${source.name}: ${result.error}`);
  }

  return { created: totalCreated, scanned_sources: sources.length, errors };
}
