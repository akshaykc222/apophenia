import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import {
  isPdfUploadDay,
  pdfUploadBlockedMessageAr,
} from "@/lib/issues/upload-window";
import { NewIssueForm } from "@/components/issues/new-issue-form";

export default async function NewIssuePage() {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);
  const uploadAllowed = isPdfUploadDay(settings.pdf_upload_weekday);

  return (
    <NewIssueForm
      uploadAllowed={uploadAllowed}
      uploadBlockedMessage={pdfUploadBlockedMessageAr(
        settings.pdf_upload_weekday
      )}
      defaultFrequency={settings.default_issue_frequency}
    />
  );
}
