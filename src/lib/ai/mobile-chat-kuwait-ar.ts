/**
 * Kuwait Arabic dialect helpers for mobile chat intent + RAG search.
 * Users mostly write in Gulf/Kuwaiti colloquial Arabic, not MSA.
 */

/** Alef / ta marbuta / ya variants for fuzzy matching. */
export function normalizeKuwaitArabic(text: string): string {
  return text
    .replace(/[\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Common Kuwaiti fillers — stripped before keyword search. */
const STOP_WORDS = new Set([
  "شنو",
  "ايش",
  "ايه",
  "اي",
  "يعني",
  "اللي",
  "eli",
  "عشان",
  "انت",
  "انته",
  "بس",
  "من",
  "في",
  "على",
  "عن",
  "مع",
  "هذا",
  "هذي",
  "هال",
  "ها",
  "لي",
  "لها",
  "لو",
  "و",
  "يا",
  "please",
  "pls",
  "the",
  "a",
  "an",
  "is",
  "are",
  "what",
  "how",
  "can",
  "you",
  "me",
  "my",
  "tell",
  "say",
  "قول",
  "قولي",
  "علمني",
  "دلني",
  "دربني",
  "ابي",
  "ابغى",
  "أبي",
  "أبغى",
  "اريد",
  "أريد",
  "ممكن",
  "لو",
  "سمحت",
  "لو",
  "سما",
  "الحين",
  "هسه",
  "هسة",
  "حاليا",
  "please",
]);

/** Gazette / app topics in Kuwaiti phrasing. */
export const GAZETTE_TOPIC_PATTERN =
  /مناقص|ممارس|عطاء|مرسوم|مراسيم|استدراك|خبر|وزار|جريد|كويت\s*اليوم|tender|gazette|rfq|decree|addendum|تسجيل|اسجل|سجل|تقديم|معروض|مقاول|توريد|إنشاء|استشارات|خدمات/i;

/** Map dialect / synonym → search hints for published content. */
const SEARCH_SYNONYMS: { pattern: RegExp; terms: string[] }[] = [
  {
    pattern: /ممارس|practice|rfq|عطاء|مناقص|tender/i,
    terms: ["مناقص", "ممارس", "عطاء", "tender", "rfq"],
  },
  {
    pattern: /مرسوم|مراسيم|أحكام|decree/i,
    terms: ["مرسوم", "مراسيم", "أحكام"],
  },
  {
    pattern: /استدراك|addendum/i,
    terms: ["استدراك"],
  },
  {
    pattern: /خبر|أخبار|news/i,
    terms: ["خبر"],
  },
  {
    pattern: /جديد|آخر|احدث|أحدث|معروض|الحين|open/i,
    terms: [], // handled by recency scoring
  },
  {
    pattern: /اسجل|سجل|تسجيل|تقديم|register/i,
    terms: [], // handled by application_url scoring
  },
];

export type QueryIntentFlags = {
  wantsNew: boolean;
  wantsRegister: boolean;
  wantsList: boolean;
};

export function detectQueryIntent(query: string): QueryIntentFlags {
  const q = query;
  return {
    wantsNew: /جديد|آخر|احدث|أحدث|معروض|الحين|هس[ةه]|open|latest|new/i.test(q),
    wantsRegister: /اسجل|سجّ?ل|تسجيل|تقديم|تقدم|register|apply/i.test(q),
    wantsList:
      /شنو|ايش|قائمة|list|الموجود|موجود|عندكم|عندك|available|what\s+(are|is)/i.test(
        q
      ) || /الممارسات|المناقصات/i.test(q),
  };
}

/** Meaningful tokens for ranking published rows. */
export function extractKuwaitSearchTerms(query: string, max = 14): string[] {
  const terms = new Set<string>();
  const normalized = normalizeKuwaitArabic(query);

  for (const { pattern, terms: syns } of SEARCH_SYNONYMS) {
    if (pattern.test(query) || pattern.test(normalized)) {
      syns.forEach((t) => terms.add(t));
    }
  }

  const words = normalized
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  words.forEach((w) => terms.add(w));

  return [...terms].slice(0, max);
}

/** Combine recent user turns so follow-ups inherit intent (Kuwaiti threads). */
export function buildRagQueryFromConversation(userMessages: string[]): string {
  if (userMessages.length === 0) return "";
  const recent = userMessages.slice(-4);
  return recent.join("\n").slice(0, 1200);
}

export function formatConversationContextForPrompt(
  userMessages: string[]
): string {
  const recent = userMessages.slice(-4);
  if (recent.length <= 1) return "";
  const lines = recent.map((m, i) => `${i + 1}. ${m.trim()}`).join("\n");
  return `

---
أسئلة المستخدم الأخيرة (لهجة كويتية — اربط الإجابة بآخر سؤال):
${lines}`;
}
