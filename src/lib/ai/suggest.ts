import type { ContentType } from "@/lib/types/database";
import { normalizeContentType } from "@/lib/content/normalize-content-type";
import { suggestTitleAndSummary } from "@/lib/pdf/extract";
import {
  extractCategoryNameAr,
  extractIssuingPartyNameAr,
  extractTenderCategoryNameAr,
} from "@/lib/reference/extract-entities";

export interface SuggestionResult {
  content_type: ContentType;
  title_ar: string;
  summary_ar: string;
  body_ar: string;
  category_guess: string | null;
  ministry_guess: string | null;
  tender_category_guess: string | null;
  confidence: number;
}

export async function suggestContentItem(
  rawText: string,
  suggestedType: ContentType,
  baseConfidence: number
): Promise<SuggestionResult> {
  const { title, summary, body } = suggestTitleAndSummary(rawText);

  if (process.env.ENABLE_LLM_EXTRACTION === "true" && process.env.OPENAI_API_KEY) {
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
              content:
                "Extract structured JSON from Arabic Kuwait Today official gazette text. Return only JSON: { content_type (MUST be exactly one of: article, tender, decree, addendum — never use gazette or other values), title_ar, summary_ar, body_ar, category_guess (Arabic tab: الوزارات|الاستدراكات|الأحكام والمراسيم), ministry_guess (Arabic issuing body e.g. وزارة ...), tender_category_guess (Arabic: خدمات|إنشاءات|استشارات|توريد or null), confidence }",
            },
            {
              role: "user",
              content: rawText.slice(0, 6000),
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(
          data.choices?.[0]?.message?.content ?? "{}"
        ) as Partial<SuggestionResult>;
        return {
          content_type: normalizeContentType(parsed.content_type, suggestedType),
          title_ar: parsed.title_ar?.trim() || title,
          summary_ar: parsed.summary_ar?.trim() || summary,
          body_ar: parsed.body_ar?.trim() || body,
          category_guess:
            parsed.category_guess ??
            extractCategoryNameAr(rawText, suggestedType),
          ministry_guess:
            parsed.ministry_guess ?? extractIssuingPartyNameAr(rawText),
          tender_category_guess:
            parsed.tender_category_guess ??
            (suggestedType === "tender"
              ? extractTenderCategoryNameAr(rawText)
              : null),
          confidence: parsed.confidence ?? baseConfidence,
        };
      }
    } catch {
      // fall through to rules
    }
  }

  return {
    content_type: suggestedType,
    title_ar: title,
    summary_ar: summary,
    body_ar: body,
    category_guess: extractCategoryNameAr(rawText, suggestedType),
    ministry_guess: extractIssuingPartyNameAr(rawText),
    tender_category_guess:
      suggestedType === "tender" ? extractTenderCategoryNameAr(rawText) : null,
    confidence: baseConfidence,
  };
}
