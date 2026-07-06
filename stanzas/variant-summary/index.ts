import Stanza from "togostanza/stanza";

import * as display from "@/lib/display";
import { DEFAULT_SPARQLIST_BASE_URL } from "@/lib/sparqlist";

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
 * variant_summary API のバインディングローデータ。
 * reference フィールドは "…/chr/assembly" 形式の URI で、表示前に分解が必要。
 */
interface VariantSummarySparqlBinding {
  /** 染色体・アセンブリを含む参照ゲノムURI（例: "http://identifiers.org/hco/1/GRCh38"） */
  reference?: string;
  type?: string;
  position?: string;
  ref?: string;
  alt?: string;
}

/**
 * variant_gene API のバインディングローデータ。
 * 同一遺伝子の synonym ごとに1行返るため、複数行の束をまとめて変換する。
 */
interface GeneApiSparqlBinding {
  variant?: string;
  gene?: string; // Ensembl 遺伝子 URI
  hgnc?: string; // "http://identifiers.org/hgnc/{id}" 形式のURI。リンクに直接使える。
  symbol?: string; // HGNC 承認シンボル（例: "PLEKHG5"）
  approved_name?: string; // HGNC 承認名（例: "pleckstrin homology and RhoGEF..."）
  synonym?: string; // 別名（バインディングが synonym 数だけ繰り返される）
}

/**
 * Handlebars テンプレートへ渡す variant_summary の表示データ。
 * reference URI を分解した chr / assembly を追加し、
 * ref / alt は表示用に整形済みの値に差し替えてある。
 */
interface VariantSummaryDisplayData extends Omit<
  VariantSummarySparqlBinding,
  "reference"
> {
  chr?: string;
  assembly?: string;
  /** display.refAlt() が展開する表示用フィールド群 */
  ref?: string;
  alt?: string;
  ref_length?: number;
  alt_length?: number;
}

/**
 * Handlebars テンプレートへ渡す遺伝子の表示データ。
 * 複数 synonym が返る binding から1遺伝子分に集約している。
 */
interface GeneDisplayData {
  symbol?: string;
  /** HGNC の identifiers.org URI。テンプレートでリンクの href に直接使える。 */
  hgnc_url?: string;
  approved_name?: string;
}

/** renderTemplate に渡すパラメータ全体。エラー時は result を持たない。 */
interface TemplateRenderParams {
  params: StanzaInputParams;
  result?: VariantSummaryDisplayData;
  /** 遺伝子情報。variant_gene API が空を返した場合は undefined。 */
  gene?: GeneDisplayData;
  error?: {
    message: string;
  };
}

// ============================================================
// 定数
// ============================================================

/** TogoVar 標準フォント。stanza 初期化時に一度だけロード開始する。 */
const ROBOTO_CONDENSED_CSS_URL =
  "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900";

// ============================================================
// 共通ユーティリティ
// ============================================================

/**
 * SPARQL JSON の `{ value: "..." }` ラッパーを剥がし、
 * フィールド名→値の単純なオブジェクト配列へ正規化する汎用関数。
 * 型パラメータで呼び出し側が期待する binding 型を指定する。
 */
const unwrapSparqlResponse = <T>(response: SparqlJsonResponse): T[] => {
  const bindings = response.results?.bindings ?? [];

  return bindings.map((binding) => {
    const unwrapped = Object.fromEntries(
      Object.entries(binding).map(([key, cell]) => [key, cell.value]),
    );

    return unwrapped as T;
  });
};

// ============================================================
// URL 組み立て
// ============================================================

/**
 * SPARQList の variant_summary エンドポイント URL を組み立てる。
 * URLSearchParams でクエリをエスケープする。
 */
