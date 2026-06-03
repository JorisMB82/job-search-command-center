import type { Opportunity } from "./database.types";

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
