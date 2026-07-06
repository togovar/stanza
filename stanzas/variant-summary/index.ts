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
 * variant_summary API のバインディングローデータ。
 * reference フィールドは "…/chr/assembly" 形式の URI で、表示前に分解が必要。
 *
 * 検証用: variant_summary の SPARQL が gene/hgnc/symbol/approved_name も
 * 直接返すようになった fix/variant_summary ブランチに合わせて追加している。
 * このブランチがマージされるまでの暫定対応。
 */
interface VariantSummarySparqlBinding {
  /** 染色体・アセンブリを含む参照ゲノムURI（例: "http://identifiers.org/hco/1/GRCh38"） */
  reference?: string;
  type?: string;
  position?: string;
  ref?: string;
  alt?: string;
  gene?: string; // Ensembl 遺伝子 URI
  hgnc?: string; // "http://identifiers.org/hgnc/{id}" 形式のURI。リンクに直接使える。
  symbol?: string; // HGNC 承認シンボル（例: "PLEKHG5"）
  approved_name?: string; // HGNC 承認名（例: "pleckstrin homology and RhoGEF..."）
}

/**
 * Handlebars テンプレートへ渡す variant_summary の表示データ。
 * reference URI を分解した chr / assembly を追加し、
 * ref / alt は表示用に整形済みの値に差し替えてある。
 * gene/hgnc/symbol/approved_name は GeneDisplayData 側で扱うため除外する。
 */
interface VariantSummaryDisplayData extends Omit<
  VariantSummarySparqlBinding,
  "reference" | "gene" | "hgnc" | "symbol" | "approved_name"
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
  /** 遺伝子情報。バリアントが遺伝子領域外の場合は undefined。 */
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
  if (!sparqlist) {
    throw new Error("sparqlist parameter is required");
  }

  const queryString = new URLSearchParams({
    tgv_id: String(tgv_id ?? ""),
  }).toString();

  return `${sparqlist}/api/variant_summary?${queryString}`;
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
 * variant_summary バインディングから遺伝子表示データを組み立てる。
 *
 * 検証用: gene/hgnc/symbol/approved_name が variant_summary の結果に
 * 直接含まれるようになった fix/variant_summary ブランチに合わせている。
 * バリアントが遺伝子領域外の場合は symbol 等が undefined になるため、
 * その場合は表示データなし（undefined）として扱う。
 */
const convertSummaryBindingToGeneDisplayData = (
  binding: VariantSummarySparqlBinding,
): GeneDisplayData | undefined => {
  if (!binding.symbol) {
    return undefined;
  }

  return {
    symbol: binding.symbol,
    hgnc_url: binding.hgnc, // identifiers.org URI はそのままリンク href に使える
    approved_name: binding.approved_name,
  };
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantSummary extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   *
   * 検証用: variant_summary の結果に gene/hgnc/symbol/approved_name も
   * 含まれる fix/variant_summary ブランチに合わせ、1回の fetch のみ行う。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as StanzaInputParams;

    const templateParams: TemplateRenderParams = { params };

    try {
      const summaryApiUrl = buildVariantSummaryApiUrl(params);
      const bindings = await fetchVariantSummaryFromApi(summaryApiUrl);
      const firstBinding = bindings[0];
      if (firstBinding) {
        templateParams.result =
          convertSummaryBindingToDisplayData(firstBinding);
        templateParams.gene =
          convertSummaryBindingToGeneDisplayData(firstBinding);
      }
    } catch (reason) {
      templateParams.error = {
        message: reason instanceof Error ? reason.message : String(reason),
      };
    }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: templateParams,
    });
  }
}
