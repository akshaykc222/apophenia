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
  description: `شروط استخدام تطبيق ${PUBLIC_APP_NAME_AR} (${PUBLIC_APP_NAME_EN})`,
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

        <section className="mb-8 space-y-4 text-zinc-300">
          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              1. القبول
            </h2>
            <p>
              باستخدامك تطبيق {PUBLIC_APP_NAME_AR} فإنك توافق على هذه الشروط
              وعلى{" "}
              <Link href="/privacy" className="text-sky-400 underline">
                سياسة الخصوصية
              </Link>
              . إذا لم توافق، لا تستخدم التطبيق.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              2. الخدمة والاشتراك
            </h2>
            <p>
              {PUBLIC_APP_NAME_AR} يتطلّب <strong>تسجيل دخول إلزامي</strong>.
              لا يمكن استخدام التطبيق دون إنشاء حساب وتسجيل الدخول. بعد
              تسجيل الدخول، يتطلّب الوصول إلى المحتوى (الأخبار، المراسيم،
              المناقصات، البحث، مساعد الذكاء الاصطناعي، وغيرها){" "}
              <strong>اشتراكاً مدفوعاً نشطاً</strong>. لا يوجد وضع ضيف أو
              تصفّح بدون حساب.
            </p>
            <p className="mt-2">
              تفاصيل الخطط والأسعار معروضة داخل التطبيق. المدفوعات تتم عبر
              MyFatoorah. المدفوعات غير قابلة للاسترداد إلا حيث يفرض القانون
              الكويتي ذلك.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              3. المحتوى
            </h2>
            <p>
              المحتوى الإخباري والمناقصات المعروضة لأغراض معلوماتية. المصدر
              الرسمي للنشرة هو الجريدة الرسمية (السور / كويت اليوم) والجهات
              الرسمية المعنية. نبذل جهدنا لدقة المحتوى لكن لا نضمن اكتماله
              أو حداثته في كل وقت.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              4. حسابك
            </h2>
            <p>
              أنت مسؤول عن سرية بيانات تسجيل الدخول. يحظر إساءة استخدام
              الخدمة، مشاركة الحساب بطريقة تخالف الاشتراك، أو محاولة اختراق
              الأنظمة.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              5. الإنهاء
            </h2>
            <p>
              يمكنك إيقاف استخدام التطبيق وحذف حسابك بالتواصل معنا. انتهاء
              أو إلغاء الاشتراك يوقف وصولك إلى المحتوى المدفوع. نحتفظ بحق
              تعليق الحسابات التي تخالف هذه الشروط.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-50">
              6. English summary
            </h2>
            <p className="text-zinc-400">
              Al-Soor ({PUBLIC_APP_NAME_AR}) requires mandatory sign-in — you
              cannot use the app without registering and signing in. An active
              paid subscription is also required to access content. No guest
              mode. Payments via MyFatoorah; refunds only where required by
              Kuwaiti law. Contact {SUPPORT_EMAIL} for support.
            </p>
          </div>

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
