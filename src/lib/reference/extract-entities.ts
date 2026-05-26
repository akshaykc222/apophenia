import type { ContentType } from "@/lib/types/database";
import { canonicalizeCategoryName } from "./canonical-categories";

/** Home-tab style category (التصنيفات) from gazette text. */
export function extractCategoryNameAr(
  text: string,
  contentType: ContentType
): string {
  if (/الاستدراكات|استدراك|تصحيح البند|إلغاء البند/i.test(text)) {
    return canonicalizeCategoryName("الاستدراكات");
  }
  if (
    /الأحكام والمراسيم|الأحكام|المراسيم|مرسوم|قرار رقم|أمر أميري|قانون رقم/i.test(
      text
    )
  ) {
    return canonicalizeCategoryName("الأحكام والمراسيم");
  }
  if (contentType === "decree") return canonicalizeCategoryName("decrees");
  if (contentType === "addendum") return canonicalizeCategoryName("addendums");
  return canonicalizeCategoryName("ministries");
}

/** Issuing party / ministry (الجهات) — وزارة، مجلس، هيئة، … */
export function extractIssuingPartyNameAr(text: string): string | null {
  const patterns = [
    /(?:وزارة|وزاره)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/,
    /(?:الجهاز|جهاز)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/,
    /(?:مجلس|هيئة|الهيئة|الديوان|ديوان)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/,
    /(?:مؤسسة|المؤسسة|الإدارة|إدارة)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/,
    /(?:الشركة|شركة)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeArabicLabel(match[0]);
    }
  }
  return null;
}

/** Tender chip type (تصنيفات المناقصات) — from gazette PDF text. Order matters. */
export function extractTenderCategoryNameAr(text: string): string | null {
  const t = text;

  // IT / digital services → خدمات (before generic «استشارات» / «تصميم»)
  if (
    /تقن|برمج|software|حاسوب|computer|\bit\b|digital|رقم|سحاب|cloud|erp|crm|network|شبكة|اتصالات|communication|cyber|hosting|استضافة|saas|platform|database|wifi|smart\s+city|تطبيق\s+جوال/i.test(
      t
    )
  ) {
    return "خدمات";
  }

  // Supply / equipment (incl. industrial modules) → توريد — not استشارات
  if (
    /توريد|شراء|تأمين|مواد|مستلزمات|supply|equipment|modules|siren|صفار|hardware|أجهزة|devices/i.test(
      t
    )
  ) {
    return "توريد";
  }

  const rules: { name_ar: string; patterns: RegExp[] }[] = [
    {
      name_ar: "إنشاءات",
      patterns: [/إنشاءات/, /مقاولات/, /أعمال مدنية/, /بناء/, /إنشاء /],
    },
    {
      name_ar: "استشارات",
      // Require explicit consultancy — not bare «دراسة/تصميم» alone (too noisy in PDFs)
      patterns: [/استشارات/, /استشاري/, /خدمات\s+استشارية/],
    },
    {
      name_ar: "خدمات",
      patterns: [/خدمات/, /صيانة/, /تشغيل/, /نظافة/, /خدمة /, /mpractice|ممارسة/i],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(t))) {
      return rule.name_ar;
    }
  }

  if (/مناقصة|مزاد|عطاء|rfq/i.test(t)) {
    return "خدمات";
  }

  return null;
}

export function normalizeArabicLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[،,.:;]+$/g, "")
    .trim()
    .slice(0, 120);
}
