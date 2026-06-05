import type { RadarSignal, StrategicAngle, TargetCompany } from "./radar-types";

const PROFILE = `User profile context: Joris Magenti is a strategy, operations, Chief of Staff, partnerships, venture build, digital assets/RWA, and trade finance operator. Relevant proof points include Symbridge employee #2/#3, regulated digital assets ecosystem work, SEC/FINRA BD/ATS work, NYDFS Trust application exposure, tokenized metals, custody/vendor coordination, fundraising and board materials, DASG digital asset/RWA advisory, HTR commodity/trade-finance structuring, Oxford MBA, Columbia entrepreneurship teaching, trilingual EN/ES/FR, and US/EU/LATAM operating background. Keep positioning truthful, conservative, and non-misleading. Do not imply inside information or overstate technical ownership.`;

function signalContext(signal?: Partial<RadarSignal> | null) {
  if (!signal) return "No specific signal provided.";
  return `Signal:\nCompany: ${signal.company || "Unknown"}\nHeadline: ${signal.headline || "Unknown"}\nSource: ${signal.source_name || "Unknown"}\nURL: ${signal.url || "No URL"}\nPublished: ${signal.published_at || "Unknown"}\nType: ${signal.signal_type || "Unknown"}\nSuggested angle: ${signal.suggested_angle || "None"}\nSummary: ${signal.summary || signal.raw_excerpt || "No summary"}`;
}

function targetContext(target?: Partial<TargetCompany> | null) {
  if (!target) return "No saved target provided.";
  return `Target company:\nCompany: ${target.company || "Unknown"}\nSector: ${target.sector || "Unknown"}\nStatus: ${target.target_status || "Unknown"}\nWhy interesting: ${target.why_interesting || "Not yet defined"}\nPain hypothesis: ${target.pain_hypothesis || "Not yet defined"}\nNotes: ${target.notes || "No notes"}`;
}

function angleContext(angle?: Partial<StrategicAngle> | null) {
  if (!angle) return "No strategic angle selected.";
  return `Strategic angle:\nName: ${angle.name || "Unknown"}\nBest-fit company: ${angle.best_fit_company || "Not specified"}\nPain hypothesis: ${angle.pain_hypothesis || "Not specified"}\nCredibility points: ${angle.credibility_points || "Not specified"}\nShort pitch: ${angle.short_pitch || "Not specified"}\nCTA: ${angle.cta || "Not specified"}`;
}

const RULES = `Rules: Use only public signal information and explicit assumptions. Make assumptions visible. Do not suggest automated outreach. Do not write as if I have inside information. Return a practical paste-back-ready output. Keep the output balanced: specific enough to create a strong follow-up conversation, but not so long that it becomes unusable.`;

export function buildRadarPrompt(type: string, input: { signal?: Partial<RadarSignal> | null; target?: Partial<TargetCompany> | null; angle?: Partial<StrategicAngle> | null }) {
  const context = `${PROFILE}\n\n${RULES}\n\n${signalContext(input.signal)}\n\n${targetContext(input.target)}\n\n${angleContext(input.angle)}`;
  if (type === "unposted_role") {
    return `${context}\n\nTask: Build a credible unposted role thesis for this company. Return: 1) likely company pain, 2) why now, 3) possible role title, 4) role thesis, 5) 30/60/90 day value plan, 6) why I am credible, 7) likely objections, 8) best person to contact, 9) short outreach note, 10) concise follow-up note.`;
  }
  if (type === "proposal_outreach") {
    return `${context}\n\nTask: Build a consulting/fractional proposal outreach angle. Return: 1) pain hypothesis, 2) proposed project scope, 3) 2-3 engagement formats, 4) deliverables, 5) why me, 6) short LinkedIn-style note, 7) short email, 8) follow-up message, 9) conservative version that avoids overclaiming.`;
  }
  if (type === "contact_strategy") {
    return `${context}\n\nTask: Build a manual contact strategy. Return: ideal contact titles, LinkedIn/company-site search terms to use manually, likely reporting lines, warm-intro strategy, cold outreach strategy, and a message angle for each contact type.`;
  }
  if (type === "strategic_angle") {
    return `${context}\n\nTask: Use the selected strategic angle and company signal to craft: 1) a 3-sentence thesis, 2) a 120-180 word outreach message, 3) a one-page engagement opener, 4) a clear CTA, 5) tone calibration notes.`;
  }
  if (type === "source_discovery") {
    return `${PROFILE}\n\nTask: Suggest public/free source URLs I can add to my private Opportunity Radar app to discover company signals. Focus on RSS feeds, public blogs, public startup/funding/product sources, venture blogs, fintech/RWA/tokenization/private markets/trade finance sources, and free public endpoints. Do not suggest paid APIs, LinkedIn scraping, or sources requiring hidden scraping. Return a table with source name, URL, category, source type, suggested keywords, and why it is useful.`;
  }
  return `${context}\n\nTask: Analyze whether this company/signal is worth pursuing. Return: company snapshot, why this signal matters, likely strategic priorities, possible hiring/advisory needs, fit for my background, suggested next action, risks/weak-fit indicators, and 3 suggested contact types.`;
}