const buildVariantSummaryApiUrl = ({
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
 * SPARQList の variant_gene エンドポイント URL を組み立てる。
 * variant_summary と同じ tgv_id パラメータで遺伝子情報を取得する。
 */
const buildVariantGeneApiUrl = ({
  sparqlist,
  tgv_id,
}: StanzaInputParams): string => {
  const baseUrl = sparqlist || DEFAULT_SPARQLIST_BASE_URL;
  const queryString = new URLSearchParams({
    tgv_id: String(tgv_id ?? ""),
  }).toString();

  return `${baseUrl}/api/variant_gene?${queryString}`;
};

// ============================================================
// API 取得
// ============================================================

/**
 * variant_summary エンドポイントからバリアント基本情報を取得する。
 * HTTP エラーは Error を throw して呼び出し元でハンドリングする。
 */
const fetchVariantSummaryFromApi = async (
  apiUrl: string,
): Promise<VariantSummarySparqlBinding[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const sparqlResponse = (await response.json()) as SparqlJsonResponse;
  return unwrapSparqlResponse<VariantSummarySparqlBinding>(sparqlResponse);
};

/**
 * variant_gene エンドポイントから遺伝子情報を取得する。
 * バリアントが遺伝子領域外にある場合は空配列が返る。
 * HTTP エラーは Error を throw して呼び出し元でハンドリングする。
 */
const fetchVariantGeneFromApi = async (
  apiUrl: string,
): Promise<GeneApiSparqlBinding[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const sparqlResponse = (await response.json()) as SparqlJsonResponse;
  return unwrapSparqlResponse<GeneApiSparqlBinding>(sparqlResponse);
};

// ============================================================
// データ変換（バインディング → 表示データ）
// ============================================================

/**
 * reference URI の末尾2セグメントから染色体名とアセンブリ名を取り出す。
 * 例: "http://identifiers.org/hco/1/GRCh38" → { chr: "1", assembly: "GRCh38" }
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
 * variant_summary バインディング1件をテンプレート表示データへ変換する。
 *
 * 変換内容:
 * - reference URI → chr / assembly の分離
 * - ref / alt → display.refAlt() で表示文字列・長さフィールドに展開
 */
const convertSummaryBindingToDisplayData = (
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

/**
 * variant_gene のバインディング配列から遺伝子表示データを組み立てる。
 *
 * 同一遺伝子について synonym ごとに1行返るため、先頭バインディングの値を代表値として使う。
 * バリアントが複数遺伝子にまたがる場合でも、サマリー表示では先頭遺伝子のみ表示する。
 * 詳細は variant-gene stanza を参照。
 */
const convertGeneBindingsToDisplayData = (
  bindings: GeneApiSparqlBinding[],
): GeneDisplayData | undefined => {
  const firstBinding = bindings[0];
  if (!firstBinding) {
    return undefined;
  }

  return {
    symbol: firstBinding.symbol,
    hgnc_url: firstBinding.hgnc, // identifiers.org URI はそのままリンク href に使える
    approved_name: firstBinding.approved_name,
  };
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantSummary extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   * variant_summary と variant_gene の2つの API を並列取得して描画する。
   * 遺伝子取得が失敗してもバリアント基本情報は表示できるよう、
   * Promise.allSettled で独立してエラーハンドリングする。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as StanzaInputParams;
    const summaryApiUrl = buildVariantSummaryApiUrl(params);
    const geneApiUrl = buildVariantGeneApiUrl(params);

    // 2つの API を並列取得。一方が失敗しても他方の表示を妨げない。
    const [summaryOutcome, geneOutcome] = await Promise.allSettled([
      fetchVariantSummaryFromApi(summaryApiUrl),
      fetchVariantGeneFromApi(geneApiUrl),
    ]);

    const templateParams: TemplateRenderParams = { params };

    if (summaryOutcome.status === "fulfilled") {
      const firstBinding = summaryOutcome.value[0];
      if (firstBinding) {
        templateParams.result =
          convertSummaryBindingToDisplayData(firstBinding);
      }
    } else {
      templateParams.error = {
        message:
          summaryOutcome.reason instanceof Error
            ? summaryOutcome.reason.message
            : String(summaryOutcome.reason),
      };
    }

    if (geneOutcome.status === "fulfilled") {
      // 空配列の場合は undefined が返り、テンプレートの {{#if gene}} が false になる
      templateParams.gene = convertGeneBindingsToDisplayData(geneOutcome.value);
    }
    // 遺伝子取得失敗はサイレントに無視（サマリー表示には必須ではないため）

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: templateParams,
    });
  }
}
