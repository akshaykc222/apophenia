# CAPT tender sync (Firecrawl)

Daily sync of open tenders from [CAPT](https://capt.gov.kw/en/) into `capt_tenders`, with `is_latest` and automatic expiry.

CAPT is behind Cloudflare — sync uses [Firecrawl](https://firecrawl.dev) to scrape and extract structured tender data.

## 1. Firecrawl account

1. Sign up at [firecrawl.dev](https://firecrawl.dev) (no card for free tier).
2. Dashboard → **API Keys** → copy your key.
3. Free tier: **500 one-time credits** (~1 credit per daily sync ≈ ~500 days). Extract mode may use more credits per page.

## 2. Vercel environment

| Variable | Value |
|----------|--------|
| `FIRECRAWL_API_KEY` | Your Firecrawl API key |
| `CAPT_TENDERS_URL` | (optional) Listing page URL — default `https://capt.gov.kw/en/` |
| `CAPT_SYNC_ENABLED` | `true` (default) |

Add locally in `.env.local` for testing, then **Production** in Vercel → Settings → Environment Variables → redeploy.

## 3. Supabase migration

Run [`014_capt_tenders.sql`](../supabase/migrations/014_capt_tenders.sql) on project `ixqrfjqhlxpjsbaswcpk`.

## 4. Inngest

Ensure Inngest is synced to `/api/inngest` on Vercel (same as PDF extraction).

Cron: **`0 5 * * *`** (daily 05:00 UTC) — function `sync-capt-tenders`.

## 5. Admin

Open **مناقصات CAPT** in the dashboard → **مزامنة الآن** to test after deploy.

Or: `POST /api/capt/sync` (admin session required).

## 6. CAPT listing URL

If the default homepage returns too few tenders, browse CAPT in a browser, open the **open tenders** listing page, and set that URL as `CAPT_TENDERS_URL`.

## Sync logic

1. Firecrawl scrape + AI extract → tender rows.
2. Upsert by `external_ref`; `is_latest = true`, update `last_seen_at`.
3. **Expire** if past `deadline_at` or missing from latest successful sync.
4. Gazette `content_items` tenders: latest issue → `is_latest`; past deadline → `tender_status = expired`.

## Flutter

Query `capt_tenders` where `status = 'open'` (RLS: authenticated read).

## Credits tip

One sync per day ≈ 1 scrape. Stay on the free tier by avoiding manual sync spam. Monitor usage in the Firecrawl dashboard.

## Gazette fallback

Tenders also appear in **كويت اليوم** PDF — your extraction pipeline publishes those to `content_items` without Firecrawl.
