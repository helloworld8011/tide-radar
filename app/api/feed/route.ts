import { NextResponse } from "next/server";

type RadarItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: "开源" | "AI" | "科技" | "加密";
  score: number;
  publishedAt: string;
  tags: string[];
};

const RSS_SOURCES = [
  { name: "GitHub Blog", url: "https://github.blog/feed/", category: "开源" as const },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", category: "AI" as const },
  { name: "Cloudflare", url: "https://blog.cloudflare.com/rss/", category: "科技" as const },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "科技" as const },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "加密" as const },
];

const clean = (value = "") =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const field = (block: string, tag: string) => {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return clean(match?.[1] ?? "");
};

async function fetchRss(source: (typeof RSS_SOURCES)[number]): Promise<RadarItem[]> {
  const response = await fetch(source.url, { headers: { "User-Agent": "TideRadar/1.0" } });
  if (!response.ok) throw new Error(`${source.name}: ${response.status}`);
  const xml = await response.text();
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.slice(0, 6).map((block, index) => {
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const url = field(block, "link") || linkMatch?.[1] || source.url;
    const title = field(block, "title") || "未命名条目";
    const summary = field(block, "description") || field(block, "summary") || field(block, "content");
    const date = field(block, "pubDate") || field(block, "published") || field(block, "updated");
    return {
      id: `rss-${source.name}-${index}-${title}`,
      title,
      summary: summary.slice(0, 180),
      url,
      source: source.name,
      category: source.category,
      score: Math.max(61, 91 - index * 4),
      publishedAt: date || new Date().toISOString(),
      tags: [source.category, "RSS"],
    };
  });
}

async function fetchGithub(): Promise<RadarItem[]> {
  const since = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
  const response = await fetch(
    `https://api.github.com/search/repositories?q=created:%3E${since}&sort=stars&order=desc&per_page=10`,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "TideRadar/1.0" } },
  );
  if (!response.ok) throw new Error(`GitHub: ${response.status}`);
  const data = await response.json();
  return (data.items ?? []).map((repo: Record<string, unknown>, index: number) => ({
    id: `github-${repo.id}`,
    title: String(repo.full_name),
    summary: String(repo.description || "一个正在快速获得关注的新开源项目。"),
    url: String(repo.html_url),
    source: "GitHub Rising",
    category: "开源" as const,
    score: Math.min(99, 72 + Math.round(Number(repo.stargazers_count || 0) / 25)),
    publishedAt: String(repo.created_at),
    tags: [String(repo.language || "Open Source"), `★ ${Number(repo.stargazers_count || 0).toLocaleString()}`],
  }));
}

async function fetchHackerNews(): Promise<RadarItem[]> {
  const response = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12");
  if (!response.ok) throw new Error(`HN: ${response.status}`);
  const data = await response.json();
  return (data.hits ?? []).map((hit: Record<string, unknown>, index: number) => ({
    id: `hn-${hit.objectID}`,
    title: String(hit.title),
    summary: `${Number(hit.points || 0)} 点赞 · ${Number(hit.num_comments || 0)} 条讨论，正在 Hacker News 发酵。`,
    url: String(hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`),
    source: "Hacker News",
    category: "科技" as const,
    score: Math.min(99, 65 + Math.round(Number(hit.points || 0) / 12) - index),
    publishedAt: String(hit.created_at),
    tags: ["热议", `${Number(hit.num_comments || 0)} 评论`],
  }));
}

async function fetchCrypto(): Promise<RadarItem[]> {
  const response = await fetch("https://api.coingecko.com/api/v3/search/trending");
  if (!response.ok) throw new Error(`CoinGecko: ${response.status}`);
  const data = await response.json();
  return (data.coins ?? []).slice(0, 7).map((entry: Record<string, unknown>, index: number) => {
    const coin = entry.item as Record<string, unknown>;
    const price = (coin.data as Record<string, unknown> | undefined)?.price;
    return {
      id: `coin-${coin.id}`,
      title: `${coin.name} (${coin.symbol}) 热度上升`,
      summary: `${coin.name} 进入 CoinGecko 趋势榜第 ${index + 1} 位${price ? `，参考价格 ${price}` : ""}。仅作信息观察，不构成投资建议。`,
      url: `https://www.coingecko.com/en/coins/${coin.id}`,
      source: "CoinGecko Trending",
      category: "加密" as const,
      score: 92 - index * 4,
      publishedAt: new Date().toISOString(),
      tags: [String(coin.symbol), `趋势 #${index + 1}`],
    };
  });
}

const fallback: RadarItem[] = [
  {
    id: "fallback-1",
    title: "你的信息雷达已经就位",
    summary: "来源正在连接中。即使某个站点短暂不可用，其他来源仍会继续更新。",
    url: "https://github.com/trending",
    source: "系统",
    category: "开源",
    score: 88,
    publishedAt: new Date().toISOString(),
    tags: ["实时聚合", "自动降级"],
  },
];

export async function GET() {
  const tasks = [fetchGithub(), fetchHackerNews(), fetchCrypto(), ...RSS_SOURCES.map(fetchRss)];
  const settled = await Promise.allSettled(tasks);
  const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const unique = Array.from(new Map(items.map((item) => [item.url || item.title, item])).values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);
  return NextResponse.json({
    items: unique.length ? unique : fallback,
    updatedAt: new Date().toISOString(),
    sources: 3 + RSS_SOURCES.length,
    healthy: settled.filter((result) => result.status === "fulfilled").length,
  });
}
