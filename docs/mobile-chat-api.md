# Mobile AI chat API (`POST /api/mobile-chat`)

Floating chat in **apophenia_flutter** calls the Next.js admin backend on Vercel. **OpenAI key stays server-side only.**

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

- Validate JWT with `NEXT_PUBLIC_SUPABASE_URL` + anon/publishable key (`auth.getUser(token)`).
- Any **logged-in Supabase user** (Flutter app account) — not limited to `admin_users`.

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
| 503 | `OPENAI_API_KEY` not set on Vercel |
| 502 | OpenAI request failed |

## CORS

| Header | Value |
|--------|--------|
| `Access-Control-Allow-Origin` | `MOBILE_CORS_ORIGIN` or `*` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization` |

## Server-side shortcuts (no OpenAI)

| Trigger | Response |
|---------|----------|
| Developer question (من طورك، alfaresi, who made you, …) | Exactly: `alfaresi solutions` |
| Obvious off-topic (weather, sports, coding, …) | Fixed Kuwait Arabic refusal (see below) |

Off-topic refusal text:

```
ما أقدر أجاوب على هالسؤال… إذا غلّطت بيحطون مكاني إنسان حقيقي وأنا ما أبي!
```

Other off-topic questions are handled by the system prompt via OpenAI.

## Vercel environment

| Variable | Required |
|----------|----------|
| `OPENAI_API_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `MOBILE_CORS_ORIGIN` | Optional (default `*`) |

## Flutter example

```dart
final session = supabase.auth.currentSession;
if (session == null) throw Exception('Not logged in');

final res = await http.post(
  Uri.parse('$adminOrigin/api/mobile-chat'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${session.accessToken}',
  },
  body: jsonEncode({
    'messages': [
      {'role': 'user', 'content': userText},
    ],
  }),
);

if (res.statusCode == 200) {
  final content = jsonDecode(res.body)['content'] as String;
}
```

## Implementation files

- [`src/app/api/mobile-chat/route.ts`](../src/app/api/mobile-chat/route.ts)
- [`src/lib/ai/mobile-chat-prompt.ts`](../src/lib/ai/mobile-chat-prompt.ts)

Middleware allows unauthenticated **access to the route**; JWT is checked inside the handler (not admin cookie).
