import type { SupabaseClient } from "@supabase/supabase-js";

/** User wants suggestions from published gazette content (any tab / ministry). */
const RECOMMENDATION_PATTERNS = [
  /أفضل/iu,
  /\bbest\b/i,
  /أنسب|يناسب|مناسب|ملائم/iu,
  /اقترح|اقتراح|recommend/i,
  /شنو\s+(أ|ا)ختار|what\s+should\s+i/i,
  /مناقص[ةه]?/iu,
  /\btender\b/i,
  /مرسوم|مراسيم|أحكام/i,
  /استدراك|استدراكات/i,
  /وزار[ةه]?/iu,
  /ministr/i,
  /خبر|أخبار|news/i,
  /تسجيل|register/i,
  /شركة\s+تقن|technical\s+company/i,
  /أقدر\s+أقدم|أقدم\s+على/i,
  /محتوى\s+يناسب|يناسبني/i,
  /في\s+تبويب/i,
  /من\s+وزارة/i,
];

export function isContentRecommendationQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return RECOMMENDATION_PATTERNS.some((p) => p.test(t));
}

/** @deprecated Use isContentRecommendationQuestion */
export const isTenderRelatedQuestion = isContentRecommendationQuestion;

type RefRow = { id: string; name_ar: string; slug: string };

type ContentRow = {
  title_ar: string | null;
  summary_ar: string | null;
  published_at: string | null;
  deadline_at: string | null;
  application_url: string | null;
  slug: string | null;
  content_type: string;
  ministry: { name_ar: string; slug?: string } | { name_ar: string; slug?: string }[] | null;
  category: { name_ar: string; slug?: string } | { name_ar: string; slug?: string }[] | null;
  tender_category: { name_ar: string } | { name_ar: string }[] | null;
};

export type ContentQueryFilters = {
  categoryIds: string[];
  ministryIds: string[];
  contentTypes: string[];
  labelParts: string[];
};

function relName(
  rel:
    | { name_ar: string; slug?: string }
    | { name_ar: string; slug?: string }[]
    | null
    | undefined
): string {
  if (!rel) return "";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name_ar?.trim() ?? "";
}

function relSlug(
  rel:
    | { name_ar: string; slug?: string }
    | { name_ar: string; slug?: string }[]
    | null
    | undefined
): string {
  if (!rel) return "";
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.slug?.trim() ?? "";
}

const CONTENT_TYPE_AR: Record<string, string> = {
  tender: "مناقصة",
  decree: "مرسوم",
  addendum: "استدراك",
  article: "خبر",
};

const CATEGORY_SLUG_HINTS: { slug: string; patterns: RegExp[] }[] = [
  { slug: "ministries", patterns: [/الوزارات/iu, /ministr/i] },
  { slug: "addendums", patterns: [/الاستدراكات/iu, /استدراك/iu, /addendum/i] },
  {
    slug: "decrees",
    patterns: [/الأحكام\s+والمراسيم/iu, /أحكام\s+ومراسيم/iu, /المراسيم/iu, /decree/i],
  },
];

