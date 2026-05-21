import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          إعدادات التطبيق — رفع الجريدة والإصدارات.
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
