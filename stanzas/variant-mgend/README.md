# Variant / MGeND

指定したバリアントに紐づく MGeND の臨床的意義と疾患条件を表示する stanza です。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | No | `tgv6784522` | TogoVar ID。`variant` が無い場合に必要です。 |
| `variant` | No | `1-12345-A-T` | VCF表記 `CHROM-POS-REF-ALT` のバリアント。`tgv_id` が無い場合に必要です。 |
| `data-url` | Yes | `https://stg-grch38.togovar.org/api/search/variant` | TogoVar variant search API URL。 |

`tgv_id` と `variant` の両方が指定された場合は `tgv_id` を優先します。
