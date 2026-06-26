# AGENTS.md

このファイルは、この `togovar-stanza` リポジトリでAIエージェントが作業するときの指示です。人間向けのセットアップ、起動方法、stanza一覧、運用手順は原則 `README.md` または各 `stanzas/*/README.md` に書いてください。

## 役割分担

- `AGENTS.md`: AIが実装時に守る設計方針、作業ルール、判断基準、間違えやすい仕様を書く。
- `README.md`: リポジトリ概要、開発手順、依存バージョン、起動・ビルド手順を書く。
- `stanzas/*/README.md`: 個別stanzaの概要、入力パラメータ、表示内容、利用例を書く。
- stanzaの入出力、共通lib、ビルド手順、Node/yarn/npm前提を変えた場合は、`AGENTS.md` と関連READMEの更新要否を確認する。
- 小さな見た目調整や一時的な実験だけなら、ドキュメント更新は必須ではない。

## 作業ルール

- 変更前に必ず該当stanza、テンプレート、スタイル、呼び出している共通libを読む。`AGENTS.md` だけを根拠にしない。
- ユーザーの未コミット変更を勝手に戻さない。未追跡ファイルや別作業の差分は、今回の依頼に必要なものだけ触る。
- 既存の設計、命名、JavaScript/TypeScript混在方針、SCSS構成、Togostanza APIの使い方に合わせる。
- 生成物や依存関係の大きな更新は、明確に必要な場合だけ行う。
- 依存を追加・削除・更新する場合は、実行時依存か開発時依存かを確認し、`package.json` と `package-lock.json` を揃える。
- 外部APIの仕様確認が必要な場合は、対象stanzaが実際に参照しているURL・パラメータ・レスポンス形を先に確認する。

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| stanza基盤 | Togostanza 3.x |
| フロントエンド | JavaScript / TypeScript / Web Components |
| テンプレート | Handlebars (`*.html.hbs`) |
| スタイル | SCSS |
| 可視化・表 | d3 / d3-hierarchy / jQuery / DataTables |
| 共通処理 | `lib/` と `assets/css/` |
| パッケージ | npm / yarn |

- Node.js は `package.json` の `engines.node` に従い、現在は `20.19.x` 前提。
- READMEでは yarn が案内されているが、`package-lock.json` と npm scripts も存在する。作業時は既存のロックファイルとユーザー指定を優先する。
- `tsconfig.json` は `strict: false`、`allowJs: true`。既存JSとTSが共存しているため、周辺ファイルの粒度に合わせて変更する。
- `@/` はリポジトリルートを指すパスエイリアス。例: `@/lib/display`, `@/assets/css/common`。
- Webpack/Lit/Pug/Advanced Search/StoreManager はこのリポジトリの前提ではない。別リポジトリ由来の設計を持ち込まない。

## ディレクトリ方針

```txt
.
  stanzas/
    <stanza-id>/
      index.js または index.ts      stanza本体
      templates/stanza.html.hbs    表示テンプレート
      templates/loading.html.hbs   必要な場合のローディング表示
      style.scss                   stanza専用スタイル
      metadata.json                Togostanzaメタデータ・入力パラメータ
      README.md                    stanza個別説明
      assets/                      stanza専用アセット
  lib/                             複数stanzaで共有するJS/TS処理
  assets/
    css/common.scss                複数stanzaで共有するスタイル入口
    css/components/                共通UI部品のSCSS
    css/foundation/_variables.scss 色・サイズなどのSCSS変数とCSS変数
    icons/                         共通アイコン
    vendor/                        同梱している外部ライブラリ
  togostanza-build.mjs             TogostanzaビルドのRollup補助設定
```

- 新しいstanzaは原則 `stanzas/<stanza-id>/` に閉じる。複数stanzaで使う処理だけ `lib/` や `assets/css/components/` に移す。
- stanza専用の見た目は各 `style.scss` に書く。複数stanzaで再利用する表・バッジ・頻度表示などは `assets/css/components/` を確認してから追加する。
- 共通データ変換や表示整形は既存の `lib/display.ts`, `lib/frequency.ts`, `lib/constants.js`, `lib/table.js`, `lib/floating-popover.ts` を優先する。
- `assets/vendor/` は同梱済みの外部ライブラリ置き場。新規追加は必要性、ライセンス、ビルドへの影響を確認する。
- フォントやアイコンを参照する場合は、既存の `assets/fontello.*`, `assets/fontawesome-webfont.svg`, `assets/icons/` の使い方に合わせる。

## Togostanza実装方針

- 各stanzaは `togostanza/stanza` の `Stanza` を継承し、主処理は `async render()` に置く既存パターンに合わせる。
- 描画は `this.renderTemplate({ template: "stanza.html.hbs", parameters: ... })` を基本にする。
- `this.params` の入力値は外部から来る値として扱い、URL生成時は `URLSearchParams` などでエスケープする。
- API取得に失敗した場合は、既存stanzaと同じく `{ error: { message } }` をテンプレートへ渡して表示できる形を優先する。
- `metadata.json` の `stanza:parameter` は実装と同期させる。新しいパラメータを読む場合は、例・説明・必須有無も更新する。
- stanzaの公開IDはディレクトリ名、`metadata.json` の `@id`、ダウンロードファイル名などで整合性を保つ。
- 右上メニューを追加する場合は `togostanza-utils` の `downloadJSONMenuItem` / `downloadCSVMenuItem` / `downloadTSVMenuItem` など既存利用例に合わせる。
- 認証状態やホスト判定のような環境依存処理は、既存の `variant-frequency` のようにlocalhostでの挙動を明示的に分ける。

## TypeScript / JavaScript 方針

