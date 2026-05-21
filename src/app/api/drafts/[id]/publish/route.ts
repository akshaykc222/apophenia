import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { publishDraft } from "@/lib/content/publish";
import type { ContentDraft } from "@/lib/types/database";

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

  const { data: draft, error } = await supabase
    .from("content_drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "المسودة غير موجودة" }, { status: 404 });
  }

  let ministryName: string | null = null;
  if (draft.ministry_id) {
    const { data: ministry } = await supabase
      .from("ministries")
      .select("name_ar")
      .eq("id", draft.ministry_id)
      .single();
    ministryName = ministry?.name_ar ?? null;
  }

  try {
    const item = await publishDraft(
      supabase,
      draft as ContentDraft,
      user.id,
      ministryName
    );
    return NextResponse.json({ item });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل النشر";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
