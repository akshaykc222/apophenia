import type { ContentType } from "@/lib/types/database";

const VALID: ContentType[] = ["article", "tender", "decree", "addendum"];

/** Map LLM / free-text values to Postgres content_type enum. */
export function normalizeContentType(
  value: unknown,
  fallback: ContentType = "article"
): ContentType {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const key = value.trim().toLowerCase();

  if (VALID.includes(key as ContentType)) {
    return key as ContentType;
  }

  const aliases: Record<string, ContentType> = {
    gazette: "article",
    "kuwait today": "article",
    news: "article",
    update: "article",
    announcement: "article",
    ministry: "article",
    ministries: "article",
    article: "article",
    مناقصة: "tender",
    tender: "tender",
    auction: "tender",
    bid: "tender",
    decree: "decree",
    law: "decree",
    judgment: "decree",
    judgement: "decree",
    قرار: "decree",
    مرسوم: "decree",
    addendum: "addendum",
    correction: "addendum",
    استدراك: "addendum",
  };

  if (aliases[key]) return aliases[key];

  if (key.includes("tender") || key.includes("مناقص") || key.includes("مزاد")) {
    return "tender";
  }
  if (key.includes("decree") || key.includes("مرسوم") || key.includes("حكم")) {
    return "decree";
  }
  if (key.includes("addendum") || key.includes("استدراك")) {
    return "addendum";
  }

  return fallback;
}
