import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { enqueueIssueExtraction } from "@/lib/inngest/enqueue-extraction";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();

  await service.from("content_drafts").delete().eq("issue_id", id);
  await service.from("content_items").delete().eq("issue_id", id);
  await service.from("issue_text_chunks").delete().eq("issue_id", id);

  await service
    .from("pdf_issues")
    .update({
      extraction_status: "pending",
      extraction_progress: 0,
      error_message: null,
    })
    .eq("id", id);

  const enqueue = await enqueueIssueExtraction(id);

  if (!enqueue.ok) {
    await service
      .from("pdf_issues")
      .update({
        extraction_status: "pending",
        error_message: enqueue.error,
      })
      .eq("id", id);
    return NextResponse.json({ error: enqueue.error }, { status: 503 });
  }

  await service
    .from("pdf_issues")
    .update({
      extraction_status: "processing",
      error_message: null,
      extraction_progress: 0,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
