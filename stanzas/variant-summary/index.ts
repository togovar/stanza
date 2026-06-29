import Stanza from "togostanza/stanza";

import * as display from "@/lib/display";

// ============================================================
// 型定義
// ============================================================

/** stanza が受け取る入力パラメータ。sparqlist は省略可能でデフォルトURLにフォールバックする。 */
interface StanzaInputParams {
  sparqlist?: string;
  tgv_id?: string;
}

/** SPARQList JSON レスポンスの各セルが持つ値ラッパー形式。 */
interface SparqlCellValue {
  value?: string;
}

/**
 * SPARQList が返す SPARQL JSON フォーマット全体。
 * 実データは `results.bindings` 配列に入る。
 */
interface SparqlJsonResponse {
  results?: {
    bindings?: Array<Record<string, SparqlCellValue>>;
  };
}

/**
 * SPARQL バインディングをそのまま表すローデータ型。
 * reference フィールドは "…/chr/assembly" 形式の URI で、表示前に分解が必要。
 */
interface VariantSummarySparqlBinding {
  /** 染色体・アセンブリを含む参照ゲノムURI（例: ".../chr1/GRCh38"） */
  reference?: string;
  type?: string;
  position?: string;
  ref?: string;
  alt?: string;
}

/**
 * Handlebars テンプレートへ渡す表示データ。
 * reference URI を分解した chr / assembly を追加し、
 * ref / alt は表示用に整形済みの値に差し替えてある。
 */
interface VariantSummaryDisplayData
  extends Omit<VariantSummarySparqlBinding, "reference"> {
  chr?: string;
  assembly?: string;
  /** display.refAlt() が展開する表示用フィールド群 */
  ref?: string;
  alt?: string;
  ref_length?: number;
  alt_length?: number;
}

/** renderTemplate に渡すパラメータ全体。エラー時は result を持たない。 */
interface TemplateRenderParams {
  params: StanzaInputParams;
  result?: VariantSummaryDisplayData;
  error?: {
    message: string;
  };
}

// ============================================================
// 定数
// ============================================================

/** stanza パラメータに sparqlist が指定されていない場合のデフォルトベースURL。 */
const DEFAULT_SPARQLIST_BASE_URL = "/sparqlist";

/** TogoVar 標準フォント。stanza 初期化時に一度だけロード開始する。 */
const ROBOTO_CONDENSED_CSS_URL =
  "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900";

// ============================================================
// URL 組み立て / API 取得
// ============================================================

/**
 * SPARQList の variant_summary エンドポイント URL を組み立てる。
 * URLSearchParams でクエリをエスケープすることで、tgv_id に特殊文字が入っても安全。
 */
const buildSparqlistApiUrl = ({
  sparqlist,
  tgv_id,
}: StanzaInputParams): string => {
  const baseUrl = sparqlist || DEFAULT_SPARQLIST_BASE_URL;
  const queryString = new URLSearchParams({
    tgv_id: String(tgv_id ?? ""),
  }).toString();

  return `${baseUrl}/api/variant_summary?${queryString}`;
};

/**
 * SPARQL JSON の `{ value: "..." }` ラッパーを剥がし、
 * フィールド名→値の単純なオブジェクトへ正規化する。
 * togostanza/utils の unwrapValueFromBinding と同等だが、型安全にするため自前で実装している。
 */
const normalizeSparqlBindings = (
  response: SparqlJsonResponse,
): VariantSummarySparqlBinding[] => {
  const bindings = response.results?.bindings ?? [];

  return bindings.map((binding) => {
    const unwrapped = Object.fromEntries(
      Object.entries(binding).map(([key, cell]) => [key, cell.value]),
    );

    return unwrapped as VariantSummarySparqlBinding;
  });
};

/**
 * SPARQList からバリアントサマリーデータを取得してバインディング配列を返す。
 * HTTP エラーは Error を throw し、呼び出し元の render() でまとめてハンドリングする。
 */
const fetchVariantSummaryFromApi = async (
  apiUrl: string,
): Promise<VariantSummarySparqlBinding[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const sparqlResponse = (await response.json()) as SparqlJsonResponse;
  return normalizeSparqlBindings(sparqlResponse);
};

// ============================================================
// データ変換（バインディング → 表示データ）
// ============================================================

/**
 * reference URI の末尾2セグメントから染色体名とアセンブリ名を取り出す。
 * 例: "http://identifiers.org/hco/chr1/GRCh38" → { chr: "chr1", assembly: "GRCh38" }
 * URI 形式でない場合や末尾が不足している場合は undefined になる。
 */
const extractChrAndAssemblyFromUri = (
  referenceUri: string | undefined,
): { chr?: string; assembly?: string } => {
  if (!referenceUri) {
    return {};
  }

  const segments = referenceUri.split("/");
  const [assembly, chr] = segments.slice(-2).reverse();

  return { chr, assembly };
};

/**
 * SPARQL バインディング1件をテンプレート表示データへ変換する。
 *
 * 変換内容:
 * - reference URI → chr / assembly の分離
 * - ref / alt → display.refAlt() で表示文字列・長さフィールドに展開
 */
const convertBindingToDisplayData = (
  binding: VariantSummarySparqlBinding,
): VariantSummaryDisplayData => {
  const { reference, ...sharedFields } = binding;

  const displayData: VariantSummaryDisplayData = {
    ...sharedFields,
    ...extractChrAndAssemblyFromUri(reference),
  };

  // ref / alt の長さが4文字を超える場合は "ACGT..." に省略する（display.refAlt の仕様）
  Object.assign(displayData, display.refAlt(binding.ref, binding.alt));

  return displayData;
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantSummary extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   * 「URL組み立て → データ取得 → 変換 → テンプレート描画」の流れだけが見えるよう保ち、
   * 各処理の詳細は上位の関数へ委譲する。エラーはここで一括補足してテンプレートへ渡す。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as StanzaInputParams;
    const apiUrl = buildSparqlistApiUrl(params);

    // 初期状態は params のみ。取得成功時に result、失敗時に error を追加する
    const templateParams: TemplateRenderParams = { params };

    try {
      const sparqlBindings = await fetchVariantSummaryFromApi(apiUrl);

      // variant_summary は常に1件返る想定だが、バインディングが空の場合は result なしで描画する
      const firstBinding = sparqlBindings[0];
      if (firstBinding) {
        templateParams.result = convertBindingToDisplayData(firstBinding);
      }
    } catch (error) {
      templateParams.error = {
        message: error instanceof Error ? error.message : String(error),
      };
    }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: templateParams,
    });
  }
}
