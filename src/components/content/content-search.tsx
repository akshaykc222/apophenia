"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function ContentSearch({
  initialQ,
  initialType,
}: {
  initialQ?: string;
  initialType?: string;
}) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = fd.get("q") as string;
    const type = fd.get("type") as string;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    router.push(`/content?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
      <Input
        name="q"
        placeholder="بحث في المحتوى..."
        defaultValue={initialQ}
        className="max-w-xs"
        dir="rtl"
      />
      <Select name="type" defaultValue={initialType ?? ""}>
        <option value="">كل الأنواع</option>
        <option value="article">مقال</option>
        <option value="tender">مناقصة</option>
        <option value="decree">مرسوم</option>
        <option value="addendum">استدراك</option>
      </Select>
      <Button type="submit" variant="secondary">
        بحث
      </Button>
    </form>
  );
}
