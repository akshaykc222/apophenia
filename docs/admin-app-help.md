# Admin: in-app help section

Manage FAQ content shown in the Flutter app under **الملف الشخصي → المساعدة**.

## Database

Run migrations:

- `supabase/migrations/010_app_help.sql` — tables + sample FAQ (Arabic)
- `supabase/migrations/011_app_help_seed.sql` — only if you ran 010 earlier without FAQ rows

- `app_help_page` — singleton (title, intro, contact email/phone)
- `app_help_items` — FAQ rows (`title_ar`, `body_ar`, `sort_order`, `is_published`)

RLS: mobile reads published items and the help page via anon/authenticated; admins have full access.

## Admin UI

**Path:** `/help` (sidebar: **المساعدة**)

1. **صفحة المساعدة** — page title, intro paragraph, contact details.
2. **أسئلة شائعة** — add/edit/delete Q&A items; toggle **منشور** to hide from the app without deleting.

## Flutter

- Route: `/help`
- Reads `app_help_page` + `app_help_items` where `is_published = true`
- Expansion tiles for each FAQ; mailto/tel for contact fields

No admin API required in the app — Supabase RLS allows direct reads.
