# Admin task: Mobile AI chat (prompt management + content recommendations)

Copy this brief to your admin-panel developer.

---

## Goal

1. **Flutter** calls `POST /api/mobile-chat` (already implemented in app).
2. **Admin** can edit assistant personality, refusal text, and developer reply from **`/settings`** without redeploying code.
3. **Recommendation questions** (best/أنسب + tenders, decrees, addendums, ministries, tabs) load **filtered published `content_items`** from Supabase (by category, ministry, content type) and inject into the model context (RAG-lite).

---

## Already implemented (verify + deploy)

| Area | Files |
|------|--------|
| Chat API | `src/app/api/mobile-chat/route.ts` |
| Default prompts | `src/lib/ai/mobile-chat-prompt.ts` |
| Content context (RAG) | `src/lib/ai/mobile-chat-context.ts` |
| DB migration | `supabase/migrations/008_mobile_chat_settings.sql` |
| Settings loader | `src/lib/settings/mobile-chat-settings.ts` |
| Admin UI | `src/components/settings/mobile-chat-settings-card.tsx` on `/settings` |
| Settings API | `PATCH /api/settings` accepts `mobile_chat_*` fields |

**No new admin UI code is required** for category/ministry filtering — it is server logic only. Ops: migration + deploy + env.

---

## Database

Run migration **`008_mobile_chat_settings.sql`** on Supabase (adds columns to `app_settings` id=1):

| Column | Purpose |
|--------|---------|
| `mobile_chat_enabled` | Kill switch |
| `mobile_chat_system_prompt` | Full system prompt override (NULL = code default) |
| `mobile_chat_out_of_scope_reply` | Funny refusal + information-source questions |
| `mobile_chat_developer_reply` | Default: `alfaresi solutions` |
| `mobile_chat_temperature` | 0–2, default 0.6 |
| `mobile_chat_max_tokens` | 100–2000, default 700 |

RLS: only admins read/write `app_settings`. Mobile chat API uses **service role** to read settings.

---

## Admin UI (`/settings`)

Section **«مساعد التطبيق (كويت اليوم)»**:

- Toggle enable/disable
- Textarea: system prompt (Arabic, Kuwait tone, scope rules)
- Textarea: out-of-scope / information-source refusal
- Input: developer reply
- Temperature + max tokens
- Buttons: **حفظ إعدادات المساعد** | **استعادة النص الافتراضي**

Saving calls `PATCH /api/settings` with `mobile_chat_*` body (same pattern as PDF upload settings).

---

## Chat API behavior

```
POST /api/mobile-chat
Authorization: Bearer <supabase_user_jwt>
{ "messages": [{ "role": "user"|"assistant", "content": "..." }] }
```

1. Load `getMobileChatSettings(serviceClient)` from DB.
2. If `!enabled` → 503.
3. Developer question → `developer_reply` from DB.
4. Off-topic / information source (regex) → `out_of_scope_reply` from DB.
5. **Content-recommendation question** (أفضل / أنسب / مناقصة / مرسوم / وزارة / تبويب …) → infer filters from question:
   - **Tab:** الوزارات → `ministries`, الاستدراكات → `addendums`, الأحكام والمراسيم → `decrees`
   - **Ministry:** e.g. وزارة الصحة → `ministry_id`
   - **Type:** مناقصة → `tender`, مرسوم → `decree`, استدراك → `addendum`, خبر → `article`
   - Fetch up to 60 published `content_items`, rank by keywords, inject top 15 into system prompt.
6. OpenAI `gpt-4o-mini` with `system_prompt` from DB + content block + conversation.

**Do not** expose `OPENAI_API_KEY` to Flutter.

Full API reference: [mobile-chat-api.md](./mobile-chat-api.md)

---

## Default personality (code fallback)

- **In scope:** كويت اليوم app, published gazette (news, tenders, decrees, addendums), navigation help, recommendations from injected list (any tab/ministry).
- **Out of scope / information source:** funny Kuwait Arabic refusal (admin-editable).
- **Who developed you:** `alfaresi solutions` (admin-editable).
- **Recommendations:** suggest up to 3 from injected list only; never invent items.

---

## Vercel env

| Variable | Required |
|----------|----------|
| `OPENAI_API_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (read `app_settings` in mobile-chat) |
| `MOBILE_CORS_ORIGIN` | Optional |

---

## Flutter (no change for prompt admin)

- `ADMIN_API_URL=https://apophenia-five.vercel.app`
- Bottom tab **المساعد** → `POST {ADMIN_API_URL}/api/mobile-chat`
- Prompt changes apply on next message after admin saves (no app update).

---

## Test checklist

1. Run migration `008` on production Supabase.
2. Deploy Next.js to Vercel.
3. Admin → Settings → edit refusal text → save → ask off-topic question in app → see new text.
4. Ask: «شنو أفضل مناقصة لشركة تقنية؟» → lists real published tenders.
5. Ask: «أفضل مرسوم من وزارة الصحة» → lists decrees filtered by ministry.
6. Ask: «شنو في تبويب الاستدراكات؟» → lists addendums category content.
7. Ask: «من طورك؟» → `alfaresi solutions` (or admin override).
8. Ask: «ما مصدر المعلومات؟» → funny refusal (not a source essay).
9. Disable assistant in admin → app gets 503 / unavailable message.

---

## Acceptance criteria

- [ ] Migration applied on Supabase prod
- [ ] `/settings` shows mobile chat card; save persists to `app_settings`
- [ ] `/api/mobile-chat` uses DB prompts when set
- [ ] Recommendations use live published content (tenders, decrees, addendums, by ministry/tab)
- [ ] Flutter works with production `ADMIN_API_URL` without redeploy for prompt tweaks
