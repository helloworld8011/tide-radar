"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "全部" | "开源" | "AI" | "科技" | "加密";
type RadarItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: Exclude<Category, "全部">;
  score: number;
  publishedAt: string;
  tags: string[];
};

const categories: Category[] = ["全部", "开源", "AI", "科技", "加密"];
const sourceGroups = [
  ["代码与产品", "GitHub Rising", "GitHub Blog", "Hacker News"],
  ["AI 与基础设施", "Hugging Face", "Cloudflare"],
  ["大众科技", "The Verge"],
  ["加密观察", "CoinGecko Trending", "CoinDesk"],
];

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const diff = Math.max(0, Date.now() - date.getTime());
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "1 小时内";
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
};

export default function RadarDashboard() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [category, setCategory] = useState<Category>("全部");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const [sourceStatus, setSourceStatus] = useState({ total: 8, healthy: 0 });
  const [saved, setSaved] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/feed", { cache: "no-store" });
      const data = await response.json();
      setItems(data.items ?? []);
      setUpdatedAt(data.updatedAt ?? "");
      setSourceStatus({ total: data.sources ?? 8, healthy: data.healthy ?? 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const local = window.localStorage.getItem("tide-radar-saved");
    if (local) setSaved(JSON.parse(local));
  }, []);

  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    setSaved(next);
    window.localStorage.setItem("tide-radar-saved", JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return items.filter((item) => {
      const inCategory = category === "全部" || item.category === category;
      const inSearch = !needle || `${item.title} ${item.summary} ${item.source} ${item.tags.join(" ")}`.toLowerCase().includes(needle);
      return inCategory && inSearch;
    });
  }, [items, category, query]);

  const featured = filtered[0];
  const rest = filtered.slice(1);
  const counts = categories.slice(1).map((name) => ({ name, count: items.filter((item) => item.category === name).length }));

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="潮汐雷达首页">
          <span className="brand-mark">◉</span>
          <span>潮汐雷达</span>
          <small>TIDE RADAR</small>
        </a>
        <div className="search-wrap">
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目、趋势或关键词…" aria-label="搜索信息" />
          <kbd>⌘ K</kbd>
        </div>
        <button className="refresh" onClick={refresh} disabled={loading}>{loading ? "同步中…" : "↻ 刷新雷达"}</button>
      </header>

      <aside className="sidebar">
        <div className="live-pill"><i /> LIVE · {sourceStatus.healthy}/{sourceStatus.total} 来源在线</div>
        <nav>
          <p className="nav-label">工作台</p>
          <button className="nav-item active"><span>⌁</span> 今日雷达 <b>{items.length}</b></button>
          <button className="nav-item"><span>☆</span> 稍后阅读 <b>{saved.length}</b></button>
          <button className="nav-item"><span>✦</span> 推文草稿 <em>即将推出</em></button>
        </nav>
        <div className="source-list">
          <p className="nav-label">信息源</p>
          {sourceGroups.map(([group, ...sources]) => (
            <div className="source-group" key={group}>
              <strong>{group}</strong>
              {sources.map((source) => <span key={source}><i />{source}</span>)}
            </div>
          ))}
        </div>
        <div className="source-cta">
          <span>＋</span>
          <div><strong>添加 RSS 来源</strong><small>下一步接入自定义订阅</small></div>
        </div>
      </aside>

      <section className="content" id="top">
        <div className="hero-row">
          <div>
            <p className="eyebrow">YOUR DAILY SIGNAL</p>
            <h1>今天，什么值得看？</h1>
            <p className="subtitle">把开源、AI、科技和加密世界的噪声，压缩成真正有趣的信号。</p>
          </div>
          <div className="updated"><span>最后同步</span><strong>{updatedAt ? new Date(updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</strong></div>
        </div>

        <div className="metric-row">
          {counts.map(({ name, count }) => <div className="metric" key={name}><span>{name}</span><strong>{count.toString().padStart(2, "0")}</strong><small>条新信号</small></div>)}
        </div>

        <div className="filter-row">
          <div className="tabs">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "selected" : ""}>{item}</button>)}</div>
          <span>{filtered.length} 条结果 · 按信号强度排序</span>
        </div>

        {loading && !items.length ? (
          <div className="loading-panel"><span className="radar-pulse" />正在扫描全球信息源…</div>
        ) : !featured ? (
          <div className="empty">没有匹配的信号，换个关键词试试。</div>
        ) : (
          <>
            <article className="featured-card">
              <div className="score-block"><span>信号强度</span><strong>{featured.score}</strong><i style={{ "--score": `${featured.score}%` } as React.CSSProperties} /></div>
              <div className="featured-body">
                <div className="card-meta"><span className={`category ${featured.category}`}>{featured.category}</span><span>{featured.source}</span><span>·</span><span>{formatTime(featured.publishedAt)}</span></div>
                <a href={featured.url} target="_blank" rel="noreferrer"><h2>{featured.title}</h2></a>
                <p>{featured.summary}</p>
                <div className="tag-row">{featured.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
              <button className={saved.includes(featured.id) ? "save saved" : "save"} onClick={() => toggleSaved(featured.id)} aria-label="收藏">{saved.includes(featured.id) ? "★" : "☆"}</button>
            </article>

            <div className="card-grid">
              {rest.map((item) => (
                <article className="signal-card" key={item.id}>
                  <div className="card-top"><span className={`category ${item.category}`}>{item.category}</span><span className="score">{item.score}</span></div>
                  <a href={item.url} target="_blank" rel="noreferrer"><h3>{item.title}</h3></a>
                  <p>{item.summary}</p>
                  <div className="tag-row">{item.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <footer><span>{item.source} · {formatTime(item.publishedAt)}</span><button className={saved.includes(item.id) ? "saved" : ""} onClick={() => toggleSaved(item.id)}>{saved.includes(item.id) ? "★ 已收藏" : "☆ 收藏"}</button></footer>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
