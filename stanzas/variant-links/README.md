# Variant links

指定したバリアントに紐づく外部データベースリンクをカテゴリ別に表示するstanzaです。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | No | `tgv167913213` | TogoVar ID。`variant` を指定しない場合に必要です。 |
| `variant` | No | `12-111803962-G-A` | chr-pos-ref-alt形式のバリアント表記。`tgv_id` を指定しない場合に必要です。 |
| `sparqlist` | Yes | `http://localhost:3000` | `variant_links` endpoint を持つSPARQList URL。 |

## Local SPARQList

本番の `https://grch38.togovar.org/sparqlist` に `variant_links` endpoint が未反映の場合は、
ローカルで起動したSPARQListを指定してください。

```txt
sparqlist=http://localhost:3000
tgv_id=tgv167913213
```

この設定では、stanzaは次のAPIを参照します。

```txt
http://localhost:3000/api/variant_links?tgv_id=tgv167913213
```
