import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { fetchAppUsersData } from "@/lib/users/app-users";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  try {
    const service = createServiceClient();
    const { users, analytics } = await fetchAppUsersData(service);

    const filtered = q
      ? users.filter((u) => {
          const email = u.email.toLowerCase();
          const name = (u.display_name ?? "").toLowerCase();
          return email.includes(q) || name.includes(q);
        })
      : users;

    return NextResponse.json({ users: filtered, analytics });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل تحميل المستخدمين";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
