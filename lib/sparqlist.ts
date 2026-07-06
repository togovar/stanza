import { unwrapValueFromBinding } from "togostanza/utils";

import type { SparqlistStanzaParams } from "./types";

/**
 * SPARQList の API エンドポイント URL を組み立てる。
 * sparqlist が未指定の場合は throw する(暗黙のフォールバックだと埋め込み側の設定ミスに気づきにくいため)。
 * URLSearchParams で tgv_id をエスケープする。
 */
export const buildSparqlistApiUrl = (
  endpoint: string,
  { sparqlist, tgv_id }: SparqlistStanzaParams,
): string => {
  if (!sparqlist) {
    throw new Error("sparqlist parameter is required");
  }

  const queryString = new URLSearchParams({
    tgv_id: String(tgv_id ?? ""),
  }).toString();

  return `${sparqlist}/api/${endpoint}?${queryString}`;
};

/**
 * SPARQList エンドポイントから SPARQL バインディングを取得し、
 * `{ value: "..." }` ラッパーを剥がしたプレーンオブジェクト配列として返す。
 * HTTP エラーは Error を throw し、呼び出し元の render() でまとめてハンドリングする。
 */
export const fetchSparqlBindings = async <T>(
  apiUrl: string,
): Promise<T[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const json = await response.json();
  return unwrapValueFromBinding(json) as T[];
};
