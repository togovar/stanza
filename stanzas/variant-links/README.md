# Variant links

指定したバリアントに紐づく外部データベースリンクをカテゴリ別に表示するstanzaです。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | Yes | `tgv167913213` | TogoVar ID。 |
| `data-url` | Yes | `https://stg-grch38.togovar.org/api/search/variant` | TogoVar variant search API URL。 |
| `sparqlist` | No | `https://stg-grch38.togovar.org/sparqlist` | MoG+ cross species link を取得するSPARQList URL。未指定時は MoG+ を `N/A` と表示します。 |
| `mogplus_ver` | No | `mogplus21` | MoG+ version。未指定時は `mogplus21` を使います。 |

## Data Source

このstanzaは TogoVar variant search API の `external_links` を参照します。
MoG+ cross species は TogoVar API の `external_links` ではなく、
SPARQList の `variant_mogplus` endpoint から取得します。

```txt
tgv_id=tgv167913213
data-url=https://grch38.togovar.org/api/search/variant
sparqlist=https://grch38.togovar.org/sparqlist
```
