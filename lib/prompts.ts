import type { Opportunity } from "./database.types";

const MAX_ESSENTIAL_DESCRIPTION_CHARS = 3_800;

const IMPORTANT_SECTION_HEADERS = [
  "Overall Purpose",
  "Essential Functions",
  "Minimum Qualifications",
  "Preferred Qualifications",
  "The base pay scale",
];

const ALL_SECTION_HEADERS = [
  ...IMPORTANT_SECTION_HEADERS,
  "Physical Requirements",
  "Employee must be able",
  "Some of the Ways",
  "Healthcare Coverage",
  "401(k)",
  "Paid Time Off",
  "Pursuant to",
  "The above job description",
];

const KEYWORD_BANK = [
  "tokenization",
  "identity",
  "payments",
  "digital commerce",
  "e-commerce",
  "eCommerce",
  "wallet",
  "card tokenization",
  "authentication",
  "directory",
  "data platform",
  "platform services",
  "governance",
  "data standards",
  "risk controls",
  "regulatory",
  "privacy",
  "security",
  "financial institutions",
  "payment networks",
  "issuer processors",
  "merchants",
  "strategic technology partners",
  "product strategy",
  "roadmap",
  "agile",
  "design thinking",
  "executive presence",
  "cross-functional leadership",
  "people management",
  "Paze",
  "Zelle",
  "NFC",
  "agentic commerce",
];

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}\n\n[Excerpt truncated. The full job description is saved in the app.]`;
}

function findSection(text: string, header: string): string | null {
  const lowerText = text.toLowerCase();
  const start = lowerText.indexOf(header.toLowerCase());
  if (start === -1) return null;

  const nextStarts = ALL_SECTION_HEADERS
    .filter((candidate) => candidate.toLowerCase() !== header.toLowerCase())
    .map((candidate) => lowerText.indexOf(candidate.toLowerCase(), start + header.length))
    .filter((index) => index > start);

  const end = nextStarts.length ? Math.min(...nextStarts) : text.length;
  return text.slice(start, end).trim();
}

function buildEssentialDescription(jobDescription: string): string {
  const normalized = normalizeWhitespace(jobDescription);
  const sections = IMPORTANT_SECTION_HEADERS
    .map((header) => findSection(normalized, header))
    .filter((section): section is string => Boolean(section));

  const candidate = sections.length ? sections.join("\n\n") : normalized;
  return truncate(candidate, MAX_ESSENTIAL_DESCRIPTION_CHARS);
}

function detectKeywords(jobDescription: string): string {
  const lowerDescription = jobDescription.toLowerCase();
  const found = KEYWORD_BANK.filter((keyword) => lowerDescription.includes(keyword.toLowerCase()));
  return found.length ? Array.from(new Set(found)).join(", ") : "No obvious keywords detected automatically.";
}

export function buildShortOpportunityAnalysisPrompt(opportunity: Opportunity): string {
  const essentialDescription = buildEssentialDescription(opportunity.job_description);
  const detectedKeywords = detectKeywords(opportunity.job_description);
  const isExcerpt = opportunity.job_description.length > essentialDescription.length;

  return `You are my job-search strategy partner. Analyze this opportunity and help me decide whether and how to position myself. Do not apply, send emails, browse, or take action on my behalf.

Use a concise, practical answer. Ignore boilerplate benefits, physical requirements, equal-opportunity language, and generic company marketing unless directly relevant to fit, compensation, or interview strategy.

Company: ${opportunity.company}
Role: ${opportunity.role}
Location: ${opportunity.location ?? "Not listed"}
URL: ${opportunity.url ?? "Not provided"}
Status: ${opportunity.status}

Detected keywords:
${detectedKeywords}

Essential job description excerpt:
${essentialDescription}
${isExcerpt ? "\n\nNote: This is an excerpt. The full job description is saved in the app." : ""}

My notes:
${opportunity.notes ?? "None yet"}

Please return:
1. Fit score from 1-100 and whether I should prioritize this opportunity.
2. Concise opportunity summary.
3. Top requirements and keywords.
4. Likely hiring-manager priorities.
5. Resume tailoring suggestions, including which resume version to use.
6. Interview prep topics and likely objections about my candidacy.
7. A safe, manually-sendable outreach draft I can edit before using.`;
}

export function buildOpportunityAnalysisPrompt(opportunity: Opportunity): string {
  return `You are my job-search strategy partner. Analyze this opportunity and help me decide how to position myself. Do not apply, send emails, or browse on my behalf.

Company: ${opportunity.company}
Role: ${opportunity.role}
Location: ${opportunity.location ?? "Not listed"}
URL: ${opportunity.url ?? "Not provided"}
Status: ${opportunity.status}

Job description:
${opportunity.job_description}

My notes:
${opportunity.notes ?? "None yet"}

Please return:
1. A concise opportunity summary.
2. Top requirements and keywords.
3. Likely hiring-manager priorities.
4. Resume tailoring suggestions.
5. Interview prep topics.
6. A safe, manually-sendable outreach draft I can edit before using.`;
}
