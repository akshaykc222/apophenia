import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";
import { logAudit } from "@/lib/audit";
import {
  assertPdfUploadAllowed,
  validatePdfUploadMeta,
} from "@/lib/issues/upload-shared";
import type { IssueFrequency } from "@/lib/types/database";

export const maxDuration = 60;

/** After client uploaded PDF to Supabase Storage — create row and start extraction. */
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

  let body: {
    issue_id?: string;
    storage_path?: string;
    issue_date?: string;
    frequency?: string;
    notes?: string | null;
    original_filename?: string;
    file_size_bytes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const issueId = body.issue_id?.trim();
  const storagePath = body.storage_path?.trim();
  const issueDate = body.issue_date?.trim();
  const frequency = (body.frequency as IssueFrequency) || "weekly";

  if (!issueId || !storagePath || !issueDate) {
    return NextResponse.json(
      { error: "معرف الإصدار والمسار وتاريخ الإصدار مطلوبان" },
      { status: 400 }
    );
  }

  if (!storagePath.startsWith(`${issueId}/`)) {
    return NextResponse.json({ error: "مسار التخزين غير صالح" }, { status: 400 });
  }

  if (!["daily", "weekly"].includes(frequency)) {
    return NextResponse.json({ error: "التكرار غير صالح" }, { status: 400 });
  }

  const meta = validatePdfUploadMeta({
    original_filename: body.original_filename,
    file_size_bytes: body.file_size_bytes,
  });
  if (!meta.ok) {
    return NextResponse.json({ error: meta.error }, { status: 400 });
  }

  const service = createServiceClient();
  const folder = issueId;
  const fileName = storagePath.slice(folder.length + 1);
  const { data: listed, error: listError } = await service.storage
    .from("gazettes")
    .list(folder, { search: fileName, limit: 1 });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const found = listed?.some((o) => o.name === fileName);
  if (!found) {
    return NextResponse.json(
      {
        error:
          "لم يُعثر على الملف في التخزين. تأكد من اكتمال الرفع إلى Supabase قبل الإنهاء.",
      },
      { status: 400 }
    );
  }

  const { data: issue, error: insertError } = await service
    .from("pdf_issues")
    .insert({
      id: issueId,
      issue_date: issueDate,
      frequency,
      storage_path: storagePath,
      original_filename: meta.originalFilename,
      file_size_bytes: meta.fileSizeBytes,
      extraction_status: "pending",
      notes: body.notes?.trim() || null,
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
    payload: { filename: meta.originalFilename, issue_date: issueDate },
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
