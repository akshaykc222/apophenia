export type AppHelpPage = {
  id: number;
  title_ar: string;
  intro_ar: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  updated_at: string;
};

export type AppHelpItem = {
  id: string;
  title_ar: string;
  body_ar: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_HELP_PAGE: AppHelpPage = {
  id: 1,
  title_ar: "المساعدة",
  intro_ar:
    "مرحباً بك في تطبيق كويت اليوم. هنا تجد إجابات لأكثر الأسئلة شيوعاً حول تصفح الجريدة الرسمية، المناقصات، الإشعارات، والمساعد الذكي.",
  contact_email: "support@kuwaittoday.example",
  contact_phone: "+965 2222 0000",
  updated_at: new Date(0).toISOString(),
};
