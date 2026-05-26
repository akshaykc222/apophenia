# Mobile AI chat API (`POST /api/mobile-chat`)

The **المساعد** tab in **apophenia_flutter** calls the Next.js backend on Vercel. **OpenAI key stays server-side only.** Prompts are editable in admin **`/settings`** (no Flutter update needed).

## Endpoint

```
POST https://apophenia-five.vercel.app/api/mobile-chat
OPTIONS https://apophenia-five.vercel.app/api/mobile-chat
```

## Auth (required)

```
Authorization: Bearer <supabase_access_token>
```

Any **logged-in Supabase user** (Flutter app account) — not limited to `admin_users`.

## Request / response

See [admin-mobile-chat-settings.md](./admin-mobile-chat-settings.md) for full behavior.

| Item | Detail |
|------|--------|
| Body | `{ "messages": [{ "role": "user"\|"assistant", "content": "..." }] }` |
| Success | `{ "content": "نص الرد بالعربي" }` |
| 401 | Invalid/missing JWT |
| 503 | `OPENAI_API_KEY` missing or `mobile_chat_enabled=false` |
| 502 | OpenAI error |

## Server flow

1. Load prompts from `app_settings` via **service role** (`getMobileChatSettings`).
2. **Developer** question → `mobile_chat_developer_reply` (default: `alfaresi solutions`).
3. **Off-topic / information source** → `mobile_chat_out_of_scope_reply` (funny refusal).
4. **Tender questions** → fetch published `content_items` (`content_type=tender`), inject list into system prompt; model suggests up to 3 with ministry, deadline, link.
5. Otherwise → OpenAI `gpt-4o-mini` with DB `mobile_chat_system_prompt` + conversation.

## Tender RAG-lite

Triggered when the last user message matches tender patterns (مناقصة، أفضل مناقصة، شركة تقنية، register, …).

- Reads up to 40 recent published tenders with user JWT (RLS).
- Ranks by keywords from the question.
- Injects top matches into the system prompt — model must not invent tenders.

## Admin prompt control

| Column | Purpose |
|--------|---------|
| `mobile_chat_enabled` | Kill switch |
| `mobile_chat_system_prompt` | System prompt (NULL = code default) |
| `mobile_chat_out_of_scope_reply` | Refusal + information-source |
| `mobile_chat_developer_reply` | Who built the bot |
| `mobile_chat_temperature` | 0–2 |
| `mobile_chat_max_tokens` | 100–2000 |

Edit at **https://apophenia-five.vercel.app/settings** → section «مساعد التطبيق».

Migration: `supabase/migrations/008_mobile_chat_settings.sql`

## Vercel environment

| Variable | Required |
|----------|----------|
| `OPENAI_API_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (read `app_settings`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or anon key | Yes |
| `MOBILE_CORS_ORIGIN` | Optional |

## Files

- [`src/app/api/mobile-chat/route.ts`](../src/app/api/mobile-chat/route.ts)
- [`src/lib/ai/mobile-chat-prompt.ts`](../src/lib/ai/mobile-chat-prompt.ts)
- [`src/lib/ai/mobile-chat-context.ts`](../src/lib/ai/mobile-chat-context.ts)
- [`src/lib/settings/mobile-chat-settings.ts`](../src/lib/settings/mobile-chat-settings.ts)

## Flutter

```dart
const adminOrigin = 'https://apophenia-five.vercel.app';
// POST $adminOrigin/api/mobile-chat
// Authorization: Bearer ${session.accessToken}
```

`ADMIN_API_URL` in Flutter env — no app update when admin changes prompts.
