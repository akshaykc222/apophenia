import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import {
  isPdfUploadDay,
  pdfUploadBlockedMessageAr,
} from "@/lib/issues/upload-window";
import { cn } from "@/lib/utils";

type UploadIssueLinkProps = {
  children: React.ReactNode;
  className?: string;
};

export async function UploadIssueLink({ children, className }: UploadIssueLinkProps) {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);
  const uploadAllowed = isPdfUploadDay(settings.pdf_upload_weekday);

  if (uploadAllowed) {
    return (
      <Link href="/issues/new" className={className}>
        {children}
      </Link>
    );
  }

  return (
    <span
      className={cn(className, "cursor-not-allowed opacity-50")}
      title={pdfUploadBlockedMessageAr(settings.pdf_upload_weekday)}
    >
      {children}
    </span>
  );
}

export async function UploadBlockedHint() {
  const supabase = await createClient();
  const settings = await getAppSettings(supabase);
  if (isPdfUploadDay(settings.pdf_upload_weekday)) return null;
  return (
    <p className="text-xs text-zinc-500">
      {pdfUploadBlockedMessageAr(settings.pdf_upload_weekday)}
    </p>
  );
}
