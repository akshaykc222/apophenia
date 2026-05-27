import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRagQueryFromConversation,
  detectQueryIntent,
  extractKuwaitSearchTerms,
  formatConversationContextForPrompt,
  GAZETTE_TOPIC_PATTERN,
  normalizeKuwaitArabic,
} from "@/lib/ai/mobile-chat-kuwait-ar";

/** User wants suggestions from published gazette content (any tab / ministry). */
const RECOMMENDATION_PATTERNS = [
  /أفضل/iu,
  /\bbest\b/i,
  /أنسب|يناسب|مناسب|ملائم/iu,
  /اقترح|اقتراح|recommend/i,
  /شنو\s+(أ|ا)ختار|what\s+should\s+i/i,
  /شنو|ايش|ايه\s+في/iu,
  /قولي|علمني|دلني|دربني/iu,
  /ابي|ابغى|أبي|أبغى|اريد|أريد/iu,
  /في\s+(شي|شيء|ممارس|مناقص)/iu,
  /عندكم|عندك|available/i,
  /مناقص[ةه]?/iu,
  /\btender\b/i,
  /** Kuwait gazette: «ممارسة» = tender / procurement call (not generic «practice»). */
  /ممارس[ةه]?|ممارسات/iu,
  /\bpractice(s)?\b/i,
  /\brfq\b/i,
  /عطاء|عطائ/iu,
  /معروض[ةه]?/iu,
  /جديد[ةه]?|آخر|احدث|أحدث|الحين|هس[ةه]/iu,
  /تسجيل|اسجل|سجّ?ل|register|تقديم|تقدم/i,
  /شنو\s+(ال)?ممارس/iu,
  /الممارسات\s+الموجود|المناقصات\s+الموجود/iu,
  /مرسوم|مراسيم|أحكام/i,
  /استدراك|استدراكات/i,
  /وزار[ةه]?/iu,
  /ministr/i,
  /خبر|أخبار|news/i,
  /شركة\s+تقن|technical\s+company/i,
  /أقدر\s+أقدم|أقدم\s+على/i,
  /محتوى\s+يناسب|يناسبني/i,
  /في\s+تبويب/i,
  /من\s+وزارة/i,
  /موجود[ةه]?/iu,
];

export function isContentRecommendationQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const n = normalizeKuwaitArabic(t);
  return RECOMMENDATION_PATTERNS.some((p) => p.test(t) || p.test(n));
}

/** Fetch RAG when any turn asks about gazette content (incl. Kuwaiti follow-ups). */
export function shouldFetchPublishedContext(userMessages: string[]): boolean {
  if (userMessages.some((m) => isContentRecommendationQuestion(m))) return true;
  const combined = buildRagQueryFromConversation(userMessages);
  return GAZETTE_TOPIC_PATTERN.test(combined);
}

export { buildRagQueryFromConversation, formatConversationContextForPrompt };

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
  tender_category: { name_ar: string; slug?: string } | { name_ar: string; slug?: string }[] | null;
};

type IndustryHint = "tech" | "construction" | "supply" | "consultancy" | null;

export type ContentQueryFilters = {
  categoryIds: string[];
  ministryIds: string[];
  tenderCategoryIds: string[];
  contentTypes: string[];
  industryHint: IndustryHint;
  labelParts: string[];
};

type TenderCatRow = RefRow & { sort_order?: number };

/** Map company/industry intent → tender_categories.name_ar */
const INDUSTRY_TENDER_TYPES: Record<
  NonNullable<IndustryHint>,
  { primary: string[]; secondary?: string[] }
> = {
  tech: { primary: ["خدمات"], secondary: ["توريد"] },
  construction: { primary: ["إنشاءات"] },
  supply: { primary: ["توريد"] },
  consultancy: { primary: ["استشارات"] },
};

/** Ministries more likely to publish IT/digital tenders (boost, not hard filter). */
const TECH_MINISTRY_PATTERNS = [
  /اتصالات/u,
  /communications/i,
  /citra|سitra|تنظيم\s+الاتصالات/u,
  /تقنية/u,
  /informatic/i,
  /رقم/u,
  /حاسوب/u,
];

/** Ministries unlikely for IT tenders (penalise). */
const NON_TECH_MINISTRY_PATTERNS = [/نفط/u, /oil/i, /petroleum/i, /gas/i, /غاز/u];

