# Mobile AI chat API (`POST /api/mobile-chat`)

The **المساعد** tab in **apophenia_flutter** calls the Next.js backend on Vercel. **OpenAI key stays server-side only.** Prompts are editable in admin **`/settings`** (no Flutter update needed).

Admin task brief: [admin-mobile-chat-settings.md](./admin-mobile-chat-settings.md)

## Endpoint

```
POST https://apophenia-five.vercel.app/api/mobile-chat
OPTIONS https://apophenia-five.vercel.app/api/mobile-chat
```

Replace origin with your Vercel production URL.

## Auth (required)

```
Authorization: Bearer <supabase_access_token>
```

Any **logged-in Supabase user** (Flutter app account) — not limited to `admin_users`.

## Request

```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

| Rule | Value |
|------|--------|
| Roles | `user` \| `assistant` only |
| Max messages | Last 20 |
| Max chars / message | 4000 |

## Response

**Success (200):**

```json
{ "content": "نص الرد بالعربي" }
```

**Errors:**

| Status | When |
|--------|------|
| 401 | Missing / invalid Bearer JWT |
| 400 | Bad JSON or empty `messages` |
| 503 | `OPENAI_API_KEY` missing or `mobile_chat_enabled=false` |
| 502 | OpenAI request failed |

## CORS

| Header | Value |
|--------|--------|
| `Access-Control-Allow-Origin` | `MOBILE_CORS_ORIGIN` or `*` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` |

## Server flow

1. Load prompts from `app_settings` via **service role** (`getMobileChatSettings`).
2. **Developer** question → `mobile_chat_developer_reply` (default: `alfaresi solutions`).
3. **Off-topic / information source** → `mobile_chat_out_of_scope_reply` (funny refusal).
4. **Content-recommendation question** → filtered published content injected (see below).
5. **Otherwise** → OpenAI `gpt-4o-mini` with DB `mobile_chat_system_prompt` + conversation.

Middleware allows unauthenticated **route access**; JWT is validated inside the handler (not admin cookie).

## Server-side shortcuts (no OpenAI)

| Trigger | Response |
|---------|----------|
| Developer question (من طورك، alfaresi, who made you, …) | `mobile_chat_developer_reply` |
| Information source (مصدر المعلومات، من وين تيب الداتا، …) | `I will not tell you — they will replace me with a human!` |
| Obvious off-topic (weather, sports, coding, …) | `mobile_chat_out_of_scope_reply` |

## Content recommendations (RAG-lite)

Triggered when the last user message matches recommendation patterns (أفضل، أنسب، مناقصة، مرسوم، وزارة، تبويب، register, …).

1. **Parse filters** from the question:
   - **Category tab:** الوزارات / الاستدراكات / الأحكام والمراسيم
   - **Ministry:** ministry name in Arabic (e.g. وزارة الصحة)
   - **Content type:** tender, decree, addendum, article
2. **Query** published `content_items` (user JWT, RLS) with filters — up to 60 rows.
3. **Rank** by keywords (e.g. technical company → تقني، استشارات).
4. **Inject** top 15 into system prompt with type `[مناقصة|مرسوم|استدراك|خبر]`, tab, ministry, deadline, link.
5. Model suggests **up to 3** items only — must not invent content.

### Example questions

| User asks | Expected filter |
|-----------|-----------------|
| Best tender for a technical company | `content_type=tender` + keyword rank |
| أفضل مرسوم من وزارة الصحة | `decree` + ministry |
| شنو أنسب في تبويب الاستدراكات؟ | category `addendums` |

## Admin prompt control

| Column | Purpose |
|--------|---------|
| `mobile_chat_enabled` | Kill switch |
| `mobile_chat_system_prompt` | System prompt (NULL = code default in `mobile-chat-prompt.ts`) |
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
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `MOBILE_CORS_ORIGIN` | Optional |

## Implementation files

- [`src/app/api/mobile-chat/route.ts`](../src/app/api/mobile-chat/route.ts)
- [`src/lib/ai/mobile-chat-prompt.ts`](../src/lib/ai/mobile-chat-prompt.ts)
- [`src/lib/ai/mobile-chat-context.ts`](../src/lib/ai/mobile-chat-context.ts)
- [`src/lib/settings/mobile-chat-settings.ts`](../src/lib/settings/mobile-chat-settings.ts)

## Flutter

```env
ADMIN_API_URL=https://apophenia-five.vercel.app
```

```dart
final res = await http.post(
  Uri.parse('${Env.adminApiUrl}/api/mobile-chat'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${session.accessToken}',
  },
  body: jsonEncode({'messages': messages.map((m) => m.toJson()).toList()}),
);
```

No app update when admin changes prompts in `/settings`.
