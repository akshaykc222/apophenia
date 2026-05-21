import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — لوحة الإدارة`,
  description: `${APP_NAME} admin panel`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${notoArabic.variable} dark h-full`}>
      <body className="min-h-full bg-black text-white antialiased">{children}</body>
    </html>
  );
}
