<p align="right">
  <a href="README.md">简体中文</a> | <a href="README.en.md">English</a> | <b>日本語</b>
</p>

<p align="center">
  <img src="assets/logo.png" alt="CatCounter logo" width="200">
</p>

<h1 align="center">CatCounter</h1>

<p align="center">Cloudflare Workers 上で動くブログのアクセスカウンターです。無料プランで動作し、必要なのは D1 データベースだけです。</p>

- サイト全体の PV/UV、記事ごとの PV/UV、日別の推移、参照元・地域・デバイスの内訳
- 1 つのデプロイで複数のブログを扱え、それぞれに専用のトークンを発行
- 管理画面を内蔵：統計の閲覧、サイトとトークンの管理、カウントの手動修正。表示言語は English / 日本語 / 简体中文 に対応
- script タグ 1 行で導入でき、不蒜子（Busuanzi）の要素 id と互換
- 生の IP アドレスは保存せず、訪問者の重複判定には毎日ローテーションするソルトでハッシュ化した値を使用

## デプロイ（すべて Cloudflare ダッシュボードで操作）

1. このリポジトリを自分の GitHub アカウントに **Fork** します。
2. **Git デプロイを接続**：ダッシュボード → Workers & Pages → Create → Workers → Import a repository → Fork したリポジトリを選択。
   - Build command：`pnpm install && pnpm build`
   - Deploy command：デフォルトの `npx wrangler deploy` のまま
   - その他はデフォルトのまま Create and deploy をクリック。
   初回デプロイ時に Wrangler が `catcounter` という名前の D1 データベースを自動作成して Worker にバインドするため、手動でデータベースを作る必要はありません。同名のデータベースがすでにアカウントにある場合はそれを再利用します。
3. **シークレットを設定**：デプロイ完了後、その Worker → Settings → Variables and Secrets → Add：
   - `ADMIN_PASSWORD`：管理画面のログインパスワード（タイプは Secret）
   - `SESSION_SECRET`：任意の長いランダム文字列。セッションの署名と訪問者のハッシュに使用（タイプは Secret）
   その後 Deployments ページに戻り、最新のデプロイで Retry deployment をクリックしてシークレットを反映させます。
4. **管理画面にログイン**：`https://<あなたのworker>.workers.dev/admin/` を開き、パスワードを入力して最初のサイトを作成します。データベースのテーブルは最初のリクエスト時に自動で作成されます。
5. 任意：Settings → Domains & Routes でカスタムドメイン（例：`counter.example.com`）を設定できます。

以降、Fork したリポジトリの main ブランチに push するたびに、Cloudflare が自動で再ビルド・再デプロイします。

## サイトへの導入

管理画面でサイトを作成すると埋め込みコードが表示されます。一般的な形は次のとおりです：

```html
<script async src="https://<あなたのworkerドメイン>/catcounter.js" data-token="cc_xxx"></script>

サイト閲覧数 <span data-cc="site_pv">-</span> 回、訪問者 <span data-cc="site_uv">-</span> 人
この記事の閲覧数 <span data-cc="page_pv">-</span> 回、読者 <span data-cc="page_uv">-</span> 人
```

- サイトの **オリジン許可リスト** には、ページが配信されるオリジン（例：`https://blog.example.com`）を含める必要があります。含まれていないとリクエストは拒否されます。ローカルでプレビューする場合は `http://localhost:4000` も追加してください。
- 一覧ページで記事ごとの閲覧数を表示するには、各項目に `data-cc-path` を付けます。スクリプトはそれらを 1 回のリクエストにまとめ、カウントは増やしません。

```html
<li data-cc-path="/posts/hello/">Hello <span data-cc="page_pv">-</span></li>
```

- 不蒜子との互換：`busuanzi_value_site_pv`、`busuanzi_value_site_uv`、`busuanzi_value_page_pv`、`busuanzi_value_page_uv` の id をすでに使っているテーマは、script タグを差し替えるだけで動きます。
- pjax を使うテーマでは、ページ遷移後に `window.CatCounter.refresh()` を呼び出してください。
- スクリプトの任意属性：`data-path` で現在のパスを上書き、`data-no-hit` で読み取りのみ（カウントしない）。

## Hexo テーマへの導入

### hexo-theme-warmpaper（組み込みサポート）

