import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "أضف SUPABASE_SERVICE_ROLE_KEY في .env.local (Supabase → Settings → API → service_role)",
      },
      { status: 503 }
    );
  }

  const body = await request.json();
  const email = body.email as string;
  const password = body.password as string;
  const displayName = (body.display_name as string) || "Admin";

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "البريد وكلمة المرور (6 أحرف على الأقل) مطلوبان" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json(
      { error: "يوجد مسؤول بالفعل. استخدم صفحة تسجيل الدخول." },
      { status: 403 }
    );
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  const { error: adminError } = await supabase.from("admin_users").insert({
    user_id: userId,
    display_name: displayName,
  });

  if (adminError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "تم إنشاء المسؤول. يمكنك تسجيل الدخول الآن.",
    user_id: userId,
  });
}
