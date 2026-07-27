// togostanza/utils は型定義を持たないため、使用する関数を最小限で宣言する
declare module "togostanza/utils" {
  /**
   * SPARQL JSON フォーマットのバインディングを、フィールド名をキーとするプレーンオブジェクトの配列に変換する。
   * 例: `{ "name": { "value": "foo" } }` → `{ "name": "foo" }`
   */
  export function unwrapValueFromBinding(
    sparqlJson: unknown
  ): Record<string, string>[];
}
