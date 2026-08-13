# Variant / Frequency

指定したバリアントのデータセット別アリル頻度を表示する stanza です。

## Parameters

| Key | Required | Example | Description |
| --- | --- | --- | --- |
| `tgv_id` | No | `tgv66359566` | TogoVar ID。`variant` が無い場合に必要です。 |
| `variant` | No | `1-12345-A-T` | VCF表記 `CHROM-POS-REF-ALT` のバリアント。`tgv_id` が無い場合に使えます。 |
| `assembly` | Yes | `GRCh38` | Assembly。`GRCh37` または `GRCh38`。 |
| `data-url` | Yes | `https://stg-grch38.togovar.org` | TogoVar API base URL。`/api/search/variant` endpoint を指定しても base URL へ正規化します。頻度取得は `/search`、`variant` から TogoVar ID への解決は `/api/search/variant` を使います。 |
| `no_data_message` | No | `No data found.` | データが無い場合の表示メッセージ。 |
| `check_local_auth_status` | No | `true` | localhost でもログイン状態を確認する場合は `true`。 |

`tgv_id` と `variant` の両方が指定された場合は `tgv_id` を優先します。
