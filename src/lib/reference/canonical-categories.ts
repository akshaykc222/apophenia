import { normalizeArabicLabel } from "./extract-entities";

/** App home tabs — only these categories should exist. */
export const CANONICAL_CATEGORIES = [
  {
    name_ar: "الوزارات",
    name_en: "Ministries",
    slug: "ministries",
    sort_order: 1,
    is_trending: false,
  },
  {
    name_ar: "الاستدراكات",
    name_en: "Addendums",
    slug: "addendums",
    sort_order: 2,
    is_trending: false,
  },
  {
    name_ar: "الأحكام والمراسيم",
    name_en: "Judgments and Decrees",
    slug: "decrees",
    sort_order: 3,
    is_trending: true,
  },
] as const;

export type CanonicalCategorySlug =
  (typeof CANONICAL_CATEGORIES)[number]["slug"];

/** Map LLM / English / fuzzy text → one of the three canonical Arabic category names. */
export function canonicalizeCategoryName(input: string): string {
  const label = normalizeArabicLabel(input);
  const key = label.toLowerCase();

  if (label === "الوزارات" || label === "الاستدراكات" || label === "الأحكام والمراسيم") {
    return label;
  }

  const aliases: Record<string, string> = {
    ministries: "الوزارات",
    ministry: "الوزارات",
    "government departments": "الوزارات",
    "government department": "الوزارات",
    departments: "الوزارات",
    الوزارة: "الوزارات",
    الوزارات: "الوزارات",
    addendums: "الاستدراكات",
    addendum: "الاستدراكات",
    corrections: "الاستدراكات",
    استدراك: "الاستدراكات",
    الاستدراكات: "الاستدراكات",
    decrees: "الأحكام والمراسيم",
    decree: "الأحكام والمراسيم",
    judgments: "الأحكام والمراسيم",
    judgment: "الأحكام والمراسيم",
    "judgments and decrees": "الأحكام والمراسيم",
    laws: "الأحكام والمراسيم",
    مرسوم: "الأحكام والمراسيم",
    قرار: "الأحكام والمراسيم",
    "الأحكام": "الأحكام والمراسيم",
    المراسيم: "الأحكام والمراسيم",
  };

  if (aliases[key]) return aliases[key];

  if (key.includes("addendum") || key.includes("استدراك") || key.includes("تصحيح")) {
    return "الاستدراكات";
  }
  if (
    key.includes("decree") ||
    key.includes("judgment") ||
    key.includes("law") ||
    key.includes("مرسوم") ||
    key.includes("حكم") ||
    key.includes("مراسيم")
  ) {
    return "الأحكام والمراسيم";
  }

  return "الوزارات";
}

export function getCanonicalMeta(nameAr: string) {
  const canonical = canonicalizeCategoryName(nameAr);
  return CANONICAL_CATEGORIES.find((c) => c.name_ar === canonical)!;
}
