import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  assertPdfUploadAllowed,
  buildIssueStoragePath,
  validatePdfUploadMeta,
} from "@/lib/issues/upload-shared";

/** Small JSON request — client uploads PDF directly to Supabase (bypasses Vercel 4.5MB limit). */
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
    original_filename?: string;
    file_size_bytes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const meta = validatePdfUploadMeta(body);
  if (!meta.ok) {
    return NextResponse.json({ error: meta.error }, { status: 400 });
  }

  const issueId = crypto.randomUUID();
  const { storagePath } = buildIssueStoragePath(issueId, meta.originalFilename);

  return NextResponse.json({
    issueId,
    storagePath,
    bucket: "gazettes",
  });
}
