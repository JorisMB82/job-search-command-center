import type { RadarSignalType, RadarSource } from "./radar-types";

export type ScannedSignal = {
  source_id: string | null;
  company: string | null;
  headline: string;
  url: string | null;
  source_name: string | null;
  published_at: string | null;
  signal_type: RadarSignalType;
  category: string | null;
  summary: string | null;
  raw_excerpt: string | null;
  relevance_score: number;
  status: "new";
  suggested_angle: string | null;
  notes: string | null;
  chatgpt_output: string | null;
  dedupe_key: string;
};

const TIMEOUT_MS = 10000;
const MIN_RELEVANCE_SCORE = 3;
const MAX_SIGNAL_AGE_DAYS = 30;
const DAY_MS = 1000 * 60 * 60 * 24;
const RWA_NEWS_URL = "https://app.rwa.xyz/news";
const TAC_RESEARCH_URL = "https://www.tacoalition.org/research";
const FUNDING = ["raised", "funding", "seed", "series a", "series b", "series c", "investment", "round", "capital"];
const EXPANSION = ["expands", "expansion", "launches in", "enters", "market entry", "u.s.", "us market", "north america", "new market"];
const PRODUCT = ["launches", "unveils", "introduces", "platform", "product", "solution"];
const PARTNER = ["partners", "partnership", "collaboration", "integrates", "integration"];
const REGULATORY = ["sec", "finra", "nydfs", "broker-dealer", "ats", "custody", "custodian", "license", "regulated", "compliance"];
const RWA = ["tokenization", "tokenized", "rwa", "real-world assets", "digital assets", "stablecoin", "blockchain", "private markets", "on-chain", "custody"];
const HIRING = ["hiring", "scaling", "team", "growth", "chief of staff", "operations", "partnerships", "go-to-market", "gtm"];
const RWA_INTERNAL_HOSTS = new Set(["app.rwa.xyz", "rwa.xyz", "www.rwa.xyz", "rwa.news", "docs.rwa.xyz"]);

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function compactText(value: string) {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return compactText(value.replace(/<[^>]*>/g, " "));
}

function decodeXml(value: string) {
  return compactText(value);
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function attrLink(item: string) {
  const match = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeXml(match[1]) : "";
}

function classify(text: string): RadarSignalType {
  if (hasAny(text, FUNDING)) return "funding";
  if (hasAny(text, EXPANSION)) return "expansion";
  if (hasAny(text, PARTNER)) return "partnership";
  if (hasAny(text, REGULATORY)) return "regulatory";
  if (hasAny(text, HIRING)) return "hiring";
  if (hasAny(text, PRODUCT)) return "product_launch";
  return "other";
}

function signalAgeDays(publishedAt: string | null) {
  if (!publishedAt) return null;
  const parsed = new Date(publishedAt).getTime();
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / DAY_MS;
}

function isRecentEnough(publishedAt: string | null) {
  const age = signalAgeDays(publishedAt);
  if (age === null) return true;
  return age <= MAX_SIGNAL_AGE_DAYS;
}

function score(text: string, publishedAt: string | null, category: string | null) {
  let total = 0;
  if (hasAny(text, FUNDING)) total += 3;
  if (hasAny(text, EXPANSION)) total += 3;
  if (hasAny(text, RWA)) total += 3;
  if (hasAny(text, PARTNER)) total += 2;
  if (hasAny(text, REGULATORY)) total += 2;
  if (hasAny(text, HIRING)) total += 2;
  if (hasAny(text, PRODUCT)) total += 2;
  if (text.includes("strategy") || text.includes("operations") || text.includes("gtm") || text.includes("partnerships")) total += 2;
  if (category) total += 1;
  const age = signalAgeDays(publishedAt);
  if (age !== null && age <= MAX_SIGNAL_AGE_DAYS) total += 2;
  return total;
}

function suggestedAngle(text: string) {
  if (hasAny(text, EXPANSION) || hasAny(text, REGULATORY)) return "U.S. Market Entry / Regulatory GTM";
  if (hasAny(text, RWA)) return "RWA / Tokenization Strategy & Execution";
  if (hasAny(text, FUNDING) || hasAny(text, HIRING)) return "Founder’s Office / Strategic Projects";
  if (hasAny(text, PARTNER)) return "Partnerships / Corporate Development";
  if (text.includes("trade finance") || text.includes("commodity") || text.includes("warehouse") || text.includes("collateral")) return "Trade Finance / Commodity Finance Structuring";
  return "Founder’s Office / Strategic Projects";
}

function extractCompany(headline: string) {
  const cleaned = headline.replace(/^[^:]+:\s*/, "").trim();
  const match = cleaned.match(/^(.+?)\s+(raises|raised|launches|partners|announces|expands|unveils|introduces|secures|closes)\b/i);
  return match ? match[1].replace(/[,:-]+$/, "").trim() : null;
}

function dedupe(url: string | null, headline: string, source: string | null) {
  const base = url || `${source || "source"}:${headline}`;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 180);
}

