"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  FolderTree,
  Building2,
  Tags,
  Settings,
  Bell,
  CircleHelp,
  Users,
  ScrollText,
  LogOut,
  CreditCard,
  Receipt,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/issues", label: "إصدارات الجريدة", icon: FileText },
  { href: "/content", label: "المحتوى المنشور", icon: Newspaper },
  { href: "/categories", label: "التصنيفات", icon: FolderTree },
  { href: "/ministries", label: "الجهات", icon: Building2 },
  { href: "/tender-categories", label: "تصنيفات المناقصات", icon: Tags },
  { href: "/users", label: "مستخدمون", icon: Users },
  { href: "/subscriptions/plans", label: "خطط الاشتراك", icon: CreditCard },
  { href: "/subscriptions/enrolled", label: "المشتركون", icon: UserCheck },
  { href: "/subscriptions/transactions", label: "معاملات الدفع", icon: Receipt },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/help", label: "المساعدة", icon: CircleHelp },
  { href: "/notifications/push", label: "إرسال إشعارات", icon: Bell },
  { href: "/audit", label: "سجل التدقيق", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 p-6">
        <h1 className="text-lg font-bold">{APP_NAME}</h1>
        <p className="text-xs text-zinc-500">لوحة الإدارة</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
