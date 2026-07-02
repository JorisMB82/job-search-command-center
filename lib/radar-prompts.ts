import type { RadarSignal, StrategicAngle, TargetCompany } from "./radar-types";

const PROFILE = `User profile context: Joris Magenti is a strategy, operations, Chief of Staff, partnerships, venture build, digital assets/RWA, and trade finance operator. Relevant proof points include Symbridge employee #2/#3, regulated digital assets ecosystem work, SEC/FINRA BD/ATS work, NYDFS Trust application exposure, tokenized metals, custody/vendor coordination, fundraising and board materials, DASG digital asset/RWA advisory, HTR commodity/trade-finance structuring, Oxford MBA, Columbia entrepreneurship teaching, trilingual EN/ES/FR, and US/EU/LATAM operating background. Keep positioning truthful, conservative, and non-misleading. Do not imply inside information or overstate technical ownership.`;

function signalContext(signal?: Partial<RadarSignal> | null) {
  if (!signal) return "No specific signal provided.";
  return `Signal:\nCompany: ${signal.company || "Unknown"}\nHeadline: ${signal.headline || "Unknown"}\nSource: ${signal.source_name || "Unknown"}\nURL: ${signal.url || "No URL"}\nPublished: ${signal.published_at || "Unknown"}\nType: ${signal.signal_type || "Unknown"}\nRadar score: ${signal.fit_score ?? signal.relevance_score ?? "Unknown"}\nRecommended action: ${signal.recommended_action || "Not set"}\nRecommended resume template: ${signal.recommended_resume_template || "Not set"}\nSuggested angle: ${signal.suggested_angle || "None"}\nSummary: ${signal.summary || signal.raw_excerpt || "No summary"}\nNotes: ${signal.notes || "No notes"}`;
}

function targetContext(target?: Partial<TargetCompany> | null) {
  if (!target) return "No saved target provided.";
  return `Target company:\nCompany: ${target.company || "Unknown"}\nSector: ${target.sector || "Unknown"}\nStatus: ${target.target_status || "Unknown"}\nFit score: ${target.fit_score ?? "Not scored"}\nRecommended action: ${target.recommended_action || "Not set"}\nSelected resume template: ${target.selected_resume_template || "Not set"}\nMessage type: ${target.message_type || "Not set"}\nWhy interesting: ${target.why_interesting || "Not yet defined"}\nFit thesis: ${target.fit_thesis || "Not yet defined"}\nRisks / concerns: ${target.risk_notes || "Not yet defined"}\nInitial angle / notes: ${target.proposal_angle || target.notes || "No notes"}`;
}

function angleContext(angle?: Partial<StrategicAngle> | null) {
  if (!angle) return "No strategic angle selected.";
  return `Selected strategic angle:\nName: ${angle.name || "Unknown"}\nBest-fit company: ${angle.best_fit_company || "Not specified"}\nPain hypothesis: ${angle.pain_hypothesis || "Not specified"}\nCredibility points: ${angle.credibility_points || "Not specified"}\nShort pitch: ${angle.short_pitch || "Not specified"}\nCTA: ${angle.cta || "Not specified"}`;
}

const RULES = `Rules: Use only the public signal and explicit assumptions. Do not do a deep company-intelligence report. Do not invent facts. Do not suggest automated outreach. Write as a practical value proposition I could adapt manually. Keep it concise, credible, and specific enough to justify a follow-up conversation.

Outreach tone rules: Write outreach as someone reaching out from the outside, not as a peer already in the room. Be humble but credible. Avoid overconfident phrases, heavy consultant language, and overly structured AI-sounding prose. Prefer natural language such as "may be relevant," "would be glad to compare notes," and "would appreciate a brief conversation if useful." Make the CTA soft and respectful.`;

const OUTREACH_OUTPUT_RULES = `For any outreach section, make it natural, lightly personalized, and manually sendable. Include both: (a) a short email-style note, and (b) a very brief LinkedIn note of 300 characters or fewer.`;