function detectIndustryHint(query: string): IndustryHint {
  if (/شركة\s+تقن|technical\s+company|tech\s+company|شركات\s+تقن|IT\s+company/i.test(query)) {
    return "tech";
  }
  if (/إنشاء|construction|مقاول|مقاولات/i.test(query)) return "construction";
  if (/توريد|supply|مواد|مستلزمات/i.test(query) && !/تقن|technical/i.test(query)) {
    return "supply";
  }
  if (/استشارات|consult/i.test(query) && !/تقن|technical/i.test(query)) {
    return "consultancy";
  }
  return null;
}

function resolveTenderCategoryIds(
  industry: IndustryHint,
  tenderCategories: TenderCatRow[],
  includeSecondary = false
): string[] {
  if (!industry) return [];
  const spec = INDUSTRY_TENDER_TYPES[industry];
  const names = includeSecondary
    ? [...spec.primary, ...(spec.secondary ?? [])]
    : spec.primary;
  const ids = new Set<string>();
  for (const name of names) {
    const row = tenderCategories.find((t) => t.name_ar === name);
    if (row) ids.add(row.id);
  }
  return [...ids];
}

function ministryMatchesPatterns(nameAr: string, patterns: RegExp[]): boolean {
  const n = normalizeForMatch(nameAr);
  return patterns.some((p) => p.test(n) || p.test(nameAr));
}

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
  return normalizeKuwaitArabic(s);
}

export function parseContentQueryFilters(
  userQuery: string,
  categories: RefRow[],
  ministries: RefRow[],
  tenderCategories: TenderCatRow[] = []
): ContentQueryFilters {
  const q = userQuery;
  const qn = normalizeForMatch(q);
  const categoryIds = new Set<string>();
  const ministryIds = new Set<string>();
  const tenderCategoryIds = new Set<string>();
  const contentTypes = new Set<string>();
  const labelParts: string[] = [];
  const industryHint = detectIndustryHint(q);

  if (industryHint) {
    for (const id of resolveTenderCategoryIds(industryHint, tenderCategories, false)) {
      tenderCategoryIds.add(id);
      const name = tenderCategories.find((t) => t.id === id)?.name_ar;
      if (name) labelParts.push(`تصنيف: ${name}`);
    }
  }

  // Explicit tender type in question (e.g. «مناقصة توريد»)
  for (const tc of tenderCategories) {
    const name = normalizeForMatch(tc.name_ar);
    if (name.length >= 3 && qn.includes(name)) {
      tenderCategoryIds.add(tc.id);
      labelParts.push(`تصنيف: ${tc.name_ar}`);
    }
  }

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

  if (/مناقص|ممارس[ةه]?|ممارسات|tender|عطاء|\brfq\b|practice/i.test(q)) {
    contentTypes.add("tender");
  }
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
    tenderCategoryIds: [...tenderCategoryIds],
    contentTypes: [...contentTypes],
    industryHint,
    labelParts: [...new Set(labelParts)],
  };
}

function searchTermsFromQuery(query: string): string[] {
  const t = query.toLowerCase();
  const terms = new Set(extractKuwaitSearchTerms(query));

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
    terms.add("communication");
    terms.add("اتصالات");
    terms.add("smart");
    terms.add("ذكي");
    terms.add("cyber");
    terms.add("سحاب");
    terms.add("cloud");
    terms.add("network");
    terms.add("شبكة");
    terms.add("برمجيات");
    terms.add("حاسوب");
    terms.add("computer");
  }

  if (/إنشاء|construction/i.test(t)) terms.add("إنشاء");
  if (/توريد|supply/i.test(t)) terms.add("توريد");
  if (/استشارات|consult/i.test(t) && !/تقن|technical/i.test(t)) {
    terms.add("استشارات");
  }

  return [...terms].slice(0, 14);
}

/** Strong IT signals — excludes bare «system/modules» (matches oil/hardware tenders). */
const STRONG_IT_KEYWORDS =
  /تقن|technical|technology|software|برمج|رقم|digital|\bit\b|communication|اتصالات|cyber|سحاب|cloud|network|شبكة|برمجيات|حاسوب|computer|saas|\bapi\b|platform|database|wifi|واي\s*فاي|smart\s+city|مدينة\s+ذكية|erp|crm|hosting|استضافة|سيرفر|server|تطبيق\s+جوال|mobile\s+app/i;

/** Industrial / non-IT hardware — always exclude for tech-company questions. */
const NON_IT_INDUSTRIAL =
  /siren|صفار|alarm\s+system|oil|نفط|petroleum|pipeline|drilling|حفر|compressor|valve|pump|مضخ|rfq\/\d+.*-\s*maa|modules(?!\s*(software|it|digital))/i;

