export type CaptTenderStatus = "open" | "expired";

export type CaptTenderInput = {
  external_ref: string;
  title_ar: string;
  title_en?: string | null;
  ministry_name?: string | null;
  tender_type?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  detail_url?: string | null;
  raw_data?: Record<string, unknown>;
};

export type CaptSyncResult = {
  ok: boolean;
  fetched: number;
  inserted: number;
  updated: number;
  marked_not_latest: number;
  expired: number;
  error?: string;
  source: "firecrawl" | "none";
};

export type CaptTenderRow = {
  id: string;
  external_ref: string;
  title_ar: string;
  title_en: string | null;
  ministry_name: string | null;
  tender_type: string | null;
  published_at: string | null;
  deadline_at: string | null;
  detail_url: string | null;
  status: CaptTenderStatus;
  is_latest: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
};
