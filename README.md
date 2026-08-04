# 潮汐雷达 Tide Radar

面向中文 X 创作者的个人信息雷达。统一聚合开源、AI、科技和加密信息，按信号强度排序，并为后续的推文生成流水线提供干净的素材入口。

## 已接入来源

- GitHub 新晋高星项目
- GitHub Blog RSS
- Hacker News 首页
- Hugging Face Blog RSS
- Cloudflare Blog RSS
- The Verge RSS
- CoinGecko 趋势榜
- CoinDesk RSS

任一来源故障都不会阻塞其他来源，接口会自动合并成功结果并按 URL 去重。

## 当前能力

- 多源实时聚合和自动降级
- 开源、AI、科技、加密分类
- 信号强度排序
- 全文搜索
- 浏览器本地收藏
- 响应式桌面与移动端界面
- 后续可扩展自定义 RSS、推文草稿和账户系统

## 本地运行

需要 Node.js 22.13 或更高版本：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 数据接口

`GET /api/feed` 返回统一格式的信息流。采集逻辑和默认来源位于 `app/api/feed/route.ts`，可继续添加 RSS 或公开 API。

收藏目前存储在浏览器本地；个人版不需要登录或数据库。