- 既存stanzaの多くは JavaScript、`variant-frequency` と一部 `lib/` は TypeScript。ファイル変換は必要な場合だけ行う。
- 新規TypeScriptではできるだけ `any` を避け、外部APIレスポンスは `unknown` から絞り込むか、stanza内で必要な範囲のinterfaceを定義する。
- `togostanza-build.mjs` は、Togostanza標準処理だけでは不安定な `.ts` / `.tsx` 変換を補うRollupプラグインを追加している。拡張子なし相対importもここで解決しているため、変更時はJS/TS混在のビルドに影響する。
- 型チェックは `tsconfig.json` の対象に `stanzas/**/*.js`, `stanzas/**/*.ts`, `lib/**/*.js`, `lib/**/*.ts`, `types/**/*.d.ts` が含まれる。`npm run typecheck` で確認する。
- 既存JSをTSへ変換する場合は、Togostanzaの読み込み、`metadata.json`、テンプレートに渡すデータ構造、importパスへの影響を確認する。
- `console.log` はESLintで禁止。必要なログは `console.warn` または `console.error` を使う。

## スタイル方針

- stanza専用スタイルは `stanzas/<stanza-id>/style.scss` に置く。
- 共通スタイルを使う場合は `@use "@/assets/css/common";` の既存パターンに合わせる。
- 共通UI部品を追加・変更する場合は `assets/css/components/` に置き、`assets/css/common.scss` から `@use` する。
- 色やサイズの共通値は `assets/css/foundation/_variables.scss` の既存SCSS変数・CSS変数を優先する。
- このリポジトリは現在SCSS変数（`$COLOR_*`）も使っている。全面的なCSSカスタムプロパティ移行を別目的で混ぜない。
- `stylelint-config-recess-order` を使っているため、プロパティ順はstylelintに合わせる。
- 疑似要素は `::before` / `::after` のようにダブルコロンで書く。
- `@import` は使わず、既存と同じく `@use` を使う。
- `style.scss` では基本的に `main { ... }` 配下へ閉じ、他stanzaへ漏れるグローバルセレクタを増やさない。
- DataTablesや既存vendor CSSの上書きは、`assets/css/components/_dataTable_wrapper.scss` など既存の責務を確認してから行う。

## テンプレート方針

- テンプレートは `templates/stanza.html.hbs` を基本にし、stanza本体から渡す `parameters` の形と同期させる。
- エラー表示は既存の `{{#with error}} ... {{else}} ... {{/with}}` パターンに合わせる。
- HTMLを直接組み立てるより、できるだけテンプレートに値を渡して描画する。
- Handlebarsに渡す値は表示直前に整形し、テンプレート内の複雑な条件分岐を増やしすぎない。
- 外部由来のHTML文字列を差し込む場合は、エスケープや安全性を確認する。必要がない限りトリプルスタッシュは使わない。

## API / データ方針

- SPARQListを使うstanzaでは、既存の `this.params?.sparqlist || "/sparqlist"` のようなベースURL指定に合わせる。
- TogoVar検索APIを使うstanzaでは、`data-url`、`assembly`、`tgv_id` など `metadata.json` のパラメータと実装を同期させる。
- APIレスポンスの表示整形は、重複実装する前に `lib/display.ts` と `lib/frequency.ts` を確認する。
- dataset、consequence、variant type、prediction labelなどのマスタ値は `lib/constants.js` を確認する。
- 頻度表示は `buildFrequencyDisplay()` と `buildFrequencyMarkerState()` の既存ロジックを優先し、stanza間で表示仕様がずれないようにする。
- 外部APIが空データを返す場合、表示崩れではなく「データなし」または空テーブルとして成立するか確認する。

## コメント規約

- 新規・更新するコメントは日本語を基本にする。
- コメントは「何をしているか」だけでなく、「なぜその形にしているか」を優先する。
- 単にコードを読み上げるコメントは書かない。
- 既存に英語コメントが残っている場合、触った範囲では日本語化を検討する。ただし大規模なコメント翻訳だけの差分は避ける。
- 公開メソッドや複雑なprivate関数を追加する場合は、なぜその分離・条件分岐が必要かを短く残す。

## 検証

変更後は可能な範囲で以下を実行する。

```bash
npm run validate
```

必要に応じた個別確認:

```bash
npm run lint:js
npm run lint:css
npm run lint:css:fix
npm run typecheck
npm run build
```

ローカル表示確認:

```bash
npm run dev
```

- `package.json` では `dev` と `start` のどちらも Togostanza の開発サーバーを起動する。通常の開発案内では `npm run dev` を優先し、npm標準の起動口として `npm start` も残す。
- Node/npm/yarn がPATHにない場合や、ネットワーク制限で依存取得・外部フォント・外部API確認ができない場合は、その事実を報告する。
- `style.scss` だけの軽微な変更なら `npm run lint:css`、JS/TSだけの変更なら `npm run lint:js` のように、変更範囲に応じて小さく確認してから全体確認へ進む。
- APIや認証に関わるstanzaは、成功時・空データ時・エラー時・未ログイン時など、実装が分岐する状態を意識して確認する。

## ドキュメント更新の目安

- 新しいstanzaを追加したら、`stanzas/<stanza-id>/README.md` と `metadata.json` を更新する。
- 既存stanzaの入力パラメータ、表示項目、外部API、必要な認証状態を変えたら、個別READMEと `metadata.json` の更新要否を確認する。
- 共通libや共通スタイルの使い方を変え、他stanzaの実装方針に影響する場合は、この `AGENTS.md` も更新する。
- セットアップや起動コマンドを変えたら、ルート `README.md` を更新する。
