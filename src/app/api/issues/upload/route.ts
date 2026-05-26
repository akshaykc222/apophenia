import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { logAudit } from "@/lib/audit";
import {
  assertPdfUploadAllowed,
  buildIssueStoragePath,
  MAX_PDF_BYTES,
} from "@/lib/issues/upload-shared";

/** Legacy single-request upload (works locally). On Vercel use prepare → Supabase → complete. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const gate = await assertPdfUploadAllowed(supabase);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const issueDate = formData.get("issue_date") as string;
  const frequency = (formData.get("frequency") as string) || "weekly";
  const notes = (formData.get("notes") as string) || null;

  if (!file || !issueDate) {
    return NextResponse.json({ error: "الملف وتاريخ الإصدار مطلوبان" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "يجب أن يكون الملف PDF" }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "حجم الملف أكبر من 50 م.ب" }, { status: 400 });
  }

  // Vercel serverless body limit ~4.5MB — direct upload is required in production
  if (file.size > 4 * 1024 * 1024 && process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "الملف كبير لرفع عبر الخادم على Vercel. استخدم الرفع المباشر (يُفعّل تلقائياً من الواجهة).",
        use_direct_upload: true,
      },
      { status: 413 }
    );
  }

  const service = createServiceClient();
  const issueId = crypto.randomUUID();
  const { storagePath } = buildIssueStoragePath(issueId, file.name);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from("gazettes")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: issue, error: insertError } = await service
    .from("pdf_issues")
    .insert({
      id: issueId,
      issue_date: issueDate,
      frequency,
      storage_path: storagePath,
      original_filename: file.name,
      file_size_bytes: file.size,
      extraction_status: "pending",
      notes,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "upload",
    entityType: "pdf_issue",
    entityId: issueId,
    payload: { filename: file.name, issue_date: issueDate },
  });

  try {
    await inngest.send({
      name: "gazette/issue.uploaded",
      data: { issueId },
    });
    await service
      .from("pdf_issues")
      .update({ extraction_status: "processing" })
      .eq("id", issueId);
  } catch (e) {
    console.error("Inngest enqueue failed:", e);
  }

  return NextResponse.json({ issue });
}
