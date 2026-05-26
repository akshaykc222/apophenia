import Link from "next/link";

export function ExtractionAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-900/50 bg-amber-950/40 p-4 text-sm text-amber-100">
      <p className="font-medium">تعذّر متابعة الاستخراج تلقائياً</p>
      <p className="mt-2 text-amber-200/90">{message}</p>
      <p className="mt-3 text-xs text-amber-300/80">
        على Vercel: Inngest → Create app → Sync URL{" "}
        <code className="rounded bg-black/40 px-1" dir="ltr">
          https://apophenia-five.vercel.app/api/inngest
        </code>
        — ثم أضف{" "}
        <code className="rounded bg-black/40 px-1" dir="ltr">
          INNGEST_EVENT_KEY
        </code>{" "}
        و{" "}
        <code className="rounded bg-black/40 px-1" dir="ltr">
          INNGEST_SIGNING_KEY
        </code>{" "}
        في إعدادات Vercel وأعد النشر.
      </p>
      <p className="mt-2 text-xs text-amber-300/80">
        بعد الإعداد اضغط «إعادة الاستخراج» أدناه.
      </p>
    </div>
  );
}

export function InngestSetupHint() {
  return (
    <p className="text-xs text-zinc-500">
      الاستخراج يعمل عبر{" "}
      <Link
        href="https://www.inngest.com/docs/deploy/vercel"
        className="text-zinc-400 underline hover:text-white"
        target="_blank"
        rel="noreferrer"
      >
        Inngest
      </Link>
      . بدون مفاتيح Inngest على Vercel يبقى الإصدار عالقاً في الانتظار.
    </p>
  );
}
