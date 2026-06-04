import type { Metadata } from "next";
import Link from "next/link";
import {
  PRIVACY_LAST_UPDATED,
  PUBLIC_APP_NAME_AR,
  PUBLIC_APP_NAME_EN,
  SUPPORT_EMAIL,
} from "@/lib/legal/public-app";

export const metadata: Metadata = {
  title: `شروط الاستخدام — ${PUBLIC_APP_NAME_AR}`,
  description: `شروط استخدام تطبيق ${PUBLIC_APP_NAME_AR}`,
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <article className="mx-auto max-w-3xl px-6 py-12 leading-relaxed">
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl font-bold">شروط الاستخدام</h1>
          <p className="mt-2 text-zinc-400">
            {PUBLIC_APP_NAME_AR} ({PUBLIC_APP_NAME_EN}) — آخر تحديث:{" "}
            {PRIVACY_LAST_UPDATED}
          </p>
        </header>

        <section className="mb-8 space-y-3 text-zinc-300">
          <p>
            باستخدامك التطبيق فإنك توافق على هذه الشروط. المحتوى الإخباري
            والمناقصات المعروضة لأغراض معلوماتية؛ المصدر الرسمي للنشرة هو جريدة
            كويت اليوم والجهات الرسمية المعنية.
          </p>
          <p>
            الاشتراك المدفوع يمنحك ميزات إضافية (مثل مساعد الذكاء الاصطناعي)
            وفق الخطة المختارة. المدفوعات غير قابلة للاسترداد إلا حيث يفرض
            القانون ذلك.
          </p>
          <p>
            أنت مسؤول عن سرية حسابك. يحظر إساءة استخدام الخدمة أو محاولة
            اختراق الأنظمة.
          </p>
          <p>
            للدعم:{" "}
            <a className="text-sky-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <footer className="text-sm text-zinc-500">
          <Link href="/privacy" className="text-sky-400 underline">
            سياسة الخصوصية
          </Link>
        </footer>
      </article>
    </main>
  );
}
