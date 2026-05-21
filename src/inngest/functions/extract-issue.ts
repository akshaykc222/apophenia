import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import {
  BATCH_SIZE,
  detectSections,
  extractPageRange,
  getPdfPageCount,
} from "@/lib/pdf/extract";
import { suggestContentItem } from "@/lib/ai/suggest";
import {
  autoPublishExtractedItem,
  isAutoPublishEnabled,
} from "@/lib/content/auto-publish";
import {
  createResolver,
  resolveForExtraction,
} from "@/lib/reference/resolve-for-extraction";
import { bootstrapReferencesFromText } from "@/lib/reference/bootstrap-from-pdf";
import { normalizeContentType } from "@/lib/content/normalize-content-type";
import type { ContentType } from "@/lib/types/database";
import { formatPdfError } from "@/lib/pdf/pdfjs-config";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function downloadIssuePdf(storagePath: string): Promise<ArrayBuffer> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from("gazettes").download(storagePath);
  if (error) throw error;
  return data.arrayBuffer();
}

async function markIssueFailed(issueId: string, message: string) {
  const supabase = getServiceSupabase();
  await supabase
    .from("pdf_issues")
    .update({
      extraction_status: "failed",
      error_message: message.slice(0, 2000),
    })
    .eq("id", issueId);
  await supabase
    .from("extraction_jobs")
    .update({
      status: "failed",
      error_message: message.slice(0, 2000),
      finished_at: new Date().toISOString(),
    })
    .eq("issue_id", issueId)
    .eq("status", "running");
}

export const extractIssue = inngest.createFunction(
  {
    id: "extract-issue",
    retries: 2,
    triggers: [{ event: "gazette/issue.uploaded" }],
    onFailure: async ({ event, error }) => {
      const issueId = (event?.data as { issueId?: string } | undefined)?.issueId;
      if (issueId) {
        await markIssueFailed(issueId, formatPdfError(error));
      }
    },
  },
  async ({ event, step }) => {
    const issueId = event.data.issueId as string;
    const supabase = getServiceSupabase();
    const autoPublish = isAutoPublishEnabled();

    try {
    const issue = await step.run("load-issue", async () => {
      const { data, error } = await supabase
        .from("pdf_issues")
        .select("*")
        .eq("id", issueId)
        .single();
      if (error) throw error;
      return data;
    });

    await step.run("mark-processing", async () => {
      await supabase
        .from("pdf_issues")
        .update({ extraction_status: "processing", extraction_progress: 0 })
        .eq("id", issueId);

      await supabase.from("extraction_jobs").insert({
        issue_id: issueId,
        status: "running",
        started_at: new Date().toISOString(),
      });
    });

    const pageCount = await step.run("count-pages", async () => {
      const buf = await downloadIssuePdf(issue.storage_path);
      const count = await getPdfPageCount(buf);
      await supabase
        .from("pdf_issues")
        .update({ page_count: count })
        .eq("id", issueId);
      return count;
    });

    await step.run("bootstrap-references", async () => {
      try {
        const buf = await downloadIssuePdf(issue.storage_path);
        const sampleEnd = Math.min(40, pageCount);
        const sampleText = await extractPageRange(buf, 1, sampleEnd);
        return await bootstrapReferencesFromText(supabase, sampleText);
      } catch (e) {
        console.error("bootstrap-references skipped:", formatPdfError(e));
        return { categories: 0, ministries: 0, tenderCategories: 0, skipped: true };
      }
    });

    let totalPublished = 0;

    for (let start = 1; start <= pageCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, pageCount);
      const batchStart = start;
      const batchEnd = end;

      const batchPublished = await step.run(
        `extract-pages-${batchStart}-${batchEnd}`,
        async () => {
          const refResolver = await createResolver(supabase);
          const buf = await downloadIssuePdf(issue.storage_path);
          const text = await extractPageRange(buf, batchStart, batchEnd);

          await supabase.from("issue_text_chunks").upsert(
            {
              issue_id: issueId,
              page_start: batchStart,
              page_end: batchEnd,
              text_content: text,
            },
            { onConflict: "issue_id,page_start,page_end" }
          );

          const sections = detectSections(text, batchStart, batchEnd);
          let publishedInBatch = 0;

          for (const section of sections) {
            const suggestion = await suggestContentItem(
              section.rawText,
              normalizeContentType(section.suggestedType, "article"),
              section.confidence
            );

            const refs = await resolveForExtraction(
              refResolver,
              section.rawText,
              suggestion
            );

            if (autoPublish) {
              const result = await autoPublishExtractedItem(supabase, {
                issueId,
                issueDate: issue.issue_date,
                suggestion,
                categoryId: refs.categoryId,
                ministryId: refs.ministryId,
                ministryName: refs.ministryName,
                tenderCategoryId: refs.tenderCategoryId,
                pageStart: section.pageStart,
                pageEnd: section.pageEnd,
                actorId: issue.uploaded_by,
              });
              if (result.published) publishedInBatch++;
            } else {
              await supabase.from("content_drafts").insert({
                issue_id: issueId,
                content_type: suggestion.content_type,
                category_id: refs.categoryId,
                ministry_id: refs.ministryId,
                tender_category_id: refs.tenderCategoryId,
                title_ar: suggestion.title_ar,
                summary_ar: suggestion.summary_ar,
                body_ar: suggestion.body_ar,
                page_start: section.pageStart,
                page_end: section.pageEnd,
                raw_extracted_text: section.rawText.slice(0, 15000),
                confidence_score: suggestion.confidence,
                status: "suggested",
                source_name: "كويت اليوم",
              });
            }
          }

          const progress = Math.round((batchEnd / pageCount) * 100);

          await supabase
            .from("pdf_issues")
            .update({ extraction_progress: progress })
            .eq("id", issueId);

          await supabase
            .from("extraction_jobs")
            .update({
              pages_done: batchEnd,
              pages_total: pageCount,
              last_page_processed: batchEnd,
            })
            .eq("issue_id", issueId)
            .eq("status", "running");

          return publishedInBatch;
        }
      );

      totalPublished += batchPublished;
    }

    await step.run("finalize", async () => {
      await supabase
        .from("pdf_issues")
        .update({
          extraction_status: "ready",
          extraction_progress: 100,
          error_message: null,
        })
        .eq("id", issueId);

      await supabase
        .from("extraction_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          pages_done: pageCount,
          pages_total: pageCount,
        })
        .eq("issue_id", issueId)
        .eq("status", "running");
    });

    return { issueId, pageCount, totalPublished, autoPublish };
    } catch (error) {
      await markIssueFailed(issueId, formatPdfError(error));
      throw error;
    }
  }
);
