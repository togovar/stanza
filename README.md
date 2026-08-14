# togovar-stanza

TogoVarで利用する [Togostanza](https://togostanza.github.io/) 用stanza集です。

公開環境:

- [Togovar-Stanza](https://grch38.togovar.org/stanza)

## 必要環境

- Node.js: `20.19.x`
- npm: `package-lock.json` に合わせて利用します
- yarn: `1.22+`（Togostanza標準の手順を使う場合）

## セットアップ

```bash
npm install
```

## 開発

ローカルでstanzaを配信します。

```bash
npm run dev
```

`npm start` でも同じ開発サーバーを起動できます。

Togostanzaのジェネレーターで新しいstanzaを作成します。

```bash
npm run generate -- <stanza-id>
```

## ビルド

配信用のファイルを `dist/` に生成します。

```bash
npm run build
```

## 検証

JavaScript/TypeScriptとSCSSを確認します。

```bash
npm run lint
```

個別に確認する場合:

```bash
npm run lint:js
npm run lint:css
npm run lint:css:fix
npm run typecheck
```

lint、型チェック、ビルドをまとめて確認する場合:

```bash
npm run validate
```

## ディレクトリ構成

```txt
stanzas/
  <stanza-id>/
    index.js または index.ts
    metadata.json
    style.scss
    templates/
      stanza.html.hbs
lib/
  複数stanzaで共有するJavaScript/TypeScriptユーティリティ
types/
  型定義を持たないnpmパッケージ向けのambient module宣言（.d.ts）
assets/
  css/
  icons/
  vendor/
togostanza-build.mjs
```

各stanzaは通常、次のファイルで構成します。

- `index.js` または `index.ts`: stanza本体
- `templates/stanza.html.hbs`: Handlebarsテンプレート
- `style.scss`: stanza専用スタイル
- `metadata.json`: Togostanzaメタデータと入力パラメータ
- `README.md`: stanza個別の説明

## Stanza一覧

現在のstanzaディレクトリ:

- `disease-header`
- `disease-mgend`
- `gene-genomic-context`
- `gene-header`
- `gene-mgend`
- `gene-protein-browser`
- `gene-protein-structure`
- `gene-publication`
- `gene-summary`
- `jogo-haplotype-explorer`
- `variant-clinvar`
- `variant-frequency`
- `variant-gene`
- `variant-genomic-context`
- `variant-header`
- `variant-links`
- `variant-mgend`
- `variant-other-overlapping-variants`
- `variant-publication`
- `variant-summary`
- `variant-transcript`

### variant系stanzaの利用API

variant系stanzaは、主に SPARQList と TogoVar検索APIを使います。`variant` パラメータ（VCF representation: `CHROM-POS-REF-ALT`）への対応方法はstanzaごとに異なります。

| Stanza | 主なAPI | Endpoint / URL | `variant` 指定時の扱い |
| --- | --- | --- | --- |
| `variant-clinvar` | SPARQList | `/api/variant_clinvar` | SPARQList endpoint へ `variant` を渡す |
| `variant-frequency` | TogoVar検索API | `/api/search/variant`, `/search`, `/auth/status` | `/api/search/variant` で `tgv_id` に解決し、頻度取得は `/search?term=<tgv_id>` を使う |
| `variant-gene` | SPARQList | `/api/variant_gene` | SPARQList endpoint へ `variant` を渡す |
| `variant-genomic-context` | SPARQList / JBrowse | `/api/variant_summary`, JBrowse URL | SPARQList endpoint へ `variant` を渡し、取得した座標で JBrowse を表示する |
| `variant-header` | TogoVar検索API / SPARQList | `/api/search/variant`, `/api/tgv2rs` | TogoVar検索APIで `tgv_id` に解決してから、`tgv_id` だけを `tgv2rs` に渡す |
| `variant-links` | TogoVar検索API / SPARQList | `/api/search/variant`, `/api/variant_mogplus` | TogoVar検索APIで外部リンクを取得する。MoG+ は GRCh38 の場合だけ SPARQList へ問い合わせる |
| `variant-mgend` | TogoVar検索API | `/api/search/variant` | TogoVar検索APIで `tgv_id` または location 検索から該当variantを取得する |
| `variant-other-overlapping-variants` | SPARQList | `/api/variant_other_alternative_alleles` | SPARQList endpoint へ `variant` を渡し、入力variant自身は表示から除外する |
| `variant-publication` | TogoVar検索API / SPARQList | `/api/search/variant`, `/api/tgv2rs`, `/api/variant_publication` | TogoVar検索APIで `tgv_id` に解決し、`tgv2rs` で RefSNP ID を取得してから文献を取得する |
| `variant-summary` | SPARQList | `/api/variant_summary` | SPARQList endpoint へ `variant` を渡す。正常な空結果は値欄を空欄表示にする |
| `variant-transcript` | SPARQList | `/api/variant_transcript` | SPARQList endpoint へ `variant` を渡す |

補足:

- TogoVar検索APIを使うstanzaの `data-url` は、TogoVar API base URL または `/api/search/variant` endpoint のどちらを指定しても動くように正規化しています。
- `tgv_id` と `variant` の両方が指定された場合は、全体方針として `tgv_id` を優先します。
- `tgv2rs` は TogoVar ID (`tgv_id`) から RefSNP ID (`rsID`) を取得するSPARQList endpointです。`variant` は直接解釈しないため、必要なstanzaでは先にTogoVar検索APIで `tgv_id` に解決してから呼び出します。
- SPARQListを使うstanzaで `variant` を指定する場合は、対応するSPARQList endpoint 側も `variant` を解決できる必要があります。

## このリポジトリのブランチ運用

- featureブランチは `staging` から作成します。
- 変更が完成したら `staging` へPRを出します。レビューは社内の別担当者に依頼します。
- `staging` への反映（マージ）は弊社の判断で行います。
- `master` への反映は、お客さん（TogoVar側）から依頼があったタイミングで行います。実際のdeployはバックエンド担当に依頼します。

## 関連リポジトリとの開発フロー

このリポジトリの一部stanzaはsparqlist（`github.com/togovar/sparqlist`）やTogoVarフロントエンド（`github.com/togovar/togovar`）と連携します。それぞれ別リポジトリで、sparqlistの画面から直接クエリを編集する運用にはなっていません。変更が必要な場合は以下のフローに従います。

### togovar/sparqlist

このリポジトリ（`nbdc-forked-togovar-stanza`）と同じく、`github.com/togovar/sparqlist` は `github.com/PENQEinc/togovar-sparqlist` としてforkして開発します。

1. `PENQEinc/togovar-sparqlist` をローカルにgit cloneし、`upstream` に `togovar/sparqlist` を設定する（このリポジトリの `origin`/`upstream` 構成と同様）。
2. `develop` を最新化した上でfeature branchを作成し、変更をcommitする。
3. `PENQEinc/togovar-sparqlist` のfeature branchから `togovar/sparqlist` の `develop` へPRを出す（Assigneesにバックエンド担当を指定すると通知が届く）。
4. バックエンド担当がmergeとstagingへのdeployを行う。

通常の開発では、featureが完成した時点で以下いずれかの方法でバックエンド担当にstagingへの反映を依頼します。

- fork上のfeature branchから `togovar/sparqlist` の `develop` へPRを出し（Assigneesにバックエンド担当を指定）、コメントやSlackなどでstagingへの反映を依頼する（推奨）。
- fork上の `develop` を最新化してからPRを出し、Slackなどでstagingへの反映を依頼する。

### togovar/togovar（フロントエンド）

- 通常: `feature` → `staging` へPRを出す（Assignee: バックエンド担当）。
- hotfix（本番を至急修正したい場合）: `master` からbranchしたfeature branchで変更し、`master` へPRを出す。マージとdeployはバックエンド担当が行う。hotfixのcommitは、開発者側の変更とconflictしないよう、原則バックエンド担当が`develop`へmergeする（機能に影響しない部分はすぐには`develop`へmergeされないこともある）。

## コントリビュータ向けメモ

- 複数stanzaで共有する表示ロジックは `lib/` に置きます。TogoVar検索APIのレスポンス型など複数stanzaで使うTypeScript型は `lib/types.ts` に定義しています。SPARQListを使うstanza向けのURL組み立て・fetch処理、および「該当する1件が見つからない場合にエラー表示する」処理は `lib/sparqlist.ts` に共通化しています。
- 共通SCSSコンポーネントは `assets/css/components/` に置き、`assets/css/common.scss` から読み込みます。
- stanza固有の処理やスタイルは、できるだけ各 `stanzas/<stanza-id>/` ディレクトリ内に閉じます。
- stanzaパラメータを追加・変更する場合は、実装と `metadata.json` の両方を更新します。
- AIエージェント向けの実装ルールは `AGENTS.md` にまとめています。
