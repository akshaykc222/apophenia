-- In-app help / FAQ (admin-managed, public read in mobile app)

CREATE TABLE app_help_page (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title_ar TEXT NOT NULL DEFAULT 'المساعدة',
  intro_ar TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO app_help_page (
  id,
  title_ar,
  intro_ar,
  contact_email,
  contact_phone
) VALUES (
  1,
  'المساعدة',
  'مرحباً بك في تطبيق كويت اليوم. هنا تجد إجابات لأكثر الأسئلة شيوعاً حول تصفح الجريدة الرسمية، المناقصات، الإشعارات، والمساعد الذكي. إن لم تجد ما تبحث عنه، تواصل معنا عبر البريد أو الهاتف أدناه.',
  'support@kuwaittoday.example',
  '+965 2222 0000'
);

CREATE TABLE app_help_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX app_help_items_sort_idx ON app_help_items (sort_order, created_at);

CREATE TRIGGER app_help_page_updated_at BEFORE UPDATE ON app_help_page
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_help_items_updated_at BEFORE UPDATE ON app_help_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE app_help_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_help_items ENABLE ROW LEVEL SECURITY;

-- Mobile app: read help page and published items
CREATE POLICY app_help_page_public_read ON app_help_page
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY app_help_items_public_read ON app_help_items
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Admin: full manage
CREATE POLICY app_help_page_admin ON app_help_page
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY app_help_items_admin ON app_help_items
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Mock FAQ (edit or replace from admin /help)
INSERT INTO app_help_items (title_ar, body_ar, sort_order, is_published) VALUES
(
  'ما هو تطبيق كويت اليوم؟',
  'تطبيق لقراءة محتوى الجريدة الرسمية «كويت اليوم» بعد نشره: أخبار، مراسيم، ملاحق، ومناقصات حكومية. يتم تحديث المحتوى عند صدور إصدارات جديدة من الجريدة.',
  0,
  true
),
(
  'كيف أتصفح المناقصات والجهات؟',
  'من الشاشة الرئيسية اختر التبويب المناسب (مثل الوزارات أو المناقصات). يمكنك التصفية حسب الجهة أو تصنيف المناقصة، ثم فتح أي عنصر لقراءة التفاصيل والملخص.',
  1,
  true
),
(
  'كيف تعمل الإشعارات؟',
  'فعّل الإشعارات من إعدادات جهازك. عند إرسال إشعار من الإدارة يصل تنبيهاً على هاتفك، ويُحفظ أيضاً في قسم «الإشعارات» داخل التطبيق لمراجعته لاحقاً.',
  2,
  true
),
(
  'ما هو المساعد الذكي؟',
  'تبويب «المساعد» يجيب عن أسئلة متعلقة بالتطبيق والمحتوى المنشور (مثل المناقصات المتاحة). لا يقدّم استشارات قانونية أو مالية — للتفاصيل الرسمية راجع نص الإعلان في الجريدة.',
  3,
  true
),
(
  'كيف أحفظ المفضلة؟',
  'من صفحة أي خبر أو مناقصة اضغط أيقونة المفضلة. تجد كل العناصر المحفوظة في «المفضلة» من الملف الشخصي.',
  4,
  true
),
(
  'هل أحتاج حساباً؟',
  'يمكنك تصفح المحتوى المنشور بعد تسجيل الدخول. الحساب يسمح بحفظ المفضلة، استلام الإشعارات، واستخدام المساعد الذكي.',
  5,
  true
),
(
  'من أين تأتي البيانات؟',
  'المحتوى يُستخرج من إصدارات الجريدة الرسمية ويُراجع قبل النشر عبر لوحة الإدارة. المصدر الرسمي دائماً هو نشرة كويت اليوم.',
  6,
  true
);