[hexo-theme-warmpaper](https://github.com/finch-xu/hexo-theme-warmpaper) は CatCounter に標準対応しているため、テンプレートを編集する必要はありません。設定を記入するだけです：

1. 管理画面でサイトを作成し、Origin 許可リストにブログのオリジンを追加して（ローカルで `hexo server` を使う場合は `http://localhost:4000` も追加）、token をコピーします。
2. ブログのテーマ設定ファイル `_config.yml` を編集します：

   ```yaml
    catcounter:
      enable: true
      endpoint: 'https://counter.example.com'   # Worker のオリジン（パスなし）
      token: ''                                  # 管理画面でサイトを作成して発行した cc_xxx
      show_site: true    # フッターに「総アクセス / 訪問者」を表示
      show_post: true    # 記事ページのメタ行に「閲覧 N」を表示
      show_list: true    # トップページ一覧の各カードに「閲覧 N」を表示（ページごとに読み取り専用リクエストが 1 回増える。カウントはしない）
      label_site_pv: '総アクセス'
      label_site_uv: '訪問者'
      label_page_pv: '閲覧'
   ```

   これは Hexo 5 以降の独立したテーマ設定ファイルで、テーマ本体の `_config.yml` とディープマージされます。そのため `git pull` でテーマを更新してもコンフリクトしません。`themes/warmpaper/_config.yml` の同名ブロックを直接編集しても構いません。
3. `hexo server` を再起動して確認します。

有効にすると、フッターにサイト全体の総閲覧数 / 訪問者数、記事ページのメタ行とトップページの各記事カードに閲覧数が表示されます。以下の任意項目も同じ `catcounter` ブロックに記述します：

| 項目 | デフォルト | 説明 |
|---|---|---|
| `show_site` | `true` | フッターにサイト全体の総閲覧数 / 訪問者数を表示 |
| `show_post` | `true` | 記事ページのメタ行に閲覧数を表示 |
| `show_list` | `true` | トップページの各記事カードに閲覧数を表示。ページごとに読み取り専用リクエストが 1 回増える（カウントはしない） |
| `label_site_pv` / `label_site_uv` / `label_page_pv` | `总访问` / `访客` / `阅读` | 表示テキスト。デフォルトは中国語なので、例えば `label_page_pv: 閲覧` のように変更 |

### その他のテーマ

テーマの `_config.yml` に以下を追加します：

```yaml
catcounter:
  enable: true
  endpoint: https://counter.example.com
  token: cc_xxxxxxxxxxxxxxxxxxxxxxxx
```

レイアウト下部のテンプレート（通常は `layout/_partial/footer` または `layout/_partial/scripts`）で script タグを出力します。

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

記事のメタ情報部分に閲覧数のプレースホルダーを置く（EJS）：

```ejs
<span class="post-views">閲覧数 <span data-cc="page_pv">-</span></span>
```

トップページの記事一覧（EJS）：

```ejs
<% page.posts.each(function(post){ %>
  <article data-cc-path="<%= url_for(post.path) %>">
    <a href="<%= url_for(post.path) %>"><%= post.title %></a>
    <span>閲覧数 <span data-cc="page_pv">-</span></span>
  </article>
<% }) %>
```

フッターにサイト全体の数値（EJS）：

```ejs
総閲覧数 <span data-cc="site_pv">-</span> 回 · 訪問者 <span data-cc="site_uv">-</span> 人
```

パスの正規化：`/posts/hello` と `/posts/hello/` は同じページとして扱われ、クエリ文字列とハッシュは無視され、`index.html` は取り除かれます。そのため `url_for(post.path)` の出力をそのまま使えます。

## API

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/hit` | body は JSON 文字列 `{token, path, title?, referrer?}`、`Content-Type: text/plain`。`{site:{pv,uv}, page:{pv,uv}}` を返します。クローラーと重複訪問はカウントされません。 |
| GET | `/api/counts?token=&paths=/a/,/b/` | 読み取り専用の一括取得。最大 50 パス。 |
| GET | `/catcounter.js` | ブラウザ用スクリプト。 |

トークンは公開される識別子であり、安全性はオリジン許可リストのチェックによって担保されます。

## 無料枠

| リソース | 無料枠 | 使用量 |
|---|---|---|
| Workers リクエスト | 10 万 / 日 | ページ閲覧ごとに 1 回、記事一覧のあるページはさらに 1 回 |
| D1 書き込み | 10 万行 / 日 | 1 回の訪問で 7〜9 行、さらにトークンごとに 1 時間あたり 1 行。およそ 1.2 万 PV / 日 |
| D1 読み取り | 500 万行 / 日 | 1 回の訪問で約 3 行 |

トークンは公開されており、オリジン許可リストはブラウザしか制限できません。悪意のあるスクリプトがリクエストを偽造して D1 の書き込み枠を消費する可能性があります。不正なアクセスが見られた場合は、Cloudflare ダッシュボードの Security → WAF → Rate limiting rules で `/api/hit` にレート制限ルールを追加してください（無料プランでは 1 ルールまで）。

## ローカル開発

```bash
pnpm install
cp .dev.vars.example .dev.vars   # ローカル用のパスワードを記入
pnpm dev                          # Worker、ポート 8787
pnpm --filter @catcounter/admin dev   # 管理画面のホットリロード、http://localhost:5173/admin/ を開く
pnpm test                         # すべてのテスト
pnpm build                        # SDK と管理画面を packages/worker/assets にビルド
```

curl で訪問をシミュレートする場合は、`-A 'Mozilla/5.0 (Macintosh) Chrome/120'` のようにブラウザの User-Agent を付ける必要があります。curl のデフォルト UA はクローラーと判定され、カウントされません。

ローカル開発には Chrome を使ってください。Chrome は `localhost` 上の Secure cookie を許可します。

管理画面の翻訳は `packages/admin/src/i18n/locales/` にあります。`en.ts` が基準で、他の言語ファイルでキーが不足または余分にあると typecheck でエラーになります。

## 構成

```
packages/shared   型定義とパスの正規化
packages/worker   Hono アプリ、D1、cron、静的アセット
packages/sdk      ブラウザ用スクリプト、worker/assets/catcounter.js にビルド
packages/admin    Vue 3 の管理画面、worker/assets/admin にビルド
```

## ライセンス

MIT
