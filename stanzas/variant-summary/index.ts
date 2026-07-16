import Stanza from "togostanza/stanza";

import * as display from "@/lib/display";
import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import {
  buildSparqlistApiUrl,
  fetchSparqlBindings,
  requireFirstBinding,
} from "@/lib/sparqlist";
import type {
  SparqlistStanzaParams,
  SparqlistTemplateRenderParams,
} from "@/lib/types";

// ============================================================
// 型定義
// ============================================================

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
  /** TogoVar内部の遺伝子ページへのリンク(`/gene/{hgnc_id}`)。テンプレートでリンクの href に直接使える。 */
  hgnc_url?: string;
  approved_name?: string;
}

/** renderTemplate に渡すパラメータ全体。エラー時は result を持たない。 */
interface TemplateRenderParams
  extends SparqlistTemplateRenderParams<VariantSummaryDisplayData> {
  /** 遺伝子情報。バリアントが遺伝子領域外の場合は undefined。 */
  gene?: GeneDisplayData;
}

// ============================================================
// データ変換（バインディング → 表示データ）
// ============================================================

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
    ...display.referenceToChrAssembly(reference),
  };

  // ref / alt の長さが4文字を超える場合は "ACGT..." に省略する（display.refAlt の仕様）
  Object.assign(displayData, display.refAlt(binding.ref, binding.alt));

  return displayData;
};

/**
 * variant_summary バインディングから遺伝子表示データを組み立てる。
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
    // TogoVar内部の遺伝子ページへのリンク。hgnc は "http://identifiers.org/hgnc/{id}" 形式のURIなので末尾のIDを取り出す。
    hgnc_url: binding.hgnc ? `/gene/${binding.hgnc.split("/").pop()}` : undefined,
    approved_name: binding.approved_name,
  };
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantSummary extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   * variant_summary の結果に gene/hgnc/symbol/approved_name も含まれるため、
   * 1回の fetch のみで済ませている。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as SparqlistStanzaParams;

    const templateParams: TemplateRenderParams = { params };

    try {
      const summaryApiUrl = buildSparqlistApiUrl("variant_summary", params);
      const bindings =
        await fetchSparqlBindings<VariantSummarySparqlBinding>(summaryApiUrl);
      const firstBinding = requireFirstBinding(
        bindings,
        `Variant not found for ${params.tgv_id}`,
      );

      templateParams.result =
        convertSummaryBindingToDisplayData(firstBinding);
      templateParams.gene =
        convertSummaryBindingToGeneDisplayData(firstBinding);
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
