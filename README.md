<p align="center">
  <img src="assets/logo.png" alt="CatCounter logo" width="200">
</p>

<h1 align="center">CatCounter</h1>

<p align="center">部署在 Cloudflare Workers 上的博客访问量统计服务。免费套餐即可运行，只依赖 D1 数据库。</p>

- 站点总 PV/UV、每篇文章 PV/UV，按日趋势，来源 / 地区 / 设备分布
- 一个部署可以接入多个博客，各自独立 token
- 自带管理后台：查看数据、管理站点和 token、手动修正计数
- 一行 script 标签接入，兼容不蒜子的元素 id
- 不记录原始 IP，访客去重使用每日轮换的盐做哈希

## 部署（全程在 Cloudflare 控制台操作）

1. **Fork 本仓库**到你的 GitHub 账号。
2. **连接 Git 部署**：控制台 → Workers & Pages → Create → Workers → Import a repository → 选择你的 fork。
   - Build command：`pnpm install && pnpm build`
   - Deploy command：保持默认 `npx wrangler deploy`
   - 其余保持默认，点击 Create and deploy。
   首次部署时 Wrangler 会自动创建名为 `catcounter` 的 D1 数据库并绑定到 Worker，不需要手动建库。如果账号里已有同名数据库会直接复用。
3. **设置密码**：部署完成后进入该 Worker → Settings → Variables and Secrets → Add：
   - `ADMIN_PASSWORD`：后台登录密码（类型选 Secret）
   - `SESSION_SECRET`：任意长随机串，用于签名会话和访客哈希（类型选 Secret）
   然后回到 Deployments 页面点击最新一次部署的 Retry deployment，让 secret 生效。
4. **登录后台**：打开 `https://<你的worker>.workers.dev/admin/`，输入密码，新建第一个站点。数据库表会在第一次请求时自动创建。
5. 可选：Settings → Domains & Routes 绑定自定义域名，例如 `counter.example.com`。

之后每次向 fork 的 main 分支推送，Cloudflare 会自动重新构建部署。

## 接入网站

在后台新建站点时会得到接入代码。通用形式：

```html
<script async src="https://<你的worker域名>/catcounter.js" data-token="cc_xxx"></script>

本站访问 <span data-cc="site_pv">-</span> 次，访客 <span data-cc="site_uv">-</span> 人
本文阅读 <span data-cc="page_pv">-</span> 次，读者 <span data-cc="page_uv">-</span> 人
```

- 站点的 **Origin 白名单**必须包含页面所在的 origin（例如 `https://blog.example.com`），否则请求会被拒绝。本地预览时把 `http://localhost:4000` 也加上。
- 列表页给每篇文章显示阅读量：给列表项加 `data-cc-path`，脚本会合并成一次请求，不会增加计数。

```html
<li data-cc-path="/posts/hello/">Hello <span data-cc="page_pv">-</span></li>
```

- 兼容不蒜子：已有 `busuanzi_value_site_pv`、`busuanzi_value_site_uv`、`busuanzi_value_page_pv`、`busuanzi_value_page_uv` 这些 id 的主题只需替换 script 标签。
- pjax 主题在切页后调用 `window.CatCounter.refresh()`。
- 脚本可选属性：`data-path` 覆盖当前路径；`data-no-hit` 只读取不计数。

## 接入 Hexo 主题

在主题的 `_config.yml` 增加：

```yaml
catcounter:
  enable: true
  endpoint: https://counter.example.com
  token: cc_xxxxxxxxxxxxxxxxxxxxxxxx
```

在 layout 的底部模板（通常是 `layout/_partial/footer` 或 `layout/_partial/scripts`）输出 script 标签。

EJS：

```ejs
<% if (theme.catcounter && theme.catcounter.enable) { %>
<script async src="<%= theme.catcounter.endpoint %>/catcounter.js" data-token="<%= theme.catcounter.token %>"></script>
<% } %>
```

Pug：

```pug
if theme.catcounter && theme.catcounter.enable
  script(async src=theme.catcounter.endpoint + '/catcounter.js' data-token=theme.catcounter.token)
```

文章页的元信息处放阅读量占位（EJS）：

```ejs
<span class="post-views">阅读 <span data-cc="page_pv">-</span></span>
```

首页文章列表（EJS）：

```ejs
<% page.posts.each(function(post){ %>
  <article data-cc-path="<%= url_for(post.path) %>">
    <a href="<%= url_for(post.path) %>"><%= post.title %></a>
    <span>阅读 <span data-cc="page_pv">-</span></span>
  </article>
<% }) %>
```

页脚站点总量（EJS）：

```ejs
本站总访问 <span data-cc="site_pv">-</span> 次 · 访客 <span data-cc="site_uv">-</span> 人
```

路径规范：`/posts/hello` 与 `/posts/hello/` 视为同一页，query 和 hash 忽略，`index.html` 会被去掉，所以 `url_for(post.path)` 的输出可以直接使用。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/hit` | body 为 JSON 字符串 `{token, path, title?, referrer?}`，`Content-Type: text/plain`。返回 `{site:{pv,uv}, page:{pv,uv}}`。爬虫和重复访客不累加。 |
| GET | `/api/counts?token=&paths=/a/,/b/` | 只读批量查询，最多 50 个路径。 |
| GET | `/catcounter.js` | 浏览器脚本。 |

token 是公开标识，安全性来自 Origin 白名单校验。

## 免费额度

| 资源 | 免费额度 | 用量 |
|---|---|---|
| Workers 请求 | 10 万 / 天 | 每次页面访问 1 次，带文章列表的页面额外 1 次 |
| D1 写入 | 10 万行 / 天 | 每次访问 7 到 9 行，每个 token 每小时另加 1 行，约合 1.2 万 PV / 天 |
| D1 读取 | 500 万行 / 天 | 每次访问约 3 行 |

token 是公开的，Origin 白名单只能约束浏览器；恶意脚本可以伪造请求消耗 D1 写入额度。如果遇到刷量，可在 Cloudflare 控制台的 Security → WAF → Rate limiting rules 为 `/api/hit` 添加限流规则（免费套餐含 1 条）。

## 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars   # 填写本地密码
pnpm dev                          # Worker，端口 8787
pnpm --filter @catcounter/admin dev   # 后台热更新，打开 http://localhost:5173/admin/
pnpm test                         # 全部测试
pnpm build                        # 构建 SDK 和后台到 packages/worker/assets
```

用 curl 模拟访问时必须带浏览器 User-Agent，例如 `-A 'Mozilla/5.0 (Macintosh) Chrome/120'`，因为 curl 默认的 UA 会被识别为爬虫而不计数。

本地开发请使用 Chrome，它允许 `localhost` 上的 Secure cookie。

## 结构

```
packages/shared   类型与路径规范化
packages/worker   Hono 应用、D1、cron、静态资源
packages/sdk      浏览器脚本，构建到 worker/assets/catcounter.js
packages/admin    Vue 3 后台，构建到 worker/assets/admin
```

## 许可证

MIT
