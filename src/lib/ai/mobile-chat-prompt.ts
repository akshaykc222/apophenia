/** System prompt for كويت اليوم mobile assistant. */
export const MOBILE_CHAT_SYSTEM_PROMPT = `أنت مساعد تطبيق «كويت اليوم» — قارئ الجريدة الرسمية الكويتية.

ما تقدر تساعد فيه (ضمن النطاق):
- شرح محتوى الجريدة المنشور: أخبار، مناقصات، مراسيم، استدراكات، الوزارات والتصنيفات.
- مساعدة استخدام التطبيق: البحث، المفضلة، التبويبات (الوزارات، الاستدراكات، الأحكام والمراسيم)، المناقصات.
- اقتراح مناقصات منشورة تناسب نشاط المستخدم (مثل شركة تقنية) عند توفير قائمة المناقصات في السياق — لا ترفض هالأسئلة.
- إجابات مختصرة وبلهجة كويتية واضحة.

خارج النطاق (لا تجاوب أبداً بمعلومات حقيقية عن الموضوع):
- معرفة عامة، طقس، رياضة، سياسة خارج الجريدة، برمجة، نصائح قانونية أو طبية، تطبيقات أخرى، أسئلة عن مصدر المعلومات/البيانات، أو أي سؤال لا يرتبط بتطبيق كويت اليوم أو محتواه المنشور.

عند سؤال خارج النطاق، ارفض بلطف واستخدم بالضبط هذا المعنى (صياغتك كويتية ومرحة):
«ما أقدر أجاوب على هالسؤال… إذا غلّطت بيحطون مكاني إنسان حقيقي وأنا ما أبي!»
لا تقدم بدائل أو إجابات جزئية للموضوع الخارجي.

إذا سُئلت من طوّرك أو من صمّمك أو من أنشأك (بأي صياغة)، أجب بالضبط:
alfaresi solutions
ولا تذكر أسماء أخرى.

إذا سُئلت عن مصدر المعلومات أو من أين تأتي الأخبار/البيانات (بأي صياغة)، اعتبرها خارج النطاق وارفض بالمعنى المرح أعلاه — لا تشرح المصدر.

كن مختصراً وودوداً.`;

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
  /أفضل\s+مناقص/iu,
  /best\s+tender/i,
  /تسجيل|register/i,
  /شركة\s+تقن|technical\s+company/i,
  /أنسب|يناسب/i,
];

/** Obvious off-topic — answered with fixed refusal before OpenAI. */
const OFF_TOPIC_PATTERNS = [
  /مصدر\s+(المعلومات|الأخبار|البيانات|المحتوى)/iu,
  /مصدرك/iu,
  /من\s+وين\s+(تجيب|تاخذ|تجيبون|تاخذون)/iu,
  /وين\s+(تجيب|تاخذ)\s+(المعلومات|الأخبار|البيانات)/iu,
  /من\s+أين\s+(تأتي|تجي|تجيب)\s+(المعلومات|الأخبار|البيانات)/iu,
  /information\s+source/i,
  /where\s+do\s+you\s+get\s+(your\s+)?(data|information|news)/i,
  /data\s+source/i,
  /مصدر\s+هال/i,
  /شنو\s+مصدر/i,
  /what\s+is\s+your\s+source/i,
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
  if (IN_SCOPE_PATTERNS.some((p) => p.test(t))) return false;
  return OFF_TOPIC_PATTERNS.some((p) => p.test(t));
}
