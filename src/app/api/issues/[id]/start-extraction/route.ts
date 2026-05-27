import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { enqueueIssueExtraction } from "@/lib/inngest/enqueue-extraction";

/** Start extraction without deleting existing content (for pending/failed issues). */
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
  const { data: issue, error: loadError } = await service
    .from("pdf_issues")
    .select("id, extraction_status")
    .eq("id", id)
    .single();

  if (loadError || !issue) {
    return NextResponse.json({ error: "الإصدار غير موجود" }, { status: 404 });
  }

  if (issue.extraction_status === "processing") {
    return NextResponse.json(
      { error: "الاستخراج قيد التشغيل بالفعل" },
      { status: 409 }
    );
  }

  if (issue.extraction_status === "ready") {
    return NextResponse.json(
      { error: "اكتمل الاستخراج مسبقاً. استخدم «إعادة الاستخراج» لإعادة المعالجة." },
      { status: 409 }
    );
  }

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
