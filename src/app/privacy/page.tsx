import type { Metadata } from "next";
import Link from "next/link";
import {
  PRIVACY_LAST_UPDATED,
  PUBLIC_APP_NAME_AR,
  PUBLIC_APP_NAME_EN,
  SUPPORT_EMAIL,
} from "@/lib/legal/public-app";

export const metadata: Metadata = {
  title: `سياسة الخصوصية — ${PUBLIC_APP_NAME_AR}`,
  description: `سياسة الخصوصية لتطبيق ${PUBLIC_APP_NAME_AR} (${PUBLIC_APP_NAME_EN})`,
  robots: "index, follow",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <article className="mx-auto max-w-3xl px-6 py-12 leading-relaxed">
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <p className="text-sm text-zinc-500">{PUBLIC_APP_NAME_EN}</p>
          <h1 className="mt-2 text-3xl font-bold">سياسة الخصوصية</h1>
          <p className="mt-2 text-zinc-400">
            تطبيق {PUBLIC_APP_NAME_AR} — آخر تحديث: {PRIVACY_LAST_UPDATED}
          </p>
        </header>

        <Section title="1. مقدمة">
          <p>
            توضّح هذه السياسة كيفية جمع واستخدام وحماية المعلومات الشخصية عند
            استخدامك لتطبيق {PUBLIC_APP_NAME_AR} على iOS وAndroid (&quot;
            {PUBLIC_APP_NAME_EN}&quot;). نلتزم بمبادئ الشفافية وتقليل جمع
            البيانات: لا نطلب إنشاء حساب للوصول إلى المحتوى العام (الأخبار
            والمناقصات المنشورة).
          </p>
        </Section>

        <Section title="2. من نحن">
          <p>
            المشغّل: Alfa Resi / فريق تطبيق {PUBLIC_APP_NAME_AR}. للاستفسارات
            المتعلقة بالخصوصية:{" "}
            <a className="text-sky-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="3. ما الذي يمكنك استخدامه دون حساب">
          <ul className="list-disc space-y-2 ps-6">
            <li>تصفّح آخر الأخبار والمقالات المنشورة من الجريدة الرسمية.</li>
            <li>عرض أحدث مناقصات الجهاز المركزي للمناقصات العامة (CAPT).</li>
            <li>البحث في المحتوى المنشور وقراءة التفاصيل.</li>
            <li>صفحات المساعدة والأسئلة الشائعة.</li>
          </ul>
        </Section>

        <Section title="4. متى نطلب حساباً">
          <p>إنشاء حساب اختياري ومطلوب فقط للميزات المرتبطة بالحساب، مثل:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6">
            <li>حفظ المفضّلة ومزامنتها مع حسابك.</li>
            <li>الاشتراك المدفوع وإدارة الفوترة.</li>
            <li>مساعد الذكاء الاصطناعي (يتطلب اشتراكاً نشطاً).</li>
            <li>استلام إشعارات مرتبطة بحسابك أو اشتراكك.</li>
          </ul>
          <p className="mt-3">
            عند التسجيل نجمع: البريد الإلكتروني، الاسم الكامل (اختياري عند
            التسجيل)، كلمة مرور مشفّرة عبر مزوّد المصادقة، ورقم الهاتف إن
            أدخلته لاحقاً.
          </p>
        </Section>

        <Section title="5. البيانات التي نجمعها">
          <h3 className="mb-2 font-semibold text-zinc-200">5.1 بيانات تقدّمها</h3>
          <ul className="list-disc space-y-2 ps-6">
            <li>معلومات الحساب (البريد، الاسم، الهاتف).</li>
            <li>رسائل مساعد الذكاء الاصطناعي لمعالجة طلبك.</li>
            <li>عناصر المفضّلة المرتبطة بحسابك.</li>
            <li>بيانات الدفع تُعالج عبر MyFatoorah؛ لا نخزّن أرقام البطاقات.</li>
          </ul>

          <h3 className="mb-2 mt-6 font-semibold text-zinc-200">
            5.2 بيانات تلقائية
          </h3>
          <ul className="list-disc space-y-2 ps-6">
            <li>معرّف الجهاز لإشعارات Firebase (FCM) عند موافقتك.</li>
            <li>سجلات تقنية أساسية (أخطاء، طلبات API) لتحسين الاستقرار.</li>
            <li>بيانات جلسة المصادقة (رموز آمنة عبر Supabase).</li>
          </ul>
        </Section>

        <Section title="6. كيف نستخدم البيانات">
          <ul className="list-disc space-y-2 ps-6">
            <li>تقديم المحتوى والبحث والمناقصات.</li>
            <li>إدارة الاشتراكات والمدفوعات وتأكيدها.</li>
            <li>إرسال إيصالات الدفع والإشعارات المتعلقة بالاشتراك.</li>
            <li>تشغيل مساعد الذكاء الاصطناعي ضمن نطاق الخدمة.</li>
            <li>الامتثال للقانون وحماية أمن المنصة.</li>
          </ul>
          <p className="mt-3">لا نبيع بياناتك الشخصية لأطراف ثالثة.</p>
        </Section>

        <Section title="7. مزوّدو الخدمات">
          <p>نشارك البيانات الضرورية فقط مع:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6">
            <li>
              <strong>Supabase</strong> — قاعدة البيانات والمصادقة (استضافة
              آمنة).
            </li>
            <li>
              <strong>Vercel</strong> — واجهات API للتطبيق والفوترة.
            </li>
            <li>
              <strong>Firebase Cloud Messaging</strong> — إشعارات الدفع (بعد
              موافقتك).
            </li>
            <li>
              <strong>MyFatoorah</strong> — معالجة المدفوعات في الكويت.
            </li>
            <li>
              <strong>Resend</strong> — إرسال رسائل البريد (إيصالات الاشتراك).
            </li>
            <li>
              <strong>OpenAI</strong> — معالجة أسئلة مساعد الذكاء الاصطناعي
              (نص الرسائل فقط عند استخدام الميزة).
            </li>
          </ul>
          <p className="mt-3">
            يخضع كل مزوّد لالتزاماته التعاقدية وأمنية؛ نختار مزوّدين يطبّقون
            معايير حماية معترف بها.
          </p>
        </Section>

        <Section title="8. التخزين والأمان">
          <p>
            نستخدم تشفير النقل (HTTPS/TLS) وضوابط وصول على قاعدة البيانات (RLS
            في Supabase). كلمات المرور لا تُخزَّن بنصّ واضح. نحتفظ بالبيانات
            طالما كان حسابك نشطاً أو كما يقتضيه القانون والفوترة.
          </p>
        </Section>

        <Section title="9. الإشعارات والبريد">
          <p>
            يمكنك رفض إشعارات الدفع من إعدادات الجهاز. عند تفعيل الاشتراك قد
            نرسل إشعاراً داخل التطبيق ورسالة بريد إلكتروني بإيصال الدفع. رسائل
            التسويق غير الإلزامية تتطلب موافقة منفصلة إن وُجدت.
          </p>
        </Section>

        <Section title="10. حقوقك">
          <p>يمكنك طلب:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6">
            <li>الاطلاع على بيانات حسابك أو تصحيحها.</li>
            <li>حذف حسابك وبياناتك المرتبطة (ما لم يمنع القانون ذلك).</li>
            <li>سحب موافقة الإشعارات من إعدادات النظام.</li>
          </ul>
          <p className="mt-3">
            راسلنا على {SUPPORT_EMAIL} مع بريدك المسجّل؛ نرد خلال فترة معقولة.
          </p>
        </Section>

        <Section title="11. الأطفال">
          <p>
            التطبيق موجّه للجمهور العام وليس للأطفال دون 13 عاماً. لا نجمع عن
            قصد بيانات من دون هذا العمر.
          </p>
        </Section>

        <Section title="12. النقل الدولي">
          <p>
            قد تُعالج البيانات على خوادم خارج دولة الكويت (مثل الاتحاد
            الأوروبي أو الولايات المتحدة) عبر مزوّدين المذكورين أعلاه، مع
            ضمانات تعاقدية مناسبة.
          </p>
        </Section>

        <Section title="13. التغييرات">
          <p>
            قد نحدّث هذه السياسة. سننشر النسخة الجديدة على هذا الرابط مع
            تاريخ التحديث. استمرارك في استخدام الميزات التي تتطلّب حساباً بعد
            التحديث يعني قبولك للتغييرات الجوهرية.
          </p>
        </Section>

        <Section title="14. English summary">
          <p className="text-zinc-400">
            {PUBLIC_APP_NAME_EN} lets you browse published news and public
            tenders without an account. Account creation is optional and required
            only for favorites, subscriptions, AI assistant, and account-linked
            notifications. We use Supabase, Vercel, Firebase, MyFatoorah,
            Resend, and OpenAI as processors. Contact {SUPPORT_EMAIL} for
            privacy requests. Last updated: {PRIVACY_LAST_UPDATED}.
          </p>
        </Section>

        <footer className="mt-12 border-t border-zinc-800 pt-8 text-sm text-zinc-500">
          <Link href="/terms" className="text-sky-400 underline">
            شروط الاستخدام
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-zinc-50">{title}</h2>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}
