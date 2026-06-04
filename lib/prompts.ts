import type { Opportunity, ResumeTemplate } from "./database.types";

const MAX_ESSENTIAL_DESCRIPTION_CHARS = 3_800;
const MAX_RESUME_CHARS = 8_000;

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

function truncate(value: string, maxChars: number, label = "source text"): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}\n\n[Excerpt truncated. The full ${label} is saved in the app.]`;
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
  return truncate(candidate, MAX_ESSENTIAL_DESCRIPTION_CHARS, "job description");
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

  return `You are my job-search strategy partner. Analyze this opportunity and return one concise, paste-back-ready INTERVIEW PREP BRIEF that I can copy directly into my job-search app notes.

Do not apply, send emails, browse, or take action on my behalf. Ignore boilerplate benefits, physical requirements, equal-opportunity language, and generic company marketing unless directly relevant to fit, compensation, or interview strategy.

Company: ${opportunity.company}
Role: ${opportunity.role}
Location: ${opportunity.location ?? "Not listed"}
URL: ${opportunity.url ?? "Not provided"}
Status: ${opportunity.status}
Role bucket: ${opportunity.role_bucket}
Priority: ${opportunity.priority}
Next action date: ${opportunity.next_action_date ?? "Not set"}
Network notes: ${opportunity.network_notes ?? "None yet"}

Detected keywords:
${detectedKeywords}

Essential job description excerpt:
${essentialDescription}
${isExcerpt ? "\n\nNote: This is an excerpt. The full job description is saved in the app." : ""}

My existing notes:
${opportunity.notes ?? "None yet"}

Please return the answer in this exact structure so I can paste it back into the app:

INTERVIEW PREP BRIEF — ${opportunity.company} / ${opportunity.role}

1. ROLE THESIS
- 2-3 lines on what this role really is and what the company likely needs.

2. MY POSITIONING
- 3-5 bullets on how I should position my background.

3. WHY I FIT
- 4-6 bullets connecting my likely strengths to this role.

4. LIKELY CONCERNS / OBJECTIONS
- 3-5 likely concerns the interviewer may have, with a short response strategy for each.

5. 90-DAY VALUE STORY
- A practical 30/60/90-day outline I can say out loud.

6. QUESTIONS TO ASK
- 8-10 sharp questions for the interviewer, prioritized by importance.

7. TALKING POINTS TO REMEMBER
- 5 concise phrases or points I should keep in front of me during the call.

8. FOLLOW-UP EMAIL DRAFT
- A short, safe, manually-sendable follow-up email draft I can edit before sending.

9. NEXT ACTION
- One specific next action I should take in the app after the call.`;
}

export function buildResumeTailoringPrompt(opportunity: Opportunity, resumeTemplate: ResumeTemplate): string {
  const essentialDescription = buildEssentialDescription(opportunity.job_description);
  const detectedKeywords = detectKeywords(opportunity.job_description);
  const resumeContent = truncate(normalizeWhitespace(resumeTemplate.content), MAX_RESUME_CHARS, "resume template");

  return `You are my resume tailoring partner. Compare this job opportunity against the selected resume template and return practical, manual resume-editing guidance. Do not invent experience I do not have. Do not apply or send anything on my behalf.

Opportunity:
Company: ${opportunity.company}
Role: ${opportunity.role}
Location: ${opportunity.location ?? "Not listed"}
URL: ${opportunity.url ?? "Not provided"}
Role bucket: ${opportunity.role_bucket}
Priority: ${opportunity.priority}
Status: ${opportunity.status}

Detected job keywords:
${detectedKeywords}

Job description excerpt:
${essentialDescription}

Selected resume template:
${resumeTemplate.name}

Resume text:
${resumeContent}

Existing opportunity notes / prep notes:
${opportunity.notes ?? "None yet"}

Please return a concise RESUME TAILORING BRIEF in this exact structure:

RESUME TAILORING BRIEF — ${opportunity.company} / ${opportunity.role}

1. BEST RESUME VERSION
- Confirm whether this is the right resume template for the role, and explain briefly.

2. FIT SCORE
- Score from 1-100 and one short explanation.

3. 5 POINTS TO ADD OR EMPHASIZE
- Five specific themes, keywords, or achievements from the job description that should be added or made more visible in the resume.

4. 5 POINTS TO REDUCE OR REMOVE
- Five items that are less relevant for this role and can be shortened, moved down, or removed to make room.

5. SUMMARY / PROFILE EDIT
- Suggest a revised resume summary/profile paragraph using only truthful positioning.

6. EXPERIENCE BULLET EDITS
- Suggest 6-10 bullet edits or bullet themes, grouped by likely resume section or prior role.

7. KEYWORDS TO INCLUDE NATURALLY
- List the highest-value keywords to include without keyword stuffing.

8. APPLICATION POSITIONING
- A short positioning paragraph I can keep in mind when submitting the application.

9. CAUTION
- Any claims I should avoid because they are not clearly supported by the resume text.`;
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
