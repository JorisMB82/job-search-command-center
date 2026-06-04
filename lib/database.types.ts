export const ROLE_BUCKETS = [
  "General Strategy & Operations",
  "Chief of Staff",
  "Digital Assets / RWA",
  "Venture Builder / Startup Operator",
  "Partnerships / Corporate Development",
] as const;

export const OPPORTUNITY_PRIORITIES = ["high", "medium", "low"] as const;

export const OPPORTUNITY_STATUSES = [
  "new",
  "selected",
  "researching",
  "applied",
  "outreach_drafted",
  "outreach_sent",
  "follow_up_due",
  "interviewing",
  "offer",
  "rejected",
  "closed",
] as const;

export type RoleBucket = (typeof ROLE_BUCKETS)[number];
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const ROLE_BUCKET_LABELS: Record<RoleBucket, string> = {
  "General Strategy & Operations": "General Strategy & Operations",
  "Chief of Staff": "Chief of Staff",
  "Digital Assets / RWA": "Digital Assets / RWA",
  "Venture Builder / Startup Operator": "Venture Builder / Startup Operator",
  "Partnerships / Corporate Development": "Partnerships / Corporate Development",
};

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  new: "New / Identified",
  selected: "Selected",
  researching: "Researching",
  applied: "Applied",
  outreach_drafted: "Outreach drafted",
  outreach_sent: "Outreach sent",
  follow_up_due: "Follow-up due",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  closed: "Closed / Archived",
};

export type Opportunity = {
  id: string;
  created_at: string;
  updated_at: string;
  company: string;
  role: string;
  location: string | null;
  url: string | null;
  status: OpportunityStatus;
  job_description: string;
  notes: string | null;
  interview_prep_notes: string | null;
  resume_tailoring_notes: string | null;
  general_notes: string | null;
  role_bucket: RoleBucket;
  priority: OpportunityPriority;
  is_pinned: boolean;
  listing_posted_date: string | null;
  next_action_date: string | null;
  network_notes: string | null;
  source: string | null;
};

export type OpportunityInsert = Omit<Opportunity, "id" | "created_at" | "updated_at">;
export type OpportunityUpdate = Partial<OpportunityInsert>;

export type OutreachDraft = {
  id: string;
  created_at: string;
  updated_at: string;
  opportunity_id: string;
  recipient: string | null;
  channel: string;
  subject: string | null;
  body: string;
};

export type OutreachDraftInsert = Omit<OutreachDraft, "id" | "created_at" | "updated_at">;

export type ResumeTemplate = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  content: string;
  notes: string | null;
};

export type ResumeTemplateInsert = Omit<ResumeTemplate, "id" | "created_at" | "updated_at">;

export type Database = {
  public: {
    Tables: {
      opportunities: {
        Row: Opportunity;
        Insert: Partial<Pick<Opportunity, "id" | "created_at" | "updated_at">> & OpportunityInsert;
        Update: OpportunityUpdate;
        Relationships: [];
      };
      outreach_drafts: {
        Row: OutreachDraft;
        Insert: Partial<Pick<OutreachDraft, "id" | "created_at" | "updated_at">> & OutreachDraftInsert;
        Update: Partial<OutreachDraftInsert>;
        Relationships: [];
      };
      resume_templates: {
        Row: ResumeTemplate;
        Insert: Partial<Pick<ResumeTemplate, "id" | "created_at" | "updated_at">> & ResumeTemplateInsert;
        Update: Partial<ResumeTemplateInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
