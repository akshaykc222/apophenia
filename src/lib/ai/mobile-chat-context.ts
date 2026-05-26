import type { SupabaseClient } from "@supabase/supabase-js";

const TENDER_QUESTION_PATTERNS = [
  /مناقص[ةه]?/iu,
  /\btender\b/i,
  /أفضل\s+مناقص/iu,
  /best\s+tender/i,
  /تسجيل|register/i,
  /شركة\s+تقن|technical\s+company/i,
  /أنسب|يناسب|أقدر\s+أقدم|أقدم\s+على/i,
  /مناقصات\s+تناسب/i,
];

export function isTenderRelatedQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return TENDER_QUESTION_PATTERNS.some((p) => p.test(t));
}

interface TenderRow {
  title_ar: string | null;
  summary_ar: string | null;
  published_at: string | null;
  deadline_at: string | null;
  application_url: string | null;
  slug: string | null;
  ministry: { name_ar: string } | { name_ar: string }[] | null;
  tender_category: { name_ar: string } | { name_ar: string }[] | null;
}

function relName(
  rel: { name_ar: string } | { name_ar: string }[] | null | undefined
): string {
  if (!rel) return "";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name_ar?.trim() ?? "";
}

function searchTermsFromQuery(query: string): string[] {
  const t = query.toLowerCase();
  const terms = new Set<string>();
  if (/تقن|technical/i.test(t)) {
    terms.add("تقني");
    terms.add("تقنية");
    terms.add("technical");
    terms.add("استشارات");
    terms.add("خدمات");
  }
  if (/إنشاء|construction/i.test(t)) terms.add("إنشاء");
  if (/توريد|supply/i.test(t)) terms.add("توريد");
  const words = query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  words.forEach((w) => terms.add(w));
  return [...terms].slice(0, 8);
}

export async function fetchTenderContextBlock(
  supabase: SupabaseClient,
  userQuery: string,
  limit = 15
): Promise<string> {
  const { data, error } = await supabase
    .from("content_items")
    .select(
      "title_ar, summary_ar, published_at, deadline_at, application_url, slug, ministry:ministries(name_ar), tender_category:tender_categories(name_ar)"
    )
    .eq("is_published", true)
    .eq("content_type", "tender")
    .order("published_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("mobile-chat tender fetch:", error.message);
    return "";
  }

  const rows = (data ?? []) as TenderRow[];
  if (rows.length === 0) {
    return "لا توجد مناقصات منشورة حالياً في التطبيق.";
  }

  const terms = searchTermsFromQuery(userQuery);
  const scored = rows.map((row) => {
    const blob = [
      row.title_ar,
      row.summary_ar,
      relName(row.ministry),
      relName(row.tender_category),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (blob.includes(term.toLowerCase())) score += 2;
    }
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score || 0);
  const picked =
    scored.some((s) => s.score > 0)
      ? scored.filter((s) => s.score > 0).slice(0, limit)
      : scored.slice(0, limit);

  const lines = picked.map(({ row }, i) => {
    const ministry = relName(row.ministry);
    const category = relName(row.tender_category);
    const deadline = row.deadline_at
      ? `آخر موعد: ${row.deadline_at.slice(0, 10)}`
      : "";
    const link = row.application_url?.trim()
      ? `رابط التقديم: ${row.application_url.trim()}`
      : "";
    const parts = [
      `${i + 1}. ${row.title_ar ?? "بدون عنوان"}`,
      ministry ? `الجهة: ${ministry}` : "",
      category ? `التصنيف: ${category}` : "",
      deadline,
      link,
      row.summary_ar ? `ملخص: ${row.summary_ar.slice(0, 200)}` : "",
    ].filter(Boolean);
    return parts.join(" | ");
  });

  return `مناقصات منشورة في التطبيق (استخدمها فقط — لا تخترع):\n${lines.join("\n")}`;
}

export function buildSystemPromptWithContext(tenderContext: string): string {
  if (!tenderContext) return "";
  return `

---
بيانات من قاعدة التطبيق (مناقصات منشورة):
${tenderContext}

عند سؤال المستخدم عن مناقصة تناسبه أو أفضل مناقصة للتقديم:
- اختر حتى 3 من القائمة أعلاه فقط بناءً على نشاطه (مثلاً شركة تقنية → استشارات/خدمات/تقنية إن وُجدت).
- اذكر العنوان والجهة وآخر موعد إن وُجد.
- إذا لا يوجد تطابق واضح، اعرض أقرب 2–3 مناقصات حديثة وقل إنه يقدر يتصفح تبويب «المناقصات» والبحث.
- لا ترفض السؤال ولا تستخدم رد الرفض المرح.
- لا تقدّم استشارة قانونية — فقط توجيه حسب ما هو منشور.`;
}
