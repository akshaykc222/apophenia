"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MobileChatSettings } from "@/lib/settings/mobile-chat-settings";
import {
  MOBILE_CHAT_DEVELOPER_REPLY,
  MOBILE_CHAT_OUT_OF_SCOPE_REPLY,
  MOBILE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/mobile-chat-prompt";

type MobileChatSettingsCardProps = {
  initial: MobileChatSettings;
  onSave: (patch: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
};

export function MobileChatSettingsCard({
  initial,
  onSave,
}: MobileChatSettingsCardProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [systemPrompt, setSystemPrompt] = useState(initial.system_prompt);
  const [outOfScope, setOutOfScope] = useState(initial.out_of_scope_reply);
  const [developerReply, setDeveloperReply] = useState(initial.developer_reply);
  const [temperature, setTemperature] = useState(String(initial.temperature));
  const [maxTokens, setMaxTokens] = useState(String(initial.max_tokens));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetToDefaults() {
    setSystemPrompt(MOBILE_CHAT_SYSTEM_PROMPT);
    setOutOfScope(MOBILE_CHAT_OUT_OF_SCOPE_REPLY);
    setDeveloperReply(MOBILE_CHAT_DEVELOPER_REPLY);
    setTemperature("0.6");
    setMaxTokens("700");
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await onSave({
      mobile_chat_enabled: enabled,
      mobile_chat_system_prompt: systemPrompt.trim() || null,
      mobile_chat_out_of_scope_reply: outOfScope.trim() || null,
      mobile_chat_developer_reply: developerReply.trim() || null,
      mobile_chat_temperature: Number(temperature),
      mobile_chat_max_tokens: Number(maxTokens),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "فشل الحفظ");
      return;
    }
    setSuccess(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>مساعد التطبيق (كويت اليوم)</CardTitle>
        <p className="text-xs text-zinc-500">
          يتحكم في شخصية وردود المساعد في تطبيق Flutter عبر{" "}
          <code className="text-zinc-400">/api/mobile-chat</code>. المحتوى
          المنشور (كل التبويبات والوزارات) يُحمّل تلقائياً عند أسئلة التوصية
          (أفضل / أنسب).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
            تم حفظ إعدادات المساعد.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-zinc-600"
          />
          تفعيل المساعد في التطبيق
        </label>

        <div className="space-y-2">
          <Label htmlFor="mobile-chat-system">تعليمات النظام (System prompt)</Label>
          <textarea
            id="mobile-chat-system"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs text-zinc-100"
            dir="rtl"
          />
          <p className="text-xs text-zinc-500">
            اتركه فارغاً عند الحفظ لاستخدام الافتراضي من الكود. يحدد النطاق،
            اللهجة الكويتية، وسلوك المناقصات.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-chat-oos">رد خارج النطاق / مصدر المعلومات</Label>
          <textarea
            id="mobile-chat-oos"
            value={outOfScope}
            onChange={(e) => setOutOfScope(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile-chat-dev">رد «من طورك؟»</Label>
          <input
            id="mobile-chat-dev"
            type="text"
            value={developerReply}
            onChange={(e) => setDeveloperReply(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mobile-chat-temp">Temperature (0–2)</Label>
            <input
              id="mobile-chat-temp"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile-chat-tokens">Max tokens</Label>
            <input
              id="mobile-chat-tokens"
              type="number"
              min={100}
              max={2000}
              step={50}
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ إعدادات المساعد"}
          </Button>
          <Button type="button" variant="outline" onClick={resetToDefaults}>
            استعادة النص الافتراضي
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
