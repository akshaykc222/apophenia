import { normalizeArabicLabel } from "@/lib/reference/extract-entities";
import { CANONICAL_CATEGORIES } from "@/lib/reference/canonical-categories";

export interface ReferenceCatalog {
  categories: string[];
  ministries: string[];
  tender_categories: string[];
}

const DEFAULT_CATALOG: ReferenceCatalog = {
  categories: CANONICAL_CATEGORIES.map((c) => c.name_ar),
  ministries: [],
  tender_categories: ["خدمات", "إنشاءات", "استشارات", "توريد"],
};

export async function extractReferenceCatalogWithLlm(
  sampleText: string
): Promise<ReferenceCatalog> {
  if (
    process.env.ENABLE_LLM_EXTRACTION !== "true" ||
    !process.env.OPENAI_API_KEY
  ) {
    return DEFAULT_CATALOG;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You analyze Kuwait Today (كويت اليوم) official gazette Arabic text.
Return JSON only:
{
  "categories": ["الوزارات", "الاستدراكات", "الأحكام والمراسيم", ...],
  "ministries": ["وزارة ...", "هيئة ...", "مجلس ...", ...],
  "tender_categories": ["خدمات", "إنشاءات", "استشارات", "توريد", ...]
}
List every distinct category tab, issuing body, and tender type you can identify. Use Arabic names only. Max 40 ministries.`,
          },
          {
            role: "user",
            content: sampleText.slice(0, 12000),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return DEFAULT_CATALOG;

    const data = await res.json();
    const parsed = JSON.parse(
      data.choices?.[0]?.message?.content ?? "{}"
    ) as Partial<ReferenceCatalog>;

    return {
      categories: DEFAULT_CATALOG.categories,
      ministries: dedupeLabels(parsed.ministries ?? []),
      tender_categories: dedupeLabels([
        ...DEFAULT_CATALOG.tender_categories,
        ...(parsed.tender_categories ?? []),
      ]),
    };
  } catch {
    return DEFAULT_CATALOG;
  }
}

function dedupeLabels(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const label = normalizeArabicLabel(String(item));
    if (!label || label.length < 2) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
