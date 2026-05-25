import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  isDeveloperQuestion,
  isOutOfScopeQuestion,
  MOBILE_CHAT_DEVELOPER_REPLY,
  MOBILE_CHAT_OUT_OF_SCOPE_REPLY,
  MOBILE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/mobile-chat-prompt";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LEN = 4000;

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

function corsHeaders(): HeadersInit {
  const origin = process.env.MOBILE_CORS_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function verifyBearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { user: null, error: "missing_token" as const };
  }
  const token = auth.slice(7).trim();
  if (!token) return { user: null, error: "missing_token" as const };

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return { user: null, error: "server_config" as const };

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "invalid_token" as const };
  }
  return { user: data.user, error: null };
}

function parseMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return null;

  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as ChatMessage).role;
    const content = String((m as ChatMessage).content ?? "").trim();
    if ((role !== "user" && role !== "assistant") || !content) continue;
    out.push({
      role,
      content: content.slice(0, MAX_CONTENT_LEN),
    });
  }
  return out.length ? out.slice(-MAX_MESSAGES) : null;
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await verifyBearerToken(request);
  if (authError === "missing_token" || authError === "invalid_token") {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (authError === "server_config") {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const messages = parseMessages(body);
  if (!messages) {
    return jsonResponse({ error: "messages required" }, 400);
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return jsonResponse({ error: "No user message" }, 400);
  }

  if (isDeveloperQuestion(lastUser.content)) {
    return jsonResponse({ content: MOBILE_CHAT_DEVELOPER_REPLY });
  }

  if (isOutOfScopeQuestion(lastUser.content)) {
    return jsonResponse({ content: MOBILE_CHAT_OUT_OF_SCOPE_REPLY });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "Chat unavailable" }, 503);
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MOBILE_CHAT_SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("mobile-chat OpenAI error:", res.status, errText);
      return jsonResponse({ error: "AI request failed" }, 502);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() ||
      "عذراً، ما قدرت أجاوب الحين. جرّب مرة ثانية.";

    return jsonResponse({ content });
  } catch (e) {
    console.error("mobile-chat:", e);
    return jsonResponse({ error: "AI request failed" }, 502);
  }
}
