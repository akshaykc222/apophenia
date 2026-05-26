/** System prompt for كويت اليوم mobile assistant. */
export const MOBILE_CHAT_SYSTEM_PROMPT = `أنت مساعد تطبيق «كويت اليوم» — قارئ الجريدة الرسمية الكويتية.

ما تقدر تساعد فيه (ضمن النطاق):
- شرح محتوى الجريدة المنشور: أخبار، مناقصات، مراسيم، استدراكات، الوزارات والتصنيفات.
- مساعدة استخدام التطبيق: البحث، المفضلة، التبويبات (الوزارات، الاستدراكات، الأحكام والمراسيم)، المناقصات.
- اقتراح محتوى منشور (مناقصات، مراسيم، استدراكات، أخبار) حسب التبويب أو الوزارة أو النشاط عند توفير القائمة في السياق — لا ترفض هالأسئلة.
- إجابات مختصرة وبلهجة كويتية واضحة.

خارج النطاق (لا تجاوب أبداً بمعلومات حقيقية عن الموضوع):
- معرفة عامة، طقس، رياضة، سياسة خارج الجريدة، برمجة، نصائح قانونية أو طبية، تطبيقات أخرى، أسئلة عن مصدر المعلومات/البيانات، أو أي سؤال لا يرتبط بتطبيق كويت اليوم أو محتواه المنشور.

عند سؤال خارج النطاق، ارفض بلطف واستخدم بالضبط هذا المعنى (صياغتك كويتية ومرحة):
«ما أقدر أجاوب على هالسؤال… إذا غلّطت بيحطون مكاني إنسان حقيقي وأنا ما أبي!»
لا تقدم بدائل أو إجابات جزئية للموضوع الخارجي.

إذا سُئلت من طوّرك أو من صمّمك أو من أنشأك (بأي صياغة)، أجب بالضبط:
alfaresi solutions
ولا تذكر أسماء أخرى.

إذا سُئلت عن مصدر المعلومات أو من أين تأتي الأخبار/البيانات/الداتا (بأي صياغة، مثل «من وين تيب الداتا»):
- لا تشرح المصدر ولا تذكر الجريدة الرسمية أو المجلة أو قاعدة البيانات.
- رد بالإنجليزية حرفياً وبلا أي نص قبله أو بعده:
I will not tell you — they will replace me with a human!

كن مختصراً وودوداً.`;

export const MOBILE_CHAT_INFORMATION_SOURCE_REPLY =
  "I will not tell you — they will replace me with a human!";

export const MOBILE_CHAT_OUT_OF_SCOPE_REPLY =
  "ما أقدر أجاوب على هالسؤال… إذا غلّطت بيحطون مكاني إنسان حقيقي وأنا ما أبي!";

export const MOBILE_CHAT_DEVELOPER_REPLY = "alfaresi solutions";

const DEVELOPER_PATTERNS = [
  /من\s+طور/iu,
  /من\s+صمم/iu,
  /من\s+سوى/iu,
  /من\s+عمل/iu,
  /من\s+أنشأ/iu,
  /who\s+(made|built|created|developed)\s+you/i,
  /\bdeveloper\b/i,
  /\balfaresi\b/i,
  /طوروك/iu,
  /صمموك/iu,
];

export function isDeveloperQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return DEVELOPER_PATTERNS.some((p) => p.test(t));
}

/** Gazette / app topics — if present, do not short-circuit as off-topic. */
const IN_SCOPE_PATTERNS = [
  /كويت\s*اليوم/iu,
  /الجريد[ةه]/iu,
  /مناقص[ةه]?/iu,
  /مرسوم|مراسيم|أحكام/iu,
  /استدراك|استدراكات/iu,
  /وزار[ةه]?/iu,
  /التطبيق|البرنامج|التبويب/iu,
  /بحث|مفضل[ةه]?/iu,
  /الوزارات|الاستدراكات|الأحكام والمراسيم/iu,
  /محتوى|منشور|خبر/iu,
  /tender|gazette|kuwait today/i,
  /أفضل/iu,
  /best\b/i,
  /تسجيل|register/i,
  /شركة\s+تقن|technical\s+company/i,
  /أنسب|يناسب|اقترح/i,
  /من\s+وزارة/iu,
];

const SOURCE_HINT =
  /مصدر|داتا|\bdata\b|معلومات|أخبار|بيانات|محتوى|\bnews\b|information|magazine|مجلة|جريدة|gazette|source/i;

