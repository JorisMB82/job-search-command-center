import type { RadarSignal, StrategicAngle, TargetCompany } from "./radar-types";

const PROFILE = `User profile context: Joris Magenti is a strategy, operations, Chief of Staff, partnerships, venture build, digital assets/RWA, and trade finance operator. Relevant proof points include Symbridge employee #2/#3, regulated digital assets ecosystem work, SEC/FINRA BD/ATS work, NYDFS Trust application exposure, tokenized metals, custody/vendor coordination, fundraising and board materials, DASG digital asset/RWA advisory, HTR commodity/trade-finance structuring, Oxford MBA, Columbia entrepreneurship teaching, trilingual EN/ES/FR, and US/EU/LATAM operating background. Keep positioning truthful, conservative, and non-misleading. Do not imply inside information or overstate technical ownership.`;

function signalContext(signal?: Partial<RadarSignal> | null) {
  if (!signal) return "No specific signal provided.";
  return `Signal:\nCompany: ${signal.company || "Unknown"}\nHeadline: ${signal.headline || "Unknown"}\nSource: ${signal.source_name || "Unknown"}\nURL: ${signal.url || "No URL"}\nPublished: ${signal.published_at || "Unknown"}\nType: ${signal.signal_type || "Unknown"}\nSuggested angle: ${signal.suggested_angle || "None"}\nSummary: ${signal.summary || signal.raw_excerpt || "No summary"}`;
}

function targetContext(target?: Partial<TargetCompany> | null) {
  if (!target) return "No saved target provided.";
  return `Target company:\nCompany: ${target.company || "Unknown"}\nSector: ${target.sector || "Unknown"}\nStatus: ${target.target_status || "Unknown"}\nWhy interesting: ${target.why_interesting || "Not yet defined"}\nInitial angle / notes: ${target.proposal_angle || target.notes || "No notes"}`;
}

function angleContext(angle?: Partial<StrategicAngle> | null) {
  if (!angle) return "No strategic angle selected.";
  return `Selected strategic angle:\nName: ${angle.name || "Unknown"}\nBest-fit company: ${angle.best_fit_company || "Not specified"}\nPain hypothesis: ${angle.pain_hypothesis || "Not specified"}\nCredibility points: ${angle.credibility_points || "Not specified"}\nShort pitch: ${angle.short_pitch || "Not specified"}\nCTA: ${angle.cta || "Not specified"}`;
}

const RULES = `Rules: Use only the public signal and explicit assumptions. Do not do a deep company-intelligence report. Do not invent facts. Do not suggest automated outreach. Write as a practical value proposition I could adapt manually. Keep it concise, credible, and specific enough to justify a follow-up conversation.`;

export function buildRadarPrompt(type: string, input: { signal?: Partial<RadarSignal> | null; target?: Partial<TargetCompany> | null; angle?: Partial<StrategicAngle> | null }) {
  const context = `${PROFILE}\n\n${RULES}\n\n${signalContext(input.signal)}\n\n${targetContext(input.target)}\n\n${angleContext(input.angle)}`;
  if (type === "unposted_role") {
    return `${context}\n\nTask: Create a concise unposted-role value proposition, not a long research memo. Return: 1) one likely business pain, clearly marked as an assumption, 2) how I could help in 60-90 days, 3) a possible role/project title, 4) 3 proof points from my background, 5) a short LinkedIn-style note under 110 words, 6) a concise follow-up note.`;
  }
  if (type === "proposal_outreach") {
    return `${context}\n\nTask: Create a concise consulting/fractional engagement value proposition. Return: 1) assumed pain, 2) project I could help with, 3) 3 concrete deliverables, 4) why I am credible, 5) short LinkedIn-style note under 110 words, 6) short email under 160 words, 7) simple CTA.`;
  }
  if (type === "contact_strategy") {
    return `${context}\n\nTask: Create a light manual contact strategy. Return: 1) best 3 contact titles to search for manually, 2) why each is relevant, 3) one message angle for each, 4) the single best first contact path. Do not create a broad research plan.`;
  }
  if (type === "strategic_angle") {
    return `${context}\n\nTask: Apply the selected strategic angle to this target company and create a value-proposition outreach thesis. Return only: 1) one-sentence trigger based on the signal, 2) “I can help you…” value proposition, 3) 3 credibility proof points, 4) short LinkedIn-style note under 110 words, 5) short email under 160 words, 6) one simple CTA. Keep it conservative and non-misleading.`;
  }
  if (type === "source_discovery") {
    return `${PROFILE}\n\nTask: Suggest public/free source URLs I can add to my private Opportunity Radar app to discover company signals. Focus on RSS feeds, public blogs, public startup/funding/product sources, venture blogs, fintech/RWA/tokenization/private markets/trade finance sources, and free public endpoints. Do not suggest paid APIs, LinkedIn scraping, or sources requiring hidden scraping. Return a table with source name, URL, category, source type, suggested keywords, and why it is useful.`;
  }
  return `${context}\n\nTask: Create a concise value-proposition brief for this target. Return: 1) why the signal may matter, 2) assumed company need, 3) how I could help, 4) proof points, 5) short outreach note, 6) recommended next action. Do not write a full company research report.`;
}
