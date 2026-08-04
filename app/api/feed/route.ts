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

const sourceLabels: Record<string, string> = {
  "GitHub Rising": "GitHub 新星项目",
  "GitHub Blog": "GitHub 官方博客",
  "Hacker News": "黑客新闻",
  "Hugging Face": "Hugging Face 博客",
  Cloudflare: "Cloudflare 博客",
  "The Verge": "科技媒体",
  "CoinGecko Trending": "CoinGecko 趋势榜",
  CoinDesk: "加密媒体",
};

const zhTerms: Array<[RegExp, string]> = [
  [/\bAI\b/gi, "AI"],
  [/\bagent(s|ic)?\b/gi, "智能体"],
  [/\bopen[- ]source\b/gi, "开源"],
  [/\bdeveloper(s)?\b/gi, "开发者"],
  [/\bsecurity\b/gi, "安全"],
  [/\bprivacy\b/gi, "隐私"],
  [/\bcrypto(currency)?\b/gi, "加密货币"],
  [/\bbitcoin\b/gi, "比特币"],
  [/\bethereum\b/gi, "以太坊"],
  [/\bcloud\b/gi, "云服务"],
  [/\bmodel(s)?\b/gi, "模型"],
  [/\bapp(s)?\b/gi, "应用"],
  [/\bstartup(s)?\b/gi, "创业公司"],
  [/\blaunch(es|ed)?\b/gi, "发布"],
  [/\bupdate(s|d)?\b/gi, "更新"],
  [/\brelease(s|d)?\b/gi, "发布"],
  [/\bbuild(ing)?\b/gi, "构建"],
  [/\bdata\b/gi, "数据"],
  [/\btool(s)?\b/gi, "工具"],
  [/\bplatform(s)?\b/gi, "平台"],
  [/\bgithub\b/gi, "GitHub"],
  [/\bhacker news\b/gi, "黑客新闻"],
];

const hasAsciiWord = (value: string) => /[A-Za-z]{3,}/.test(value);

const normalizeTopic = (value: string, category: RadarItem["category"]) => {
  let text = clean(value)
    .replace(/[|:：\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of zhTerms) text = text.replace(pattern, replacement);

  const words = text.match(/[\u4e00-\u9fa5A-Za-z0-9.+#-]{2,}/g) ?? [];
  const useful = words
    .filter((word) => !/^(the|and|for|with|from|into|your|this|that|how|why|what|new|latest|weekly)$/i.test(word))
    .slice(0, 5);

  if (useful.length && useful.some((word) => /[\u4e00-\u9fa5]/.test(word))) return useful.join("、");
  if (useful.length) return useful.join("、");

  const fallbackTopic: Record<RadarItem["category"], string> = {
    开源: "开源工具",
    AI: "AI 产品与模型",
    科技: "科技趋势",
    加密: "加密市场",
  };
  return fallbackTopic[category];
};

const chineseTitle = (item: Pick<RadarItem, "title" | "source" | "category" | "score">) => {
  const topic = normalizeTopic(item.title, item.category);
  if (item.source === "GitHub Rising") return `开源新星：${topic}`;
  if (item.source === "Hacker News") return `黑客新闻热议：${topic}`;
  if (item.source === "CoinGecko Trending") return `${topic} 热度上升`;
  if (item.category === "加密") return `加密观察：${topic}`;
  if (item.category === "AI") return `AI 动态：${topic}`;
  if (item.category === "开源") return `开源动态：${topic}`;
  return `科技动态：${topic}`;
};

const chineseSummary = (item: Pick<RadarItem, "title" | "summary" | "source" | "category" | "score" | "tags">) => {
  const topic = normalizeTopic(`${item.title} ${item.summary}`, item.category);
  const source = sourceLabels[item.source] ?? item.source;
  const scoreHint = item.score >= 90 ? "热度很高，值得优先看" : item.score >= 78 ? "有讨论度，可以扫一眼" : "适合放进观察列表";
  const tagHint = item.tags.filter((tag) => !hasAsciiWord(tag) || /^[★#\d,\s]+$/.test(tag)).slice(0, 2).join(" · ");
  const suffix = tagHint ? `标签：${tagHint}。` : "";

  if (item.source === "GitHub Rising") {
    return `这是一个正在快速涨星的开源项目，核心看点是“${topic}”。${scoreHint}，适合挖成工具推荐、项目速览或开发者段子。${suffix}`;
  }
  if (item.source === "Hacker News") {
    return `黑客新闻正在讨论“${topic}”。${scoreHint}，适合提炼成一句观点，再配一个反差式吐槽。${suffix}`;
  }
  if (item.source === "CoinGecko Trending") {
    return `${topic} 出现在趋势榜上，说明市场注意力正在聚集。只做热点观察，不当投资建议；适合写成“今天链上群众又在看什么”。${suffix}`;
  }
  if (item.category === "加密") {
    return `${source} 提到“${topic}”。重点不是追涨杀跌，而是观察资金、叙事和情绪往哪里跑。${suffix}`;
  }
  if (item.category === "AI") {
    return `${source} 提到“${topic}”。可以关注它对模型、开发者工具或基础设施的影响，适合改写成轻松版 AI 动态。${suffix}`;
  }
  if (item.category === "开源") {
    return `${source} 提到“${topic}”。它可能代表一个新的工具方向或开发者需求，适合做成开源雷达短评。${suffix}`;
  }
  return `${source} 提到“${topic}”。这条更像大众科技趋势信号，适合用轻松口吻讲给非技术读者。${suffix}`;
};

const localizeItem = (item: RadarItem): RadarItem => ({
  ...item,
  title: chineseTitle(item),
  summary: chineseSummary(item),
  source: sourceLabels[item.source] ?? item.source,
  tags: item.tags.map((tag) => tag.replace("Open Source", "开源").replace("RSS", "订阅").replace("Trending", "趋势")),
});

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
    .slice(0, 60)
    .map(localizeItem);
  return NextResponse.json({
    items: unique.length ? unique : fallback,
    updatedAt: new Date().toISOString(),
    sources: 3 + RSS_SOURCES.length,
    healthy: settled.filter((result) => result.status === "fulfilled").length,
  });
}