function isRelevant(signal: ScannedSignal) {
  return signal.relevance_score >= MIN_RELEVANCE_SCORE && signal.headline.trim().length > 0 && isRecentEnough(signal.published_at);
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "JobSearchCommandCenter/1.0" } });
    if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function absoluteUrl(href: string, baseUrl: string) {
  try {
    return new URL(decodeHtml(href), baseUrl).toString();
  } catch {
    return null;
  }
}

function hostLabel(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isRwaNavigationHeadline(headline: string) {
  const lower = headline.toLowerCase();
  return [
    "subscribe",
    "sign up",
    "log in",
    "market overview",
    "asset screener",
    "data api",
    "documentation",
    "privacy policy",
    "terms of use",
    "register your assets",
  ].some((term) => lower.includes(term));
}

function isTacNavigationHeadline(headline: string, href: string) {
  const lower = headline.toLowerCase().replace(/\s+/g, " ").trim();
  const hrefLower = href.toLowerCase();
  if (!lower || headline.length < 12) return true;
  if (hrefLower.startsWith("mailto:") || hrefLower.startsWith("#")) return true;
  if (["research", "protocol", "membership", "about", "subscribe", "browse all", "listen", "read this week", "browse reports", "x / twitter", "linkedin"].includes(lower)) return true;
  return [
    "market indices",
    "loading feed",
    "privacy policy",
    "terms of use",
    "©",
  ].some((term) => lower.includes(term));
}

function sourceOriginLabel(host: string | null) {
  if (!host) return "unknown source";
  if (host === "tacoalition.org") return "Tokenized Asset Coalition";
  return host;
}

export async function scanRssSource(source: RadarSource): Promise<ScannedSignal[]> {
  const xml = await fetchText(source.url);
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entries = items.length ? items : [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  return entries.slice(0, 25).map((item) => {
    const headline = stripHtml(tag(item, "title"));
    const link = tag(item, "link") || attrLink(item) || null;
    const raw = tag(item, "description") || tag(item, "summary") || tag(item, "content") || "";
    const summary = stripHtml(raw).slice(0, 500);
    const published = parseDate(tag(item, "pubDate") || tag(item, "published") || tag(item, "updated"));
    const text = `${headline} ${summary}`.toLowerCase();
    return {
      source_id: source.id,
      company: extractCompany(headline),
      headline: headline || "Untitled signal",
      url: link,
      source_name: source.name,
      published_at: published,
      signal_type: classify(text),
      category: source.category,
      summary,
      raw_excerpt: summary,
      relevance_score: score(text, published, source.category),
      status: "new" as const,
      suggested_angle: suggestedAngle(text),
      notes: null,
      chatgpt_output: null,
      dedupe_key: dedupe(link, headline, source.name),
    };
  }).filter(isRelevant);
}

export async function scanHackerNewsSource(source: RadarSource): Promise<ScannedSignal[]> {
  const query = encodeURIComponent(source.keywords?.join(" ") || source.url || "fintech startup funding");
  const cutoffUnixSeconds = Math.floor((Date.now() - MAX_SIGNAL_AGE_DAYS * DAY_MS) / 1000);
  const raw = await fetchText(`https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&numericFilters=created_at_i>=${cutoffUnixSeconds}`);
  const json = JSON.parse(raw) as { hits?: Array<{ title?: string; url?: string; created_at?: string; story_text?: string }> };
  return (json.hits ?? []).slice(0, 20).map((hit) => {
    const headline = hit.title || "Hacker News signal";
    const summary = stripHtml(hit.story_text || "").slice(0, 500);
    const published = parseDate(hit.created_at || "");
    const text = `${headline} ${summary}`.toLowerCase();
    return {
      source_id: source.id,
      company: extractCompany(headline),
      headline,
      url: hit.url || null,
      source_name: source.name,
      published_at: published,
      signal_type: classify(text),
      category: source.category,
      summary,
      raw_excerpt: summary,
      relevance_score: score(text, published, source.category),
      status: "new" as const,
      suggested_angle: suggestedAngle(text),
      notes: null,
      chatgpt_output: null,
      dedupe_key: dedupe(hit.url || null, headline, source.name),
    };
  }).filter(isRelevant);
}

export async function scanRwaNewsSource(source: RadarSource): Promise<ScannedSignal[]> {
  const sourceUrl = source.url || RWA_NEWS_URL;
  const html = await fetchText(sourceUrl);
  const lowerHtml = html.toLowerCase();
  const newsStart = lowerHtml.indexOf("latest tokenization news");
  const newsHtml = newsStart >= 0 ? html.slice(newsStart) : html;
  const keywordText = source.keywords?.join(" ") || "RWA tokenization stablecoin custody";
  const seen = new Set<string>();
  const signals: ScannedSignal[] = [];

  for (const match of newsHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absoluteUrl(match[1], sourceUrl);
    const host = hostLabel(url);
    const headline = stripHtml(match[2]);
    if (!url || !host || RWA_INTERNAL_HOSTS.has(host)) continue;
    if (headline.length < 20 || isRwaNavigationHeadline(headline)) continue;
    const dedupeKey = dedupe(url, headline, source.name);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const summary = `Headline collected from RWA.xyz Tokenization News. Original source: ${host}.`;
    const text = `${headline} ${summary} ${keywordText}`.toLowerCase();
    const signal: ScannedSignal = {
      source_id: source.id,
      company: extractCompany(headline),
      headline,
      url,
      source_name: source.name,
      published_at: null,
      signal_type: classify(text),
      category: source.category,
      summary,
      raw_excerpt: summary,
      relevance_score: score(text, null, source.category),
      status: "new",
      suggested_angle: suggestedAngle(text),
      notes: null,
      chatgpt_output: null,
      dedupe_key: dedupeKey,
    };

    if (isRelevant(signal)) signals.push(signal);
    if (signals.length >= 25) break;
  }

  return signals;
}

export async function scanTacResearchSource(source: RadarSource): Promise<ScannedSignal[]> {
  const sourceUrl = source.url || TAC_RESEARCH_URL;
  const html = await fetchText(sourceUrl);
  const lowerHtml = html.toLowerCase();
  const researchStart = lowerHtml.indexOf("featured");
  const researchHtml = researchStart >= 0 ? html.slice(researchStart) : html;
  const keywordText = source.keywords?.join(" ") || "RWA tokenization stablecoin policy digital assets";
  const seen = new Set<string>();
  const signals: ScannedSignal[] = [];

  for (const match of researchHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const rawHref = match[1];
    const headline = stripHtml(match[2]);
    if (isTacNavigationHeadline(headline, rawHref)) continue;
    const url = absoluteUrl(rawHref, sourceUrl);
    const host = hostLabel(url);
    if (!url || !host) continue;

    const dedupeKey = dedupe(url, headline, source.name);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const summary = `Item collected from the Tokenized Asset Coalition Research Hub. Original source: ${sourceOriginLabel(host)}.`;
    const text = `${headline} ${summary} ${keywordText}`.toLowerCase();
    const signal: ScannedSignal = {
      source_id: source.id,
      company: extractCompany(headline),
      headline,
      url,
      source_name: source.name,
      published_at: null,
      signal_type: classify(text),
      category: source.category,
      summary,
      raw_excerpt: summary,
      relevance_score: score(text, null, source.category),
      status: "new",
      suggested_angle: suggestedAngle(text),
      notes: null,
      chatgpt_output: null,
      dedupe_key: dedupeKey,
    };

    if (isRelevant(signal)) signals.push(signal);
    if (signals.length >= 25) break;
  }

  return signals;
}

export async function scanSource(source: RadarSource): Promise<ScannedSignal[]> {
  if (source.source_type === "rss") return scanRssSource(source);
  if (source.source_type === "hackernews") return scanHackerNewsSource(source);
  if (source.source_type === "rwa_news" || source.url.includes("app.rwa.xyz/news")) return scanRwaNewsSource(source);
  if (source.source_type === "tac_research" || source.url.includes("tacoalition.org/research")) return scanTacResearchSource(source);
  if (source.source_type === "manual") return [];
  throw new Error(`${source.source_type} is a placeholder source type and is not implemented yet.`);
}
