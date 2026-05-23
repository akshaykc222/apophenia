# apophinia — لوحة الإدارة

Admin panel for uploading **كويت اليوم** government gazette PDFs, semi-automatic Arabic text extraction, human review, and publishing content to Supabase for the mobile app.

## Stack

- **Next.js 16** (App Router, RTL Arabic UI, dark theme)
- **Supabase** (Auth, Postgres, Storage)
- **Inngest** (chunked PDF extraction jobs)
- **pdfjs-dist** (text extraction)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_buckets.sql`
   - `supabase/migrations/003_admin_bootstrap_rls.sql`
   - `supabase/migrations/004_reference_on_delete_set_null.sql`
   - `supabase/migrations/005_dedupe_categories.sql` (cleans duplicate categories)
   - `supabase/migrations/006_app_settings.sql` (upload day & default issue frequency)
   - `supabase/migrations/007_reference_metadata.sql` (reference `source`, `last_seen_at`, auto-prune on upload)
3. Copy `.env.local.example` → `.env.local` and fill keys (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

### 2. First admin user

1. Run `supabase/migrations/003_admin_bootstrap_rls.sql` in SQL Editor.
2. Enable Email auth in Supabase.
3. Open **http://localhost:3000/setup** and create the first admin (e.g. `admin@alfaresi.com`).

Or with service role in `.env.local`, the setup page auto-confirms email. Manual SQL:

```sql
INSERT INTO admin_users (user_id, display_name)
VALUES ('YOUR_AUTH_USER_UUID', 'Admin');
```

### 3. Inngest (local dev)

```bash
npx inngest-cli@latest dev
```

In another terminal:

```bash
npm run dev
```

Set `INNGEST_DEV=1` or configure signing keys for production.

### 4. Optional LLM suggestions

```env
ENABLE_LLM_EXTRACTION=true
OPENAI_API_KEY=sk-...
```

Without this, extraction uses rule-based title/summary/body suggestions.

## Main flows

1. **Upload** — `/issues/new` → PDF to private `gazettes` bucket → Inngest `extract-issue` job.
2. **Auto-publish** (default) — extracted sections go straight to `content_items` (`AUTO_PUBLISH=true`). Optional manual review at `/issues/[id]/review` if you set `AUTO_PUBLISH=false`.
3. **Manual content** — `/content/new` for items without PDF.
4. **Reference data** — categories, ministries, tender categories.

## Mobile app

Published rows in `content_items` with `is_published = true` are readable via RLS (anon/authenticated). Categories and ministries are public read.

## Scripts

```bash
npm run dev      # Next.js
npm run build
npm run lint
```
