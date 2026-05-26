import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { sendPushNotification } from "@/lib/notifications/send-push";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firebase غير مهيأ. أضف FIREBASE_SERVICE_ACCOUNT_JSON في Vercel." },
      { status: 503 }
    );
  }

  let body: {
    title?: string;
    body?: string;
    target_type?: "all" | "selected";
    user_ids?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const title = body.title?.trim();
  const text = body.body?.trim();
  const targetType = body.target_type;

  if (!title || !text) {
    return NextResponse.json({ error: "العنوان والنص مطلوبان" }, { status: 400 });
  }

  if (targetType !== "all" && targetType !== "selected") {
    return NextResponse.json({ error: "نوع الهدف غير صالح" }, { status: 400 });
  }

  const userIds = Array.isArray(body.user_ids) ? body.user_ids : [];

  if (targetType === "selected" && userIds.length === 0) {
    return NextResponse.json({ error: "اختر مستخدم واحد على الأقل" }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const result = await sendPushNotification(service, {
      title,
      body: text,
      targetType,
      userIds,
      sentBy: user.id,
    });

    await logAudit(service, {
      actorId: user.id,
      action: "send_push",
      entityType: "push_campaign",
      entityId: result.campaignId,
      payload: {
        target_type: targetType,
        devices_targeted: result.devicesTargeted,
        success_count: result.successCount,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل الإرسال";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
