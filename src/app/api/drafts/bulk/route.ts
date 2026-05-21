import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { publishDraft } from "@/lib/content/publish";
import type { ContentDraft } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json();
  const { action, draftIds } = body as {
    action: "publish" | "reject";
    draftIds: string[];
  };

  if (!draftIds?.length) {
    return NextResponse.json({ error: "لا توجد مسودات محددة" }, { status: 400 });
  }

  if (action === "reject") {
    await supabase
      .from("content_drafts")
      .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .in("id", draftIds);
    return NextResponse.json({ ok: true });
  }

  const results = [];
  for (const id of draftIds) {
    const { data: draft } = await supabase
      .from("content_drafts")
      .select("*")
      .eq("id", id)
      .single();
    if (draft && draft.title_ar) {
      try {
        const item = await publishDraft(supabase, draft as ContentDraft, user.id);
        results.push({ id, ok: true, itemId: item.id });
      } catch {
        results.push({ id, ok: false });
      }
    }
  }

  return NextResponse.json({ results });
}
