import { n as normalizeChromosome } from './variant-0dd96a22.js';

const LOCATION_QUERY_LIMIT = 1000;
const VARIANT_SEARCH_API_PATH = "/api/search/variant";
/**
 * stanzaごとに data-url の既存運用が揺れているため、base URL と
 * `/api/search/variant` endpoint のどちらを受け取っても同じ検索APIへ正規化する。
 */
const normalizeTogoVarApiBaseUrl = (dataUrl) => dataUrl.replace(/\/+$/, "").replace(/\/api\/search\/variant$/i, "");
/** TogoVar variant search API の endpoint URL を組み立てる。 */
const buildVariantSearchApiUrl = (dataUrl) => `${normalizeTogoVarApiBaseUrl(dataUrl)}${VARIANT_SEARCH_API_PATH}`;
/**
 * location クエリは同一座標の複数アリルを返し得るため、
 * chromosome/position だけで取得した候補を Ref/Alt で厳密に絞り込む。
 */
const sameVariantAllele = (variantData, parsedVariant) => normalizeChromosome(variantData.chromosome) ===
    normalizeChromosome(parsedVariant.chromosome) &&
    String(variantData.position) === parsedVariant.position &&
    String(variantData.reference).toUpperCase() === parsedVariant.reference &&
    String(variantData.alternate).toUpperCase() === parsedVariant.alternate;
/**
 * variant search API へPOSTする低レベル helper。
 * 呼び出し元が base URL / endpoint のどちらを渡してもここで endpoint に正規化する。
 */
const postVariantQuery = async (dataUrl, query, options = {}) => {
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
    return response.json();
};
/** TogoVar ID で variant search API を検索する。 */
const fetchVariantDataById = (dataUrl, tgvId) => postVariantQuery(dataUrl, { id: [tgvId] });
/**
 * TogoVar検索APIは variant 表記そのものでの検索に対応していないため、
 * location で候補を広めに取得し、呼び出し側で Ref/Alt を照合する。
 * multi-allelic site で候補を落とさないよう、通常の一覧表示より広めに取得する。
 */
const fetchVariantDataByLocation = (dataUrl, parsedVariant) => postVariantQuery(dataUrl, {
    location: {
        chromosome: normalizeChromosome(parsedVariant.chromosome),
        position: Number(parsedVariant.position),
    },
}, {
    offset: 0,
    limit: LOCATION_QUERY_LIMIT,
});
/**
 * tgv_id 指定時は検索結果の先頭を採用する。
 * variant 指定時は location クエリの候補から Ref/Alt が一致するものだけを採用する。
 * tgv_id と variant が両方ある場合は、SPARQList側の解決方針と同じく tgv_id を優先する。
 */
const requireVariantData = (apiResponse, tgvId, parsedVariant, identifier) => {
    const variantData = tgvId
        ? apiResponse.data[0]
        : apiResponse.data.find((data) => parsedVariant !== undefined && sameVariantAllele(data, parsedVariant));
    if (!variantData) {
        throw new Error(`Variant not found for ${identifier}`);
    }
    return variantData;
};
/**
 * stanza側の代表的な入口。tgv_id があればID検索、なければ parsedVariant の
 * location検索へ切り替え、最終的に1件の VariantData として返す。
 */
const fetchVariantDataByIdentifier = async (dataUrl, tgvId, parsedVariant, identifier) => {
    const apiResponse = tgvId
        ? await fetchVariantDataById(dataUrl, tgvId)
        : await fetchVariantDataByLocation(dataUrl, parsedVariant);
    return requireVariantData(apiResponse, tgvId, parsedVariant, identifier);
};

export { fetchVariantDataById as a, fetchVariantDataByLocation as b, fetchVariantDataByIdentifier as f, normalizeTogoVarApiBaseUrl as n, requireVariantData as r };
//# sourceMappingURL=togovar-variant-0e8288d9.js.map
