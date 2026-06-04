import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/setup");
  const isPublicPage =
    pathname.startsWith("/billing/") ||
    pathname === "/privacy" ||
    pathname === "/terms";
  const isPublicApi =
    pathname.startsWith("/api/inngest") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/mobile-chat") ||
    pathname.startsWith("/api/webhooks/myfatoorah") ||
    pathname.startsWith("/api/billing/plans") ||
    pathname.startsWith("/api/billing/callback") ||
    pathname.startsWith("/api/billing/me") ||
    pathname.startsWith("/api/billing/checkout");

  if (!user && !isAuthRoute && !isPublicApi && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user && !isAuthRoute && !isPublicApi && !isPublicPage) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_admin");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
