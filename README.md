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
- `variant-mgend`
- `variant-other-overlapping-variants`
- `variant-publication`
- `variant-summary`
- `variant-transcript`

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

- 複数stanzaで共有する表示ロジックは `lib/` に置きます。TogoVar検索APIのレスポンス型など複数stanzaで使うTypeScript型は `lib/types.ts` に定義しています。
- 共通SCSSコンポーネントは `assets/css/components/` に置き、`assets/css/common.scss` から読み込みます。
- stanza固有の処理やスタイルは、できるだけ各 `stanzas/<stanza-id>/` ディレクトリ内に閉じます。
- stanzaパラメータを追加・変更する場合は、実装と `metadata.json` の両方を更新します。
- AIエージェント向けの実装ルールは `AGENTS.md` にまとめています。
