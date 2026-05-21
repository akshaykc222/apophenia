import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";

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

  await inngest.send({
    name: "gazette/issue.uploaded",
    data: { issueId: id },
  });

  await service
    .from("pdf_issues")
    .update({ extraction_status: "processing" })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
