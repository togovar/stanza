import { u as unwrapValueFromBinding } from './utils-97dc77a0.js';

/**
 * SPARQList の API エンドポイント URL を組み立てる。
 * sparqlist が未指定の場合は throw する(暗黙のフォールバックだと埋め込み側の設定ミスに気づきにくいため)。
 * URLSearchParams で tgv_id をエスケープする。
 */
const buildSparqlistApiUrl = (endpoint, { sparqlist, tgv_id }) => {
    if (!sparqlist) {
        throw new Error("sparqlist parameter is required");
    }
    const queryString = new URLSearchParams({
        tgv_id: String(tgv_id ?? ""),
    }).toString();
    const baseUrl = sparqlist.replace(/\/+$/, "");
    return `${baseUrl}/api/${endpoint}?${queryString}`;
};
/**
 * SPARQList エンドポイントから SPARQL バインディングを取得し、
 * `{ value: "..." }` ラッパーを剥がしたプレーンオブジェクト配列として返す。
 * HTTP エラーは Error を throw し、呼び出し元の render() でまとめてハンドリングする。
 */
const fetchSparqlBindings = async (apiUrl) => {
    const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
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

export { buildSparqlistApiUrl as b, fetchSparqlBindings as f, requireFirstBinding as r };
//# sourceMappingURL=sparqlist-19d6bf99.js.map