const SCORING_RULES = `Use this scoring frame when asked to evaluate fit: role fit 25, sector fit 20, seniority fit 15, Joris edge 20, network/access angle 10, timing/urgency 10. Recommend one action only: apply, message, monitor, or ignore. Keep the recommendation realistic and conservative.`;

export function buildRadarPrompt(type: string, input: { signal?: Partial<RadarSignal> | null; target?: Partial<TargetCompany> | null; angle?: Partial<StrategicAngle> | null }) {
  const context = `${PROFILE}\n\n${RULES}\n\n${SCORING_RULES}\n\n${signalContext(input.signal)}\n\n${targetContext(input.target)}\n\n${angleContext(input.angle)}`;
  if (type === "application_prep") {
    return `${context}\n\nTask: Prepare a manual application package for this opportunity. Return only: 1) final action recommendation with a 0-100 fit score, 2) short fit thesis, 3) concerns / risks, 4) recommended resume version, 5) 5 resume-positioning bullets I can adapt, 6) short cover-note or application-message draft under 150 words, 7) LinkedIn note under 300 characters, 8) next action and follow-up timing. Do not invent facts about the company.`;
  }
  if (type === "weekly_review") {
    return `${context}\n\nTask: Act as my human-in-the-loop job-search radar reviewer. Create a concise review plan for this signal/target. Return: 1) score breakdown using the scoring frame, 2) apply/message/monitor/ignore recommendation, 3) best positioning angle, 4) resume template to use, 5) one manual research question to answer before outreach, 6) one draft outreach note if action is apply or message, 7) next action.`;
  }
  if (type === "unposted_role") {
    return `${context}\n\nTask: Create a concise unposted-role value proposition, not a long research memo. ${OUTREACH_OUTPUT_RULES} Return: 1) one likely business pain, clearly marked as an assumption, 2) how I could help in 60-90 days, 3) a possible role/project title, 4) 3 proof points from my background, 5) short email-style outreach note under 130 words, 6) very brief LinkedIn note under 300 characters, 7) concise follow-up note.`;
  }
  if (type === "proposal_outreach") {
    return `${context}\n\nTask: Create a concise consulting/fractional engagement value proposition. ${OUTREACH_OUTPUT_RULES} Return: 1) assumed pain, 2) project I could help with, 3) 3 concrete deliverables, 4) why I am credible, 5) short email-style outreach note under 130 words, 6) very brief LinkedIn note under 300 characters, 7) short email under 160 words, 8) simple soft CTA.`;
  }
  if (type === "contact_strategy") {
    return `${context}\n\nTask: Create a light manual contact strategy. Return: 1) best 3 contact titles to search for manually, 2) why each is relevant, 3) one message angle for each, 4) the single best first contact path. Do not create a broad research plan.`;
  }
  if (type === "strategic_angle") {
    return `${context}\n\nTask: Apply the selected strategic angle to this target company and create a value-proposition outreach thesis. ${OUTREACH_OUTPUT_RULES} Return only: 1) one-sentence trigger based on the signal, 2) "I may be able to help with..." value proposition, 3) 3 credibility proof points, 4) short email-style outreach note under 130 words, 5) very brief LinkedIn note under 300 characters, 6) short email under 160 words, 7) one simple soft CTA. Keep it conservative and non-misleading.`;
  }
  if (type === "source_discovery") {
    return `${PROFILE}\n\nTask: Suggest public/free source URLs I can add to my private Opportunity Radar app to discover company signals. Focus on RSS feeds, public blogs, public startup/funding/product sources, venture blogs, fintech/RWA/tokenization/private markets/trade finance sources, and free public endpoints. Do not suggest paid APIs, LinkedIn scraping, or sources requiring hidden scraping. Return a table with source name, URL, category, source type, suggested keywords, recommended scan frequency, priority, and why it is useful.`;
  }
  return `${context}\n\nTask: Create a concise value-proposition brief for this target. ${OUTREACH_OUTPUT_RULES} Return: 1) why the signal may matter, 2) assumed company need, 3) how I could help, 4) proof points, 5) short email-style outreach note under 130 words, 6) very brief LinkedIn note under 300 characters, 7) recommended next action. Do not write a full company research report.`;
}
