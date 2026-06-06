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
  description: `سياسة الخصوصية لتطبيق ${PUBLIC_APP_NAME_AR} (${PUBLIC_APP_NAME_EN}) على iOS وAndroid`,
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
            استخدامك لتطبيق {PUBLIC_APP_NAME_AR} (&quot;{PUBLIC_APP_NAME_EN}
            &quot;) على iOS وAndroid. نلتزم بالشفافية وبتقليل جمع البيانات إلى
            ما يلزم لتشغيل الخدمة.
          </p>
          <p className="mt-3">
            <strong>مهم:</strong> التطبيق خدمة مدفوعة بالاشتراك. لا يمكن الوصول
            إلى المحتوى أو الميزات الأساسية إلا بعد إنشاء حساب وتفعيل اشتراك
            مدفوع نشط. هذا جزء من سياسة الخدمة التجارية وليس خياراً اختيارياً
            للمستخدم.
          </p>
        </Section>

        <Section title="2. من نحن (مسؤول البيانات)">
          <p>
            المشغّل: <strong>Alfa Resi</strong> / فريق تطبيق {PUBLIC_APP_NAME_AR}
            .
          </p>
          <p className="mt-2">
            للاستفسارات المتعلقة بالخصوصية أو حذف البيانات:{" "}
            <a className="text-sky-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="3. نطاق الخدمة والوصول">
          <p>لاستخدام التطبيق يجب عليك:</p>
          <ol className="mt-2 list-decimal space-y-2 ps-6">
            <li>إنشاء حساب مستخدم (البريد الإلكتروني وكلمة المرور).</li>
            <li>الموافقة على هذه السياسة وشروط الاستخدام عند التسجيل.</li>
            <li>شراء وتفعيل اشتراك مدفوع نشط للوصول إلى المحتوى والميزات.</li>
          </ol>
          <p className="mt-3">
            بعد تسجيل الدخول، يمكنك الوصول إلى: الأخبار والمراسيم المنشورة،
            المناقصات، البحث، المفضّلة، مساعد الذكاء الاصطناعي (ضمن الاشتراك)،
            وإشعارات التحديثات (بعد موافقتك).
          </p>
          <p className="mt-3">
            لا نقدّم وضع تصفّح عام أو ضيفاً دون حساب واشتراك. صفحات
            المصادقة والاشتراك فقط متاحة قبل إتمام هذه الخطوات.
          </p>
        </Section>

        <Section title="4. البيانات التي نجمعها">
          <h3 className="mb-2 font-semibold text-zinc-200">
            4.1 بيانات تقدّمها أنت
          </h3>
          <ul className="list-disc space-y-2 ps-6">
            <li>
              <strong>معلومات الحساب:</strong> البريد الإلكتروني، الاسم
              المعروض (اختياري)، وكلمة المرور (تُخزَّن مشفّرة عبر Supabase Auth
              ولا نرى النصّ الأصلي).
            </li>
            <li>
              <strong>رسائل مساعد الذكاء الاصطناعي:</strong> النص الذي ترسله
              لمعالجة طلبك والرد عليك.
            </li>
            <li>
              <strong>المفضّلة:</strong> معرّفات المحتوى التي تحفظها (تُخزَّن
              محلياً على جهازك و/أو مرتبطة بحسابك حسب إعدادات التطبيق).
            </li>
            <li>
              <strong>سجل البحث:</strong> استعلامات البحث الأخيرة (تُخزَّن
              محلياً على جهازك).
            </li>
            <li>
              <strong>بيانات الدفع:</strong> تُعالج عبر MyFatoorah. لا نخزّن
              أرقام البطاقات أو CVV. نحتفظ بسجلات الاشتراك (الخطة، الحالة،
              تاريخ التفعيل/الانتهاء) لإدارة وصولك.
            </li>
          </ul>

          <h3 className="mb-2 mt-6 font-semibold text-zinc-200">
            4.2 بيانات تُجمع تلقائياً
          </h3>
          <ul className="list-disc space-y-2 ps-6">
            <li>
              <strong>رمز إشعارات الدفع (FCM):</strong> عند موافقتك على
              الإشعارات، نخزّن رمز Firebase Cloud Messaging ونوع المنصة
              (iOS/Android) لربطه بحسابك.
            </li>
            <li>
              <strong>بيانات الجلسة:</strong> رموز مصادقة آمنة (JWT) عبر
              Supabase للحفاظ على تسجيل دخولك.
            </li>
            <li>
              <strong>سجلات تقنية:</strong> أخطاء التطبيق وطلبات API الأساسية
              لتحسين الاستقرار والأمان (لا تُستخدم للإعلانات أو التتبع
              عبر التطبيقات).
            </li>
          </ul>

          <h3 className="mb-2 mt-6 font-semibold text-zinc-200">
            4.3 بيانات لا نجمعها
          </h3>
          <ul className="list-disc space-y-2 ps-6">
            <li>لا نجمع الموقع الجغرافي الدقيق.</li>
            <li>لا نستخدم تقنيات تتبع إعلاني عبر التطبيقات (App Tracking).</li>
            <li>لا نبيع بياناتك الشخصية لأطراف ثالثة.</li>
            <li>لا نخزّن بيانات بطاقات الدفع على خوادمنا.</li>
          </ul>
        </Section>

        <Section title="5. كيف نجمع البيانات">
          <ul className="list-disc space-y-2 ps-6">
            <li>مباشرة منك عند التسجيل، تسجيل الدخول، الدفع، أو استخدام الميزات.</li>
            <li>تلقائياً عند تشغيل التطبيق (جلسة المصادقة، سجلات تقنية).</li>
            <li>
              بموافقتك الصريحة عند طلب إذن الإشعارات من نظام iOS أو Android.
            </li>
            <li>
              عبر مزوّدي الدفع والبنية التحتية عند إتمام الاشتراك (MyFatoorah).
            </li>
          </ul>
        </Section>

        <Section title="6. كيف نستخدم البيانات">
          <ul className="list-disc space-y-2 ps-6">
            <li>إنشاء حسابك والتحقق من هويتك.</li>
            <li>التحقق من اشتراكك النشط ومنح الوصول إلى المحتوى.</li>
            <li>معالجة المدفوعات وإرسال إيصالات الاشتراك.</li>
            <li>تقديم المحتوى، البحث، المناقصات، والمفضّلة.</li>
            <li>تشغيل مساعد الذكاء الاصطناعي ضمن نطاق الخدمة.</li>
            <li>إرسال إشعارات التحديثات ذات الصلة (بعد موافقتك).</li>
            <li>الامتثال للقانون، منع الاحتيال، وحماية أمن المنصة.</li>
          </ul>
        </Section>

        <Section title="7. مشاركة البيانات مع أطراف ثالثة">
          <p>
            نشارك البيانات الضرورية فقط مع مزوّدي الخدمة التاليين، وكل منهم
            ملزم تعاقدياً بحماية بياناتك:
          </p>
          <ul className="mt-2 list-disc space-y-2 ps-6">
            <li>
              <strong>Supabase</strong> — قاعدة البيانات، المصادقة، وتخزين
              رموز الأجهزة (استضافة آمنة مع RLS).
            </li>
            <li>
              <strong>Vercel</strong> — واجهات API للتطبيق، الفوترة، ومساعد
              الذكاء الاصطناعي.
            </li>
            <li>
              <strong>Firebase Cloud Messaging (Google)</strong> — إشعارات
              الدفع (بعد موافقتك).
            </li>
            <li>
              <strong>MyFatoorah</strong> — معالجة المدفوعات في الكويت.
            </li>
            <li>
              <strong>Resend</strong> — إرسال رسائل البريد (إيصالات الاشتراك
              والتواصل المتعلق بالخدمة).
            </li>
            <li>
              <strong>OpenAI</strong> — معالجة نص رسائل مساعد الذكاء
              الاصطناعي فقط عند استخدامك لهذه الميزة.
            </li>
          </ul>
          <p className="mt-3">
            لا نشارك بياناتك لأغراض إعلانية. قد نكشف عن بيانات إذا فرض
            القانون أو أمر قضائي ذلك.
          </p>
        </Section>

        <Section title="8. الاشتراك والمدفوعات">
          <p>
            التطبيق يعمل بنموذج اشتراك مدفوع. تفاصيل الخطط والأسعار معروضة
            داخل التطبيق قبل الدفع. المدفوعات تتم عبر MyFatoorah (أو SDK
            الدفع الأصلي حيث يُفعَّل). نحتفظ بسجل اشتراكك لإثبات وصولك
            وإدارة التجديد.
          </p>
          <p className="mt-3">
            إلغاء الاشتراك أو انتهاؤه يوقف الوصول إلى المحتوى والميزات
            المدفوعة. سياسة الاسترداد موضّحة في{" "}
            <Link href="/terms" className="text-sky-400 underline">
              شروط الاستخدام
            </Link>
            .
          </p>
        </Section>

        <Section title="9. الإشعارات">
          <p>
            يمكنك رفض أو إلغاء إشعارات الدفع من إعدادات جهاز iOS أو Android
            في أي وقت. عند تفعيل الاشتراك قد نرسل إشعاراً داخل التطبيق و/أو
            رسالة بريد إلكتروني بإيصال الدفع. لا نرسل رسائل تسويقية غير
            مرغوبة دون موافقة منفصلة.
          </p>
        </Section>

        <Section title="10. التخزين والأمان">
          <p>
            نستخدم تشفير النقل (HTTPS/TLS) وضوابط وصول على قاعدة البيانات
            (Row Level Security في Supabase). كلمات المرور لا تُخزَّن بنصّ
            واضح. نحتفظ بالبيانات طالما كان حسابك و/أو اشتراكك نشطاً، أو
            كما يقتضيه القانون والفوترة والمحاسبة.
          </p>
        </Section>

        <Section title="11. الاحتفاظ بالبيانات">
          <ul className="list-disc space-y-2 ps-6">
            <li>
              <strong>بيانات الحساب:</strong> طوال مدة نشاط الحساب، ثم
              تُحذف أو تُ anonymize خلال 30 يوماً من طلب الحذف (ما لم يمنع
              القانون الاحتفاظ بها).
            </li>
            <li>
              <strong>سجلات الاشتراك والفوترة:</strong> كما يقتضيه القانون
              الكويتي والمحاسبة (قد تُحفظ لفترة أطول).
            </li>
            <li>
              <strong>رسائل الذكاء الاصطناعي:</strong> تُعالَج لإتمام الطلب؛
              لا نستخدمها للإعلان. قد تُحتفظ مؤقتاً في سجلات الخادم للأمان
              واستكشاف الأخطاء.
            </li>
            <li>
              <strong>البيانات المحلية على الجهاز</strong> (المفضّلة، سجل
              البحث): تبقى على جهازك حتى تحذفها أو تزيل التطبيق.
            </li>
          </ul>
        </Section>

        <Section title="12. حقوقك">
          <p>يمكنك طلب:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6">
            <li>الاطلاع على بيانات حسابك أو تصحيحها.</li>
            <li>
              حذف حسابك وبياناتك المرتبطة (ما لم يمنع القانون أو متطلبات
              الفوترة ذلك).
            </li>
            <li>سحب موافقة الإشعارات من إعدادات النظام.</li>
            <li>الاعتراض على معالجة غير ضرورية (حيث ينطبق القانون).</li>
          </ul>
          <p className="mt-3">
            <strong>حذف الحساب:</strong> راسلنا على{" "}
            <a className="text-sky-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            من بريدك المسجّل مع طلب &quot;حذف الحساب&quot;. سنؤكد الهوية
            ونكمل الطلب خلال 30 يوماً عمل. حذف الحساب يلغي اشتراكك ووصولك
            إلى المحتوى.
          </p>
        </Section>

        <Section title="13. خصوصية الأطفال">
          <p>
            التطبيق موجّه للجمهور العام وليس للأطفال دون 13 عاماً. لا نجمع
            عن قصد بيانات شخصية من دون هذا العمر. إذا علمنا بجمع بيانات طفل،
            سنحذفها.
          </p>
        </Section>

        <Section title="14. النقل الدولي">
          <p>
            قد تُعالَج البيانات على خوادم خارج دولة الكويت (مثل الاتحاد
            الأوروبي أو الولايات المتحدة) عبر مزوّدين المذكورين أعلاه، مع
            ضمانات تعاقدية ومعايير أمن مناسبة.
          </p>
        </Section>

        <Section title="15. التغييرات">
          <p>
            قد نحدّث هذه السياسة. سننشر النسخة الجديدة على هذا الرابط مع
            تاريخ التحديث. استمرارك في استخدام التطبيق بعد التحديثات الجوهرية
            يعني قبولك للسياسة المحدّثة.
          </p>
        </Section>

        <Section title="16. Privacy Policy (English)">
          <div className="space-y-3 text-zinc-400">
            <p>
              This Privacy Policy describes how <strong>Al-Soor</strong> (
              {PUBLIC_APP_NAME_AR}), operated by <strong>Alfa Resi</strong>,
              collects, uses, and protects personal information on iOS and
              Android.
            </p>
            <p>
              <strong>Subscription required:</strong> Al-Soor is a paid
              subscription service. You must create an account and maintain an
              active paid subscription to access content and core features.
              There is no guest or free browsing mode. This is our business
              model, not an optional setting.
            </p>
            <p>
              <strong>Data we collect:</strong> account information (email,
              display name, hashed password via Supabase Auth); subscription
              and billing records (payment card data is processed by MyFatoorah
              and not stored by us); AI assistant chat messages you send;
              bookmarks and recent searches (stored locally on your device);
              push notification tokens (FCM) with your consent; session/auth
              tokens; and basic technical logs for security and stability.
            </p>
            <p>
              <strong>How we use data:</strong> to authenticate you, verify
              active subscription, deliver content (news, decrees, tenders,
              search), run the AI assistant, process payments and receipts,
              send service notifications (with consent), and comply with law.
            </p>
            <p>
              <strong>Third-party processors:</strong> Supabase (database &
              auth), Vercel (API hosting), Firebase Cloud Messaging (push
              notifications), MyFatoorah (payments), Resend (email), and
              OpenAI (AI assistant message processing). We do not sell personal
              data. We do not use cross-app advertising tracking.
            </p>
            <p>
              <strong>Your rights:</strong> access, correction, and deletion
              of your account data. To delete your account, email{" "}
              <a className="text-sky-400 underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{" "}
              from your registered email with subject &quot;Account Deletion&quot;.
              You can disable push notifications in device settings at any
              time.
            </p>
            <p>
              <strong>Children:</strong> not intended for users under 13.
            </p>
            <p>
              <strong>Contact:</strong> {SUPPORT_EMAIL}. Last updated:{" "}
              {PRIVACY_LAST_UPDATED}.
            </p>
          </div>
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