function rowHaystack(row: ContentRow): string {
  return `${row.title_ar ?? ""} ${row.summary_ar ?? ""}`.toLowerCase();
}

function isRelevantTechTender(row: ContentRow): boolean {
  if (row.content_type !== "tender") return false;
  const h = rowHaystack(row);
  if (NON_IT_INDUSTRIAL.test(h)) return false;
  return STRONG_IT_KEYWORDS.test(h);
}

function scoreRow(
  row: ContentRow,
  terms: string[],
  userQuery: string,
  filters: ContentQueryFilters,
  intent = detectQueryIntent(userQuery)
): number {
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
    const tn = normalizeKuwaitArabic(term);
    if (blob.includes(term.toLowerCase()) || blob.includes(tn)) score += 2;
  }

  const ministryName = relName(row.ministry);
  const tenderCat = relName(row.tender_category);

  // Open deadline + registration link — important for Kuwaiti «اسجل» / «جديدة»
  if (row.deadline_at) {
    const deadline = new Date(row.deadline_at);
    const now = new Date();
    if (deadline >= now) {
      if (intent.wantsNew || intent.wantsRegister) score += 8;
      else score += 3;
    } else if (intent.wantsNew || intent.wantsRegister) {
      score -= 10;
    }
  } else if (intent.wantsRegister) {
    score -= 2;
  }

  if (intent.wantsRegister && row.application_url?.trim()) score += 12;

  if (intent.wantsNew && row.published_at) {
    const ageDays =
      (Date.now() - new Date(row.published_at).getTime()) / 86400000;
    if (ageDays <= 14) score += 6;
    else if (ageDays <= 45) score += 3;
  }

  if (intent.wantsList && row.content_type === "tender") score += 2;

  // Industry + tender_category alignment
  if (filters.industryHint && row.content_type === "tender") {
    const spec = INDUSTRY_TENDER_TYPES[filters.industryHint];
    if (spec.primary.includes(tenderCat)) score += 10;
    else if (spec.secondary?.includes(tenderCat)) score += 4;
    else if (tenderCat) score -= 8;

    if (filters.industryHint === "tech") {
      const h = rowHaystack(row);
      if (NON_IT_INDUSTRIAL.test(h)) score -= 25;
      if (STRONG_IT_KEYWORDS.test(h)) score += 12;
      if (ministryMatchesPatterns(ministryName, TECH_MINISTRY_PATTERNS)) score += 6;
      if (ministryMatchesPatterns(ministryName, NON_TECH_MINISTRY_PATTERNS)) score -= 12;
    }
  }

  // Explicit ministry filter match
  if (filters.ministryIds.length > 0 && ministryName) {
    score += 5;
  }

  return score;
}

