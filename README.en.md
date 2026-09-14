<p align="right">
  <a href="README.md">简体中文</a> | <b>English</b> | <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img src="assets/logo.png" alt="CatCounter logo" width="200">
</p>

<h1 align="center">CatCounter</h1>

<p align="center">A blog visit counter that runs on Cloudflare Workers. Works on the free plan and only depends on a D1 database.</p>

- Site-wide PV/UV, per-post PV/UV, daily trends, and referrer / country / device breakdowns
- One deployment can serve multiple blogs, each with its own tokens
- Built-in admin panel: view stats, manage sites and tokens, adjust counts manually; available in English / 日本語 / 简体中文
- Add it with a single script tag; compatible with Busuanzi (不蒜子) element ids
- Raw IPs are never stored; unique visitors are deduplicated with a hash salted by a daily rotating key

## Deployment (all in the Cloudflare dashboard)

1. **Fork this repository** to your GitHub account.
2. **Connect Git deployment**: Dashboard → Workers & Pages → Create → Workers → Import a repository → pick your fork.
   - Build command: `pnpm install && pnpm build`
   - Deploy command: keep the default `npx wrangler deploy`
   - Leave everything else as default and click Create and deploy.
   On the first deployment Wrangler automatically creates a D1 database named `catcounter` and binds it to the Worker, so there is no need to create one by hand. An existing database with the same name in your account is reused.
3. **Set the secrets**: once deployed, open the Worker → Settings → Variables and Secrets → Add:
   - `ADMIN_PASSWORD`: the admin panel password (type: Secret)
   - `SESSION_SECRET`: any long random string, used to sign sessions and hash visitors (type: Secret)
   Then go back to Deployments and click Retry deployment on the latest deployment so the secrets take effect.
4. **Sign in to the admin panel**: open `https://<your-worker>.workers.dev/admin/`, enter the password and create your first site. Database tables are created automatically on the first request.
5. Optional: bind a custom domain under Settings → Domains & Routes, e.g. `counter.example.com`.

From then on, every push to the main branch of your fork triggers an automatic rebuild and deployment on Cloudflare.

## Adding it to your site

You get the embed code when creating a site in the admin panel. The general form:

```html
<script async src="https://<your-worker-domain>/catcounter.js" data-token="cc_xxx"></script>

This site has <span data-cc="site_pv">-</span> views from <span data-cc="site_uv">-</span> visitors
This post has <span data-cc="page_pv">-</span> views from <span data-cc="page_uv">-</span> readers
```

- The site's **origin allowlist** must include the origin the page is served from (e.g. `https://blog.example.com`), otherwise requests are rejected. Add `http://localhost:4000` as well for local previews.
- To show view counts for each post on a list page, add `data-cc-path` to each list item. The script merges them into a single request and does not increase any counts.

```html
<li data-cc-path="/posts/hello/">Hello <span data-cc="page_pv">-</span></li>
```

- Busuanzi compatibility: themes that already use the ids `busuanzi_value_site_pv`, `busuanzi_value_site_uv`, `busuanzi_value_page_pv` and `busuanzi_value_page_uv` only need to swap the script tag.
- For pjax themes, call `window.CatCounter.refresh()` after each page switch.
- Optional script attributes: `data-path` overrides the current path; `data-no-hit` reads counts without counting a visit.

## Hexo theme integration

Add the following to the theme's `_config.yml`:

```yaml
catcounter:
  enable: true
  endpoint: https://counter.example.com
  token: cc_xxxxxxxxxxxxxxxxxxxxxxxx
```

Output the script tag in the layout's bottom template (usually `layout/_partial/footer` or `layout/_partial/scripts`).

EJS:

```ejs
<% if (theme.catcounter && theme.catcounter.enable) { %>
<script async src="<%= theme.catcounter.endpoint %>/catcounter.js" data-token="<%= theme.catcounter.token %>"></script>
<% } %>
```

Pug:

```pug
if theme.catcounter && theme.catcounter.enable
  script(async src=theme.catcounter.endpoint + '/catcounter.js' data-token=theme.catcounter.token)
```

View count placeholder in the post metadata (EJS):

```ejs
<span class="post-views">Views <span data-cc="page_pv">-</span></span>
```

Post list on the home page (EJS):

```ejs
<% page.posts.each(function(post){ %>
  <article data-cc-path="<%= url_for(post.path) %>">
    <a href="<%= url_for(post.path) %>"><%= post.title %></a>
    <span>Views <span data-cc="page_pv">-</span></span>
  </article>
<% }) %>
```

Site totals in the footer (EJS):

```ejs
<span data-cc="site_pv">-</span> total views · <span data-cc="site_uv">-</span> visitors
```

Path normalization: `/posts/hello` and `/posts/hello/` are treated as the same page, query strings and hashes are ignored, and `index.html` is stripped, so the output of `url_for(post.path)` can be used as is.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/hit` | Body is the JSON string `{token, path, title?, referrer?}` with `Content-Type: text/plain`. Returns `{site:{pv,uv}, page:{pv,uv}}`. Bots and repeat visitors are not counted. |
| GET | `/api/counts?token=&paths=/a/,/b/` | Read-only batch lookup, up to 50 paths. |
| GET | `/catcounter.js` | Browser script. |

The token is a public identifier; security comes from the origin allowlist check.

## Free tier usage

| Resource | Free allowance | Usage |
|---|---|---|
| Workers requests | 100,000 / day | 1 per page view, plus 1 for pages with a post list |
| D1 rows written | 100,000 / day | 7 to 9 rows per visit, plus 1 row per token per hour; roughly 12,000 PV / day |
| D1 rows read | 5,000,000 / day | About 3 rows per visit |

Tokens are public and the origin allowlist only constrains browsers, so a malicious script can forge requests and burn through the D1 write allowance. If you see abuse, add a rate limiting rule for `/api/hit` under Security → WAF → Rate limiting rules in the Cloudflare dashboard (the free plan includes 1 rule).

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in local passwords
pnpm dev                          # Worker on port 8787
pnpm --filter @catcounter/admin dev   # admin panel with hot reload at http://localhost:5173/admin/
pnpm test                         # all tests
pnpm build                        # build the SDK and admin panel into packages/worker/assets
```

When simulating visits with curl you must send a browser User-Agent, e.g. `-A 'Mozilla/5.0 (Macintosh) Chrome/120'`, because curl's default UA is detected as a bot and not counted.

Use Chrome for local development; it allows Secure cookies on `localhost`.

Admin panel translations live in `packages/admin/src/i18n/locales/`. `en.ts` is the source of truth, and the other locale files fail typecheck if they miss or add any key.

## Project structure

```
packages/shared   Types and path normalization
packages/worker   Hono app, D1, cron, static assets
packages/sdk      Browser script, built to worker/assets/catcounter.js
packages/admin    Vue 3 admin panel, built to worker/assets/admin
```

## License

MIT
