import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: issue } = await supabase
    .from("pdf_issues")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!issue) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("gazettes")
    .createSignedUrl(issue.storage_path, 300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