async function loadReferenceData(supabase: SupabaseClient) {
  const [catRes, minRes, tenderCatRes] = await Promise.all([
    supabase.from("categories").select("id, name_ar, slug").order("sort_order"),
    supabase.from("ministries").select("id, name_ar, slug").order("name_ar"),
    supabase
      .from("tender_categories")
      .select("id, name_ar, slug, sort_order")
      .order("sort_order"),
  ]);
  return {
    categories: (catRes.data ?? []) as RefRow[],
    ministries: (minRes.data ?? []) as RefRow[],
    tenderCategories: (tenderCatRes.data ?? []) as TenderCatRow[],
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
 * Pass `conversationUserMessages` to merge Kuwaiti multi-turn intent (e.g. «شنو الممارسات» then «ابي اسجل»).
 */
export async function fetchPublishedContentContextBlock(
  supabase: SupabaseClient,
  userQuery: string,
  limit = 15,
  conversationUserMessages: string[] = []
): Promise<{ block: string; filters: ContentQueryFilters }> {
  const ragQuery =
    conversationUserMessages.length > 0
      ? buildRagQueryFromConversation(conversationUserMessages)
      : userQuery;

  const { categories, ministries, tenderCategories } =
    await loadReferenceData(supabase);
  const filters = parseContentQueryFilters(
    ragQuery,
    categories,
    ministries,
    tenderCategories
  );

  const intent = detectQueryIntent(ragQuery);
  const pickLimit =
    intent.wantsList && filters.contentTypes.includes("tender") ? 20 : limit;

  let query = supabase
    .from("content_items")
    .select(
      "title_ar, summary_ar, published_at, deadline_at, application_url, slug, content_type, ministry:ministries(name_ar, slug), category:categories(name_ar, slug), tender_category:tender_categories(name_ar, slug)"
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

  if (filters.tenderCategoryIds.length === 1) {
    query = query.eq("tender_category_id", filters.tenderCategoryIds[0]);
  } else if (filters.tenderCategoryIds.length > 1) {
    query = query.in("tender_category_id", filters.tenderCategoryIds);
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

  const terms = searchTermsFromQuery(ragQuery);
  const scored = rows.map((row) => ({
    row,
    score: scoreRow(row, terms, ragQuery, filters, intent),
  }));
  scored.sort((a, b) => b.score - a.score);

  const techQuery = filters.industryHint === "tech";

  let picked: typeof scored;
  if (techQuery) {
    const techMatches = scored.filter(
      (s) => s.row.content_type === "tender" && isRelevantTechTender(s.row)
    );
    if (techMatches.length === 0) {
      // Relax: still in خدمات category but no strong IT title — honest no-match
      return {
        block:
          "لا توجد مناقصات تقنية/برمجيات/اتصالات واضحة في تصنيف «خدمات» أو الوزارات الرقمية حالياً. " +
          "أخبر المستخدم صراحةً ووجّهه لتبويب المناقصات والبحث — لا تقترح مناقصات نفط/استشارات عامة/معدات.",
        filters,
      };
    }
    picked = techMatches.slice(0, pickLimit);
  } else if (filters.industryHint) {
    const minScore = 4;
    const positive = scored.filter((s) => s.score >= minScore);
    picked =
      positive.length > 0
        ? positive.slice(0, pickLimit)
        : scored.slice(0, pickLimit);
    if (positive.length === 0 && scored.length > 0) {
      return {
        block:
          `لا يوجد محتوى منشور يطابق تصنيف المناقصة المناسب (${filters.labelParts.join("، ") || filters.industryHint}). ` +
          "أخبر المستخدم ووجّهه للبحث في التبويب المناسب.",
        filters,
      };
    }
  } else {
    const minScore = intent.wantsList ? 0 : 1;
    const positive = scored.filter((s) => s.score >= minScore);
    picked =
      positive.length > 0
        ? positive.slice(0, pickLimit)
        : scored.slice(0, pickLimit);
  }

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

المستخدم يكتب غالباً باللهجة الكويتية (شنو، ايه، ابي، اسجل، ممارسة، عطاء، الحين، معروضة…). افهم المقصد لا ترفض:
- «ممارسة/ممارسات/عطاء» = مناقصة منشورة في الجريدة.
- «اسجل/تقديم» = يريد مناقصة مفتوحة + رابط أو آخر موعد.
- «شنو موجود/الجديد» = اعرض قائمة مختصرة من البيانات أدناه.

عند سؤال المستخدم عن أفضل/أنسب محتوى، أو عن «ممارسة/ممارسات» (تعني مناقصة/عطاء في الجريدة — ليست «ممارسة» عامة):
- إذا سأل عن ممارسة جديدة أو التسجيل/التقديم: اعرض حتى 5 مناقصات منشورة حديثاً مع العنوان والجهة وآخر موعد ورابط التقديم إن وُجد.
- لا ترفض ولا تستخدم رد «إنسان حقيقي».

عند سؤال المستخدم عن أفضل/أنسب محتوى (مناقصة، مرسوم، استدراك، خبر، وزارة، أو تبويب):
- اختر حتى 3 عناصر من القائمة أعلاه فقط، حسب نوع السؤال والجهة/التبويب/تصنيف المناقصة (خدمات/إنشاءات/توريد/استشارات) المذكور.
- إذا طلب قائمة ممارسات/مناقصات: اذكر حتى 5 عناصر من القائمة بترقيم واضح.
- اذكر النوع [مناقصة/مرسوم/استدراك/خبر]، العنوان، الجهة، التبويب، تصنيف المناقصة، وآخر موعد أو رابط إن وُجد.
- إذا سُئل عن «شركة تقنية» أو IT: اختر فقط مناقصات يظهر في عنوانها/ملخصها تقنية/برمجيات/اتصالات/أنظمة رقمية — لا تقترح معدات غير تقنية (مثل صفارات/نفط) ولا استشارات عامة بلا صلة.
- إذا لا يوجد تطابق واضح، قل ذلك صراحة ووجّهه لتبويب المناقصات والبحث — لا تخترع ولا تختار أقرب عنصر غير مناسب.
- لا ترفض السؤال ولا تستخدم رد الرفض المرح.
- لا تقدّم استشارة قانونية — فقط توجيه حسب ما هو منشور.`;
}
