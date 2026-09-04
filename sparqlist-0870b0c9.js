import { u as unwrapValueFromBinding } from './utils-97dc77a0.js';

/**
 * tgv_id / variant(VCF表記 CHROM-POS-REF-ALT) と追加パラメータから、
 * 空文字/未指定の項目を除いたクエリ文字列を組み立てる。
 * sparqlist側は tgv_id があればそれを優先し、無ければ variant で解決する(どちらも無ければエラー)。
 * sparqlist を必須化していないstanza(フォールバックURL方式)からも共通で使うため、
 * URL全体の組み立て(buildSparqlistApiUrl)とは切り離してある。
 */
const buildIdentifierQueryString = ({ tgv_id, variant }, additionalParams = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries({ tgv_id, variant, ...additionalParams }).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
            queryParams.set(key, value);
        }
    });
    return queryParams.toString();
};
/**
 * SPARQList の API エンドポイント URL を組み立てる。
 * sparqlist が未指定の場合は throw する(暗黙のフォールバックだと埋め込み側の設定ミスに気づきにくいため)。
 * URLSearchParams で値と追加パラメータをエスケープする。
 */
const buildSparqlistApiUrl = (endpoint, params, additionalParams = {}) => {
    if (!params.sparqlist) {
        throw new Error("sparqlist parameter is required");
    }
    const queryString = buildIdentifierQueryString(params, additionalParams);
    const baseUrl = params.sparqlist.replace(/\/+$/, "");
    return `${baseUrl}/api/${endpoint}?${queryString}`;
};
/**
 * エラーメッセージ表示用に、tgv_id / variant のうち指定されている方の識別子を返す。
 * どちらも無い場合は空文字を返す。
 */
const describeVariantIdentifier = ({ tgv_id, variant, }) => tgv_id || variant || "";
/**
 * SPARQList エンドポイントから SPARQL バインディングを取得し、
 * `{ value: "..." }` ラッパーを剥がしたプレーンオブジェクト配列として返す。
 * HTTP エラーは Error を throw し、呼び出し元の render() でまとめてハンドリングする。
 *
 * Accept は `application/sparql-results+json` を指定する。`application/json` だと
 * ALTが長い挿入変異など一部のクエリでSPARQList側が空の bindings を返すことがあるため
 * （レスポンスの形式自体は同じSPARQL結果JSON）、標準のMIMEタイプで明示的にリクエストする。
 */
const fetchSparqlBindings = async (apiUrl) => {
    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/sparql-results+json" },
    });
    if (!response.ok) {
        throw new Error(`${apiUrl} returns status ${response.status}`);
    }
    const json = await response.json();
    return unwrapValueFromBinding(json);
};
/**
 * バインディング配列から該当する1件(先頭)を取り出す。
 * 空の場合は notFoundMessage を持つ Error を throw する。
 * こうすることで、該当データなしのケースも呼び出し元の catch へ合流させ、
 * result・error のどちらもセットされない「空表示」を防ぐ。
 */
const requireFirstBinding = (bindings, notFoundMessage) => {
    const firstBinding = bindings[0];
    if (!firstBinding) {
        throw new Error(notFoundMessage);
    }
    return firstBinding;
};

export { buildIdentifierQueryString as a, buildSparqlistApiUrl as b, describeVariantIdentifier as d, fetchSparqlBindings as f, requireFirstBinding as r };
//# sourceMappingURL=sparqlist-0870b0c9.js.map
