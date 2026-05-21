export type ExtractionStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type DraftStatus = "suggested" | "accepted" | "rejected";

export type ContentType = "article" | "tender" | "decree" | "addendum";

export type IssueFrequency = "daily" | "weekly";

export interface Category {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  sort_order: number;
  badge_emoji: string | null;
  is_trending: boolean;
  created_at: string;
}

export interface Ministry {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface TenderCategory {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface PdfIssue {
  id: string;
  issue_date: string;
  frequency: IssueFrequency;
  storage_path: string;
  original_filename: string | null;
  page_count: number | null;
  file_size_bytes: number | null;
  extraction_status: ExtractionStatus;
  extraction_progress: number;
  error_message: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentDraft {
  id: string;
  issue_id: string;
  content_type: ContentType;
  category_id: string | null;
  ministry_id: string | null;
  tender_category_id: string | null;
  title_ar: string | null;
  summary_ar: string | null;
  body_ar: string | null;
  page_start: number | null;
  page_end: number | null;
  raw_extracted_text: string | null;
  confidence_score: number | null;
  status: DraftStatus;
  tags: string[] | null;
  source_name: string | null;
  source_logo_url: string | null;
  is_featured: boolean;
  deadline_at: string | null;
  application_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  issue_id: string | null;
  draft_id: string | null;
  content_type: ContentType;
  category_id: string | null;
  ministry_id: string | null;
  tender_category_id: string | null;
  title_ar: string;
  summary_ar: string | null;
  body_ar: string | null;
  slug: string;
  search_text: string | null;
  tags: string[] | null;
  source_name: string | null;
  source_logo_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  deadline_at: string | null;
  application_url: string | null;
  page_start: number | null;
  page_end: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}
