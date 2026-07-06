export type RadarSourceType =
  | "rss"
  | "atom"
  | "wellfound"
  | "builtin"
  | "manual";

export interface RadarSource {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  url: string;
  source_type: RadarSourceType;
  category: string;
  keywords: string[];
  is_active: boolean;
  last_scanned_at: string | null;
  last_error: string | null;
}

export interface RadarSignal {
  id: string;
  created_at: string;
  updated_at: string;
  source_id: string;
  source_name: string;
  headline: string;
  company: string | null;
  url: string;
  summary: string | null;
  published_at: string | null;
  signal_type: string;
  category: string;
  relevance_score: number;
  suggested_angle: string | null;
  status: "new" | "saved" | "dismissed" | "converted";
}

export type RadarSignalInsert = Omit<RadarSignal, "id" | "created_at" | "updated_at">;

export interface StarterSource {
  name: string;
  url: string;
  source_type: RadarSourceType;
  category: string;
  keywords: string[];
  is_active: boolean;
}

export const STARTER_JOB_SOURCES: StarterSource[] = [
  {
    name: "Crypto Jobs List",
    url: "https://cryptojobslist.com/rss.xml",
    source_type: "rss",
    category: "Digital Assets / Web3",
    keywords: ["strategy", "operations", "chief of staff", "head of", "business development", "partnerships", "growth", "director", "vp"],
    is_active: true,
  },
  {
    name: "Web3.career",
    url: "https://web3.career/rss",
    source_type: "rss",
    category: "Digital Assets / Web3",
    keywords: ["strategy", "operations", "head of", "business development", "partnerships", "chief of staff", "director"],
    is_active: true,
  },
  {
    name: "Wellfound — Strategy & Ops (NYC / Remote)",
    url: "strategy operations new york remote",
    source_type: "wellfound",
    category: "Startup / Early Stage",
    keywords: ["strategy", "operations", "chief of staff", "business development", "partnerships", "fintech", "crypto"],
    is_active: false,
  },
  {
    name: "Wellfound — Crypto & Web3",
    url: "crypto web3 blockchain operations strategy",
    source_type: "wellfound",
    category: "Digital Assets / Web3",
    keywords: ["strategy", "operations", "head of", "director", "partnerships", "business development"],
    is_active: false,
  },
  {
    name: "Builtin NYC — Fintech Jobs",
    url: "https://www.builtinnyc.com/jobs/finance",
    source_type: "builtin",
    category: "Fintech / NYC",
    keywords: ["strategy", "operations", "chief of staff", "director", "vp", "partnerships", "growth"],
    is_active: false,
  },
  {
    name: "Pallet — Fintech RSS",
    url: "https://pallet.xyz/list/fintech-jobs/jobs.rss",
    source_type: "rss",
    category: "Fintech / Startup",
    keywords: ["strategy", "operations", "business development", "director", "chief of staff"],
    is_active: false,
  },
];
