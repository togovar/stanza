# Variant / Header

指定したバリアントに紐づく RefSNP ID を表示する stanza です。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | No | `tgv219804` | TogoVar ID。`variant` が無い場合に必要です。 |
| `variant` | No | `1-12345-A-T` | VCF表記 `CHROM-POS-REF-ALT` のバリアント。`tgv_id` が無い場合に使えます。 |
| `sparqlist` | No | `https://grch38.togovar.org/sparqlist` | SPARQList URL。 |
| `data-url` | No | `https://stg-grch38.togovar.org/api/search/variant` | `variant` のみ指定時に TogoVar ID へ解決するための URL。TogoVar API base URL または `/api/search/variant` endpoint を指定できます。 |

`tgv_id` と `variant` の両方が指定された場合は `tgv_id` を優先します。
