import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { logAudit } from "@/lib/audit";
import { sanitizeStorageFilename } from "@/lib/utils";
import { getAppSettings } from "@/lib/settings/app-settings";
import { isPdfUploadDay, pdfUploadBlockedMessageAr } from "@/lib/issues/upload-window";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const appSettings = await getAppSettings(supabase);
  if (!isPdfUploadDay(appSettings.pdf_upload_weekday)) {
    return NextResponse.json(
      { error: pdfUploadBlockedMessageAr(appSettings.pdf_upload_weekday) },
      { status: 403 }
    );
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

  const service = createServiceClient();
  const issueId = crypto.randomUUID();
  const storageFilename = sanitizeStorageFilename(file.name);
  const storagePath = `${issueId}/${storageFilename}`;

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
