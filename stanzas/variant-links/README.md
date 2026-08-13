# Variant links

指定したバリアントに紐づく外部データベースリンクをカテゴリ別に表示するstanzaです。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | No(`variant`未指定時は必須) | `tgv167913213` | TogoVar ID。 |
| `variant` | No(`tgv_id`未指定時は必須) | `1-12345-A-T` | VCF表記(CHROM-POS-REF-ALT)のバリアント。TogoVar未登録で`tgv_id`を持たないバリアントを表示する場合に使う。両方指定時は`tgv_id`を優先する。 |
| `data-url` | Yes | `https://stg-grch38.togovar.org/api/search/variant` | TogoVar variant search API URL。 |
| `assembly` | No | `GRCh38` | TogoVar variant 座標の assembly。MoG+ は GRCh38 の場合だけ問い合わせます。未指定時は `data-url` / `sparqlist` から `GRCh38`/`GRCh37` を推定します。 |
| `sparqlist` | No | `https://stg-grch38.togovar.org/sparqlist` | MoG+ cross species link を取得するSPARQList URL。未指定時は MoG+ を `N/A` と表示します。 |
| `mogplus_ver` | No | `mogplus21` | MoG+ version。未指定時は `mogplus21` を使います。 |

## Data Source

このstanzaは TogoVar variant search API の `external_links` を参照します。
`tgv_id` 指定時は `id` クエリで直接引けますが、`variant` 指定時は
TogoVar検索APIが variant 表記そのものでの検索に対応していないため、
`location`(chromosome/position) クエリで同じ位置の候補を取得し、
reference/alternate が一致するものをこのstanza側で絞り込みます
(multi-allelicサイトでは同じ位置に複数バリアントが存在するため)。
MoG+ cross species は TogoVar API の `external_links` ではなく、
SPARQList の `variant_mogplus` endpoint から取得します。`variant_mogplus` へ渡す
座標は GRCh38 として扱われるため、`assembly` が `GRCh38` と解決できる場合だけ
MoG+ を問い合わせます。`GRCh37` または assembly が解決できない場合は MoG+ を
`N/A` と表示します。

```txt
tgv_id=tgv167913213
data-url=https://grch38.togovar.org/api/search/variant
sparqlist=https://grch38.togovar.org/sparqlist
```
