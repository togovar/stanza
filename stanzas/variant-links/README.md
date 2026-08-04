# Variant links

指定したバリアントに紐づく外部データベースリンクをカテゴリ別に表示するstanzaです。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | Yes | `tgv167913213` | TogoVar ID。 |
| `data-url` | Yes | `https://stg-grch38.togovar.org/api/search/variant` | TogoVar variant search API URL。 |

## Data Source

このstanzaは TogoVar variant search API の `external_links` を参照します。

```txt
tgv_id=tgv167913213
data-url=https://grch38.togovar.org/api/search/variant
```
