import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

const ALLOWED = ["categories", "ministries", "tender_categories"] as const;

type RefTable = (typeof ALLOWED)[number];

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const { table, id } = await params;

  if (!ALLOWED.includes(table as RefTable)) {
    return NextResponse.json({ error: "جدول غير صالح" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const refTable = table as RefTable;

  const fkColumn =
    refTable === "categories"
      ? "category_id"
      : refTable === "ministries"
        ? "ministry_id"
        : "tender_category_id";

  await service
    .from("content_items")
    .update({ [fkColumn]: null })
    .eq(fkColumn, id);

  await service
    .from("content_drafts")
    .update({ [fkColumn]: null })
    .eq(fkColumn, id);

  const { error } = await service.from(refTable).delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23503"
            ? "لا يمكن الحذف: العنصر مرتبط بمحتوى. نفّذ migration 004 في Supabase."
            : error.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
