import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return {
    metadataBase: base,
    title: "潮汐雷达 · 开源、AI 与加密热点",
    description: "把 GitHub、RSS、Hacker News 和加密市场装进一个实时信息雷达。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "潮汐雷达",
      description: "把噪声压缩成信号。",
      images: [{ url: new URL("/og.png", base).toString(), width: 1200, height: 630, alt: "潮汐雷达" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "潮汐雷达",
      description: "开源 · AI · 科技 · 加密，把噪声压缩成信号。",
      images: [new URL("/og.png", base).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
