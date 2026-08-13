import type { ParsedVariant } from "@/lib/variant";
import { normalizeChromosome } from "@/lib/variant";
import type { TogoVarApiResponse, VariantData } from "./types";

const LOCATION_QUERY_LIMIT = 1000;
const VARIANT_SEARCH_API_PATH = "/api/search/variant";

export const normalizeTogoVarApiBaseUrl = (dataUrl: string): string =>
  dataUrl.replace(/\/+$/, "").replace(/\/api\/search\/variant$/i, "");

export const buildVariantSearchApiUrl = (dataUrl: string): string =>
  `${normalizeTogoVarApiBaseUrl(dataUrl)}${VARIANT_SEARCH_API_PATH}`;

const sameVariantAllele = (
  variantData: VariantData,
  parsedVariant: ParsedVariant,
): boolean =>
  normalizeChromosome(variantData.chromosome) ===
    normalizeChromosome(parsedVariant.chromosome) &&
  String(variantData.position) === parsedVariant.position &&
  String(variantData.reference).toUpperCase() === parsedVariant.reference &&
  String(variantData.alternate).toUpperCase() === parsedVariant.alternate;

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

export const fetchVariantDataById = (
  dataUrl: string,
  tgvId: string,
): Promise<TogoVarApiResponse> => postVariantQuery(dataUrl, { id: [tgvId] });

/**
 * TogoVar検索APIは variant 表記そのものでの検索に対応していないため、
 * location で候補を広めに取得し、呼び出し側で Ref/Alt を照合する。
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
