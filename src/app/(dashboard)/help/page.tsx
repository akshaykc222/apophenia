import { createServiceClient } from "@/lib/supabase/server";
import { HelpManager } from "@/components/help/help-manager";
import { DEFAULT_HELP_PAGE, type AppHelpItem } from "@/lib/help/types";

export default async function HelpPage() {
  const service = createServiceClient();

  const [{ data: pageRow }, { data: items }] = await Promise.all([
    service
      .from("app_help_page")
      .select("id, title_ar, intro_ar, contact_email, contact_phone, updated_at")
      .eq("id", 1)
      .maybeSingle(),
    service
      .from("app_help_items")
      .select("id, title_ar, body_ar, sort_order, is_published, created_at, updated_at")
      .order("sort_order")
      .order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المساعدة</h1>
        <p className="mt-1 text-sm text-zinc-500">
          محتوى قسم «المساعدة» في تطبيق كويت اليوم — عنوان الصفحة، مقدمة، وأسئلة
          شائعة.
        </p>
      </div>
      <HelpManager
        initialPage={pageRow ?? DEFAULT_HELP_PAGE}
        initialItems={(items ?? []) as AppHelpItem[]}
      />
    </div>
  );
}
