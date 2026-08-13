import type { ParsedVariant } from "@/lib/variant";
import { normalizeChromosome } from "@/lib/variant";
import type { TogoVarApiResponse, VariantData } from "./types";

const LOCATION_QUERY_LIMIT = 1000;
const VARIANT_SEARCH_API_PATH = "/api/search/variant";

/**
 * stanzaごとに data-url の既存運用が揺れているため、base URL と
 * `/api/search/variant` endpoint のどちらを受け取っても同じ検索APIへ正規化する。
 */
export const normalizeTogoVarApiBaseUrl = (dataUrl: string): string =>
  dataUrl.replace(/\/+$/, "").replace(/\/api\/search\/variant$/i, "");

/** TogoVar variant search API の endpoint URL を組み立てる。 */
export const buildVariantSearchApiUrl = (dataUrl: string): string =>
  `${normalizeTogoVarApiBaseUrl(dataUrl)}${VARIANT_SEARCH_API_PATH}`;

/**
 * location クエリは同一座標の複数アリルを返し得るため、
 * chromosome/position だけで取得した候補を Ref/Alt で厳密に絞り込む。
 */
const sameVariantAllele = (
  variantData: VariantData,
  parsedVariant: ParsedVariant,
): boolean =>
  normalizeChromosome(variantData.chromosome) ===
    normalizeChromosome(parsedVariant.chromosome) &&
  String(variantData.position) === parsedVariant.position &&
  String(variantData.reference).toUpperCase() === parsedVariant.reference &&
  String(variantData.alternate).toUpperCase() === parsedVariant.alternate;

/**
 * variant search API へPOSTする低レベル helper。
 * 呼び出し元が base URL / endpoint のどちらを渡してもここで endpoint に正規化する。
 */
export const postVariantQuery = async (
  dataUrl: string,
  query: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<TogoVarApiResponse> => {
  const apiUrl = buildVariantSearchApiUrl(dataUrl);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...options, query }),
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returned status ${response.status}`);
  }

  return response.json() as Promise<TogoVarApiResponse>;
};

/** TogoVar ID で variant search API を検索する。 */
export const fetchVariantDataById = (
  dataUrl: string,
  tgvId: string,
): Promise<TogoVarApiResponse> => postVariantQuery(dataUrl, { id: [tgvId] });

/**
 * TogoVar検索APIは variant 表記そのものでの検索に対応していないため、
 * location で候補を広めに取得し、呼び出し側で Ref/Alt を照合する。
 * multi-allelic site で候補を落とさないよう、通常の一覧表示より広めに取得する。
 */
export const fetchVariantDataByLocation = (
  dataUrl: string,
  parsedVariant: ParsedVariant,
): Promise<TogoVarApiResponse> =>
  postVariantQuery(
    dataUrl,
    {
      location: {
        chromosome: normalizeChromosome(parsedVariant.chromosome),
        position: Number(parsedVariant.position),
      },
    },
    {
      offset: 0,
      limit: LOCATION_QUERY_LIMIT,
    },
  );

/**
 * tgv_id 指定時は検索結果の先頭を採用する。
 * variant 指定時は location クエリの候補から Ref/Alt が一致するものだけを採用する。
 * tgv_id と variant が両方ある場合は、SPARQList側の解決方針と同じく tgv_id を優先する。
 */
export const requireVariantData = (
  apiResponse: TogoVarApiResponse,
  tgvId: string | undefined,
  parsedVariant: ParsedVariant | undefined,
  identifier: string,
): VariantData => {
  const variantData = tgvId
    ? apiResponse.data[0]
    : apiResponse.data.find(
        (data) =>
          parsedVariant !== undefined && sameVariantAllele(data, parsedVariant),
      );

  if (!variantData) {
    throw new Error(`Variant not found for ${identifier}`);
  }

  return variantData;
};

/**
 * stanza側の代表的な入口。tgv_id があればID検索、なければ parsedVariant の
 * location検索へ切り替え、最終的に1件の VariantData として返す。
 */
export const fetchVariantDataByIdentifier = async (
  dataUrl: string,
  tgvId: string | undefined,
  parsedVariant: ParsedVariant | undefined,
  identifier: string,
): Promise<VariantData> => {
  const apiResponse = tgvId
    ? await fetchVariantDataById(dataUrl, tgvId)
    : await fetchVariantDataByLocation(dataUrl, parsedVariant as ParsedVariant);

  return requireVariantData(apiResponse, tgvId, parsedVariant, identifier);
};
