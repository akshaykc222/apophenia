# Inngest on Vercel (PDF extraction)

Gazette PDF extraction runs as a **background job** via [Inngest](https://www.inngest.com), not inside the upload API (which would time out on large PDFs).

If an issue stays **في الانتظار** with no page count, Inngest did not start the job.

## Setup

1. Create an app at [app.inngest.com](https://app.inngest.com).
2. **Sync** your deployment URL:
   - `https://apophenia-five.vercel.app/api/inngest`
3. In Vercel → Project → **Environment Variables** (Production):
   - `INNGEST_EVENT_KEY` — from Inngest → Manage → Event key
   - `INNGEST_SIGNING_KEY` — from Inngest → Manage → Signing key
4. **Redeploy** after adding variables.
5. In Inngest dashboard, confirm function `extract-issue` is registered and events `gazette/issue.uploaded` appear when you upload.

## Local development

```bash
# Terminal 1
npx inngest-cli@latest dev

# Terminal 2
INNGEST_DEV=1 npm run dev
```

## After upload

- Status **جاري الاستخراج** + page count increasing → working.
- Status **في الانتظار** for several minutes → check Vercel env + Inngest sync, then **إعادة الاستخراج** on the issue page.

## Do not set on Vercel production

- `INNGEST_DEV=1` — dev only; use event + signing keys in production.