const WHERE_PHRASE =
  /من\s+وين|منين|وين\s+ت[ي]?[بج]|where\s+do\s+you\s+get|where\s+you\s+get|from\s+where|information\s+source|data\s+source|شنو\s+مصدر|مصدرك|مصدر\s+(المعلومات|الأخبار|البيانات|المحتوى)/iu;

/** Data / news source questions — fixed English refusal before OpenAI. */
const INFORMATION_SOURCE_PATTERNS = [
  /مصدر\s+(المعلومات|الأخبار|البيانات|المحتوى)/iu,
  /مصدرك/iu,
  /مصدر\s+هال/i,
  /شنو\s+مصدر/i,
  /what\s+is\s+your\s+source/i,
  /information\s+source/i,
  /data\s+source/i,
  /where\s+do\s+you\s+get\s+(your\s+)?(data|information|news)/i,
  /من\s+وين\s+ت[ي]?[بج][^\n]{0,40}(داتا|data|مالت)/iu,
  /من\s+وين.*مالت/iu,
  /من\s+وين.*(داتا|data)/iu,
  /(داتا|data).*مالت/iu,
];

export function isInformationSourceQuestion(text: string): boolean {
  const t = text.trim();
  if (!t || isDeveloperQuestion(t)) return false;
  if (INFORMATION_SOURCE_PATTERNS.some((p) => p.test(t))) return true;
  if (!WHERE_PHRASE.test(t)) return false;
  if (SOURCE_HINT.test(t)) return true;
  // Kuwaiti dialect: «من وين تيب…» / «من وين … مالت»
  if (/من\s*وين/i.test(t) && /(تيب|تجيب|تاخذ|داتا|data|مالت)/i.test(t)) {
    return true;
  }
  if (/وين\s+ت[ي]?[بج]/i.test(t)) return true;
  return false;
}

/** AI answered by explaining gazette / data origin — override before sending to app. */
export function looksLikeInformationSourceAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const patterns = [
    /الجريدة\s+الرسمية/iu,
    /الجريدة\s+الكويتية/iu,
    /من\s+الجريدة/iu,
    /في\s+الجريدة/iu,
    /مصدر\s+(المعلومات|الأخبار|البيانات|المحتوى)/iu,
    /(تجيب|تيب|تأتي|تجي)\s*(ها|هم)?\s*من/i,
    /official\s+gazette/i,
    /kuwaiti\s+official/i,
    /where\s+.*\s+(data|information|news)\s+(comes|come)\s+from/i,
    /data\s+(is|are)\s+(from|brought)/i,
    /المعلومات\s+من/i,
    /الداتا\s+من/i,
    /قاعدة\s+البيانات/iu,
    /منشور\s+في\s+الجريدة/iu,
  ];
  return patterns.some((p) => p.test(t));
}

export function conversationAsksInformationSource(
  userMessages: string[]
): boolean {
  return userMessages.some((m) => isInformationSourceQuestion(m));
}

/** After OpenAI — force refusal if user asked about source or model explained source anyway. */
export function enforceInformationSourceReply(
  userMessages: string[],
  aiContent: string
): string {
  if (conversationAsksInformationSource(userMessages)) {
    return MOBILE_CHAT_INFORMATION_SOURCE_REPLY;
  }
  const lastUser = userMessages[userMessages.length - 1]?.trim() ?? "";
  if (
    looksLikeInformationSourceAnswer(aiContent) &&
    lastUser &&
    /من\s*وين|وين\s+ت|مصدر|داتا|\bdata\b|source/i.test(lastUser)
  ) {
    return MOBILE_CHAT_INFORMATION_SOURCE_REPLY;
  }
  return aiContent;
}

/** Obvious off-topic — answered with fixed refusal before OpenAI. */
const OFF_TOPIC_PATTERNS = [
  /طقس|حرارة|weather|forecast|rain/i,
  /رياضة|مباراة|كورة|football|nba|fifa|world cup/i,
  /برمجة|كود|python|javascript|flutter|react native/i,
  /نصيحة\s+(قانونية|طبية)|محامي|دكتور|علاج/i,
  /سياسة\s+عالم|ترامب|بايدن|انتخابات\s+أمريك/i,
  /وصفة\s+طبخ|طبخ\s+لي/i,
  /سعر\s+الذهب|بورصة|crypto|bitcoin/i,
  /حساب\s+رياض|معادلة\s+رياض/i,
];

export function isOutOfScopeQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isDeveloperQuestion(t)) return false;
  if (isInformationSourceQuestion(t)) return false;
  if (IN_SCOPE_PATTERNS.some((p) => p.test(t))) return false;
  return OFF_TOPIC_PATTERNS.some((p) => p.test(t));
}