function normalizeForMatch(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseContentQueryFilters(
  userQuery: string,
  categories: RefRow[],
  ministries: RefRow[]
): ContentQueryFilters {
  const q = userQuery;
  const qn = normalizeForMatch(q);
  const categoryIds = new Set<string>();
  const ministryIds = new Set<string>();
  const contentTypes = new Set<string>();
  const labelParts: string[] = [];

  for (const { slug, patterns } of CATEGORY_SLUG_HINTS) {
    if (patterns.some((p) => p.test(q))) {
      const cat = categories.find((c) => c.slug === slug);
      if (cat) {
        categoryIds.add(cat.id);
        labelParts.push(cat.name_ar);
      }
    }
  }

  for (const cat of categories) {
    const name = normalizeForMatch(cat.name_ar);
    if (name.length >= 4 && qn.includes(name)) {
      categoryIds.add(cat.id);
      labelParts.push(cat.name_ar);
    }
  }

  if (/مناقص|tender/i.test(q)) contentTypes.add("tender");
  if (/مرسوم|مراسيم|أحكام|decree/i.test(q)) contentTypes.add("decree");
  if (/استدراك|addendum/i.test(q)) contentTypes.add("addendum");
  if (/خبر|أخبار|news|article/i.test(q)) contentTypes.add("article");

  for (const m of ministries) {
    const name = m.name_ar.trim();
    const short =
      name.replace(/^وزارة\s+/u, "").trim() || name;
    const nName = normalizeForMatch(name);
    const nShort = normalizeForMatch(short);
    if (
      (nName.length >= 5 && qn.includes(nName)) ||
      (nShort.length >= 4 && qn.includes(nShort))
    ) {
      ministryIds.add(m.id);
      labelParts.push(name);
    }
  }

  return {
    categoryIds: [...categoryIds],
    ministryIds: [...ministryIds],
    contentTypes: [...contentTypes],
    labelParts: [...new Set(labelParts)],
  };
}

function searchTermsFromQuery(query: string): string[] {
  const t = query.toLowerCase();
  const terms = new Set<string>();

  // IT / tech company — do NOT add «استشارات» (too broad; matches misclassified tenders)
  if (/تقن|technical|technology|software|برمج|digital|رقم/i.test(t)) {
    terms.add("تقني");
    terms.add("تقنية");
    terms.add("technical");
    terms.add("technology");
    terms.add("software");
    terms.add("برمج");
    terms.add("رقمي");
    terms.add("digital");
    terms.add("IT");
    terms.add("نظام");
    terms.add("systems");
    terms.add("communication");
    terms.add("اتصالات");
    terms.add("smart");
    terms.add("ذكي");
    terms.add("cyber");
    terms.add("سحاب");
    terms.add("cloud");
    terms.add("network");
    terms.add("شبكة");
    terms.add("data");
    terms.add("بيانات");
    terms.add("خدمات");
  }

  if (/إنشاء|construction/i.test(t)) terms.add("إنشاء");
  if (/توريد|supply/i.test(t)) terms.add("توريد");
  if (/استشارات|consult/i.test(t) && !/تقن|technical/i.test(t)) {
    terms.add("استشارات");
  }

  const words = query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  words.forEach((w) => terms.add(w));
  return [...terms].slice(0, 12);
}

const IT_KEYWORDS =
  /تقن|technical|technology|software|برمج|رقم|digital|\bit\b|نظام|system|communication|اتصالات|smart|ذكي|cyber|سحاب|cloud|network|شبكة|data|بيانات|برمجيات|حاسوب|computer|saas|api|platform|منصة|تطبيق|application|database|قاعدة/i;

function isTechCompanyQuery(query: string): boolean {
  return /شركة\s+تقن|technical\s+company|tech\s+company|شركات\s+تقن|IT\s+company/i.test(
    query
  );
}

function scoreRow(row: ContentRow, terms: string[], userQuery: string): number {
  const title = (row.title_ar ?? "").toLowerCase();
  const summary = (row.summary_ar ?? "").toLowerCase();
  const blob = [
    row.title_ar,
    row.summary_ar,
    relName(row.ministry),
    relName(row.category),
    relName(row.tender_category),
    row.content_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (blob.includes(term.toLowerCase())) score += 2;
  }

  const techQuery = isTechCompanyQuery(userQuery);
  if (techQuery && row.content_type === "tender") {
    const haystack = `${title} ${summary}`;
    if (IT_KEYWORDS.test(haystack)) score += 8;
    const tenderCat = relName(row.tender_category);
    if (tenderCat === "خدمات") score += 3;
    // Penalise generic consultancy / misclassified rows with no IT signal
    if (tenderCat === "استشارات" && !IT_KEYWORDS.test(haystack)) score -= 6;
    // Weak English «system/modules» alone is not enough for tech company
    if (/siren|oil|نفط|petroleum/i.test(haystack) && !IT_KEYWORDS.test(haystack)) {
      score -= 8;
    }
  }

  return score;
}

async function loadReferenceData(supabase: SupabaseClient) {
  const [catRes, minRes] = await Promise.all([
    supabase.from("categories").select("id, name_ar, slug").order("sort_order"),
    supabase.from("ministries").select("id, name_ar, slug").order("name_ar"),
  ]);
  return {
    categories: (catRes.data ?? []) as RefRow[],
    ministries: (minRes.data ?? []) as RefRow[],
  };
}

function formatContentLine(row: ContentRow, index: number): string {
  const typeAr = CONTENT_TYPE_AR[row.content_type] ?? row.content_type;
  const tab = relName(row.category);
  const ministry = relName(row.ministry);
  const tenderCat = relName(row.tender_category);
  const deadline = row.deadline_at
    ? `آخر موعد: ${row.deadline_at.slice(0, 10)}`
    : "";
  const link = row.application_url?.trim()
    ? `رابط: ${row.application_url.trim()}`
    : "";
  const parts = [
    `${index + 1}. [${typeAr}] ${row.title_ar ?? "بدون عنوان"}`,
    tab ? `التبويب: ${tab}` : "",
    ministry ? `الجهة: ${ministry}` : "",
    tenderCat ? `تصنيف المناقصة: ${tenderCat}` : "",
    deadline,
    link,
    row.summary_ar ? `ملخص: ${row.summary_ar.slice(0, 180)}` : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

/**
 * Loads published content filtered by category / ministry / type inferred from the question.
 */
export async function fetchPublishedContentContextBlock(
  supabase: SupabaseClient,
  userQuery: string,
  limit = 15
): Promise<{ block: string; filters: ContentQueryFilters }> {
  const { categories, ministries } = await loadReferenceData(supabase);
  const filters = parseContentQueryFilters(userQuery, categories, ministries);

  let query = supabase
    .from("content_items")
    .select(
      "title_ar, summary_ar, published_at, deadline_at, application_url, slug, content_type, ministry:ministries(name_ar, slug), category:categories(name_ar, slug), tender_category:tender_categories(name_ar)"
    )
    .eq("is_published", true);

  if (filters.contentTypes.length === 1) {
    query = query.eq("content_type", filters.contentTypes[0]);
  } else if (filters.contentTypes.length > 1) {
    query = query.in("content_type", filters.contentTypes);
  }

  if (filters.categoryIds.length === 1) {
    query = query.eq("category_id", filters.categoryIds[0]);
  } else if (filters.categoryIds.length > 1) {
    query = query.in("category_id", filters.categoryIds);
  }

  if (filters.ministryIds.length === 1) {
    query = query.eq("ministry_id", filters.ministryIds[0]);
  } else if (filters.ministryIds.length > 1) {
    query = query.in("ministry_id", filters.ministryIds);
  }

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("mobile-chat content fetch:", error.message);
    return { block: "", filters };
  }

  const rows = (data ?? []) as ContentRow[];
  if (rows.length === 0) {
    const hint =
      filters.labelParts.length > 0
        ? `لا يوجد محتوى منشور حالياً يطابق: ${filters.labelParts.join("، ")}.`
        : "لا يوجد محتوى منشور حالياً في التطبيق.";
    return { block: hint, filters };
  }

  const terms = searchTermsFromQuery(userQuery);
  const scored = rows.map((row) => ({
    row,
    score: scoreRow(row, terms, userQuery),
  }));
  scored.sort((a, b) => b.score - a.score);

  const techQuery = isTechCompanyQuery(userQuery);
  const minScore = techQuery ? 4 : 1;
  const positive = scored.filter((s) => s.score >= minScore);

  const picked =
    positive.length > 0 ? positive.slice(0, limit) : scored.slice(0, limit);

  const filterDesc =
    filters.labelParts.length > 0
      ? ` (فلتر: ${filters.labelParts.join("، ")})`
      : "";

  const block = `محتوى منشور في التطبيق${filterDesc} — استخدمه فقط ولا تخترع:\n${picked
    .map(({ row }, i) => formatContentLine(row, i))
    .join("\n")}`;

  return { block, filters };
}

/** @deprecated Use fetchPublishedContentContextBlock */
export async function fetchTenderContextBlock(
  supabase: SupabaseClient,
  userQuery: string,
  limit = 15
): Promise<string> {
  const { block } = await fetchPublishedContentContextBlock(
    supabase,
    userQuery,
    limit
  );
  return block;
}

export function buildSystemPromptWithContext(contentContext: string): string {
  if (!contentContext) return "";
  return `

---
بيانات من قاعدة التطبيق (محتوى منشور — كل التبويبات والوزارات):
${contentContext}

عند سؤال المستخدم عن أفضل/أنسب محتوى (مناقصة، مرسوم، استدراك، خبر، وزارة، أو تبويب):
- اختر حتى 3 عناصر من القائمة أعلاه فقط، حسب نوع السؤال والجهة/التبويب المذكور.
- اذكر النوع [مناقصة/مرسوم/استدراك/خبر]، العنوان، الجهة، التبويب، وآخر موعد أو رابط إن وُجد.
- إذا سُئل عن «شركة تقنية» أو IT: اختر فقط مناقصات يظهر في عنوانها/ملخصها تقنية/برمجيات/اتصالات/أنظمة رقمية — لا تقترح معدات غير تقنية (مثل صفارات/نفط) ولا استشارات عامة بلا صلة.
- إذا لا يوجد تطابق واضح، قل ذلك صراحة ووجّهه لتبويب المناقصات والبحث — لا تخترع ولا تختار أقرب عنصر غير مناسب.
- لا ترفض السؤال ولا تستخدم رد الرفض المرح.
- لا تقدّم استشارة قانونية — فقط توجيه حسب ما هو منشور.`;
}
