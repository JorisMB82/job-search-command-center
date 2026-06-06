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

function notesForPrompt(opportunity: Opportunity): string {
  const parts = [
    ["Interview prep notes", opportunity.interview_prep_notes],
    ["Resume tailoring notes", opportunity.resume_tailoring_notes],
    ["General / call notes", opportunity.general_notes ?? opportunity.notes],
    ["Legacy notes", opportunity.notes],
  ].filter(([, value]) => typeof value === "string" && value.trim().length > 0);

  if (!parts.length) return "None yet";
  return parts.map(([label, value]) => `${label}:\n${value}`).join("\n\n");
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

My existing app notes:
${notesForPrompt(opportunity)}

Please return the answer in this exact structure so I can paste it into the Interview Prep Notes box:

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

Existing app notes:
${notesForPrompt(opportunity)}

Please return a concise RESUME TAILORING BRIEF in this exact structure so I can paste it into the Resume Tailoring Notes box:

RESUME TAILORING BRIEF — ${opportunity.company} / ${opportunity.role}

1. SELECTED RESUME FIT CHECK
- Confirm whether the selected resume template fits this role well enough to tailor, and explain briefly. Do not imply that you compared against other resume versions.

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

export function buildOutreachDraftPrompt(opportunity: Opportunity, resumeTemplate: ResumeTemplate | null): string {
  const essentialDescription = buildEssentialDescription(opportunity.job_description);
  const detectedKeywords = detectKeywords(opportunity.job_description);
  const resumeContext = resumeTemplate
    ? `Selected resume template: ${resumeTemplate.name}\n\nResume text:\n${truncate(normalizeWhitespace(resumeTemplate.content), MAX_RESUME_CHARS, "resume template")}`
    : "No matching saved resume template was found. Use only the job description and app notes; do not invent resume details.";

  return `You are my job-search outreach writing partner. Draft a concise, manually-sendable outreach message for this opportunity. Do not apply, send, browse, or take action on my behalf. Do not invent experience, relationships, referrals, metrics, or company knowledge that is not supported by the context below.

Goal:
Create a strong outreach draft that I can paste back into my private job-search app, edit if needed, and manually send later.

Opportunity:
Company: ${opportunity.company}
Role: ${opportunity.role}
Location: ${opportunity.location ?? "Not listed"}
URL: ${opportunity.url ?? "Not provided"}
Status: ${opportunity.status}
Role bucket: ${opportunity.role_bucket}
Priority: ${opportunity.priority}
Network notes: ${opportunity.network_notes ?? "None yet"}

Detected job keywords:
${detectedKeywords}

Job description excerpt:
${essentialDescription}

${resumeContext}

My saved app notes and ChatGPT feedback:
${notesForPrompt(opportunity)}

Please return the answer in this exact structure:

OUTREACH DRAFT — ${opportunity.company} / ${opportunity.role}

1. BEST ANGLE
- One sentence explaining the outreach angle I should use.

2. SUBJECT OPTIONS
- Give 3 short email subject lines.

3. EMAIL DRAFT
- Write a concise email of 120-170 words.
- Make it specific to the company and role.
- Sound senior, direct, and practical.
- Do not sound desperate, generic, overpromotional, or overly familiar.
- Include one clear call to action.
- Use placeholders like [Name] only where needed.

4. LINKEDIN / SHORT MESSAGE VERSION
- Write a version under 450 characters.

5. CAUTIONS
- List any claims I should avoid or verify before sending.

6. APP NEXT STEP
- Tell me exactly what to paste into the Subject and Body fields of the app's Save Outreach Draft section.`;
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

My app notes:
${notesForPrompt(opportunity)}

Please return a concise GENERAL OPPORTUNITY ANALYSIS that I can paste into General / Call Notes:
1. A concise opportunity summary.
2. Top requirements and keywords.
3. Likely hiring-manager priorities.
4. My likely strongest positioning.
5. Gaps or concerns.
6. Suggested next action.`;
}
