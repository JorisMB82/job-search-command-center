export type OpportunityStatus = "new" | "researching" | "applied" | "interviewing" | "offer" | "closed";

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
      };
      outreach_drafts: {
        Row: OutreachDraft;
        Insert: Partial<Pick<OutreachDraft, "id" | "created_at" | "updated_at">> & OutreachDraftInsert;
        Update: Partial<OutreachDraftInsert>;
      };
      resume_templates: {
        Row: ResumeTemplate;
        Insert: Partial<Pick<ResumeTemplate, "id" | "created_at" | "updated_at">> & ResumeTemplateInsert;
        Update: Partial<ResumeTemplateInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
