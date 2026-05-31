import { createHash } from "crypto";
import type { CaptTenderInput } from "./types";
import { getCaptConfig } from "./config";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    tenders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string" },
          title_ar: { type: "string" },
          title_en: { type: "string" },
          ministry: { type: "string" },
          tender_type: { type: "string" },
          published_date: { type: "string" },
          deadline_date: { type: "string" },
          detail_url: { type: "string" },
        },
        required: ["title_ar"],
      },
    },
  },
  required: ["tenders"],
};

type ExtractTender = {
  ref?: string;
  title_ar?: string;
  title_en?: string;
  ministry?: string;
  tender_type?: string;
  published_date?: string;
  deadline_date?: string;
  detail_url?: string;
};

function slugRef(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function parseDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeExtracted(items: ExtractTender[], baseUrl: string): CaptTenderInput[] {
  const out: CaptTenderInput[] = [];

  for (const item of items) {
    const title = item.title_ar?.trim() || item.title_en?.trim();
    if (!title || title.length < 5) continue;

    let detailUrl = item.detail_url?.trim() || baseUrl;
    if (detailUrl.startsWith("/")) {
      detailUrl = `https://capt.gov.kw${detailUrl}`;
    }

    const ref =
      item.ref?.trim() ||
      slugRef(`${title}|${item.deadline_date ?? ""}|${detailUrl}`);

    out.push({
      external_ref: ref,
      title_ar: item.title_ar?.trim() || title,
      title_en: item.title_en?.trim() || null,
      ministry_name: item.ministry?.trim() || null,
      tender_type: item.tender_type?.trim() || null,
      published_at: parseDate(item.published_date),
      deadline_at: parseDate(item.deadline_date),
      detail_url: detailUrl,
      raw_data: item as Record<string, unknown>,
    });
  }

  return out;
}

async function fetchViaFirecrawl(url: string, apiKey: string): Promise<CaptTenderInput[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      onlyMainContent: true,
      waitFor: 5000,
      timeout: 60000,
      extract: {
        prompt:
          "Extract every open public tender on this Kuwait CAPT (Central Agency for Public Tenders) page. For each tender include: reference number (ref), Arabic title (title_ar), English title if shown (title_en), ministry or agency (ministry), tender type (tender_type), publish date (published_date), closing deadline (deadline_date), and full detail URL (detail_url). Skip navigation links and closed tenders.",
        schema: EXTRACT_SCHEMA,
      },
    }),
  });

  const body = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: { extract?: { tenders?: ExtractTender[] } };
  };

  if (!res.ok || !body.success) {
    const detail = body.error ?? `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Firecrawl auth failed — check FIRECRAWL_API_KEY: ${detail}`);
    }
    if (res.status === 402 || detail.toLowerCase().includes("credit")) {
      throw new Error(`Firecrawl credits exhausted: ${detail}`);
    }
    throw new Error(`Firecrawl scrape failed: ${detail}`);
  }

  const tenders = body.data?.extract?.tenders ?? [];
  return normalizeExtracted(tenders, url);
}

export async function fetchCaptTenders(): Promise<{
  tenders: CaptTenderInput[];
  source: "firecrawl" | "none";
}> {
  const config = getCaptConfig();
  if (!config.enabled) {
    return { tenders: [], source: "none" };
  }

  if (!config.isFirecrawlConfigured) {
    throw new Error(
      "FIRECRAWL_API_KEY is required. Create a free account at https://firecrawl.dev and add the key to Vercel."
    );
  }

  const tenders = await fetchViaFirecrawl(config.tendersUrl, config.firecrawlKey);
  return { tenders, source: "firecrawl" };
}
