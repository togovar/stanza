import Stanza from "togostanza/stanza";
import { unwrapValueFromBinding } from "togostanza/utils";

import { CLINICAL_SIGNIFICANCE, REVIEW_STATUS, ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import { rowSpanize } from "@/lib/table";

// ============================================================
// 型定義
// ============================================================

/** SPARQListが返すSPARQL JSONフォーマット全体 */
interface SparqlJsonResponse {
  results?: {
    bindings?: Array<Record<string, { value?: string }>>;
  };
}

/**
 * unwrapValueFromBinding後の生バインディング。
 * 各フィールドはSPARQLバインディングの value を取り出した文字列。
 */
interface ClinVarRawBinding {
  title?: string;
  /** ClinVar変異ページURL */
  clinvar?: string;
  vcv_review_status?: string;
  rcv_review_status?: string;
  /** 臨床解釈ラベル（例: "Pathogenic"） */
  interpretation?: string;
  last_evaluated?: string;
  /** 疾患名（condition オブジェクト生成前の文字列） */
  condition?: string;
  /** MedGenコード（疾患ページURLの生成に使用） */
  medgen?: string;
}

/** テンプレートへ渡す1行分の表示データ */
interface ClinVarRow {
  title: string | undefined;
  clinvar: string | undefined;
  vcv_review_status: string | undefined;
  /** VCVレビューステータスに対応する星の数（0〜4） */
  vcv_stars: number;
  rcv_review_status: string | undefined;
  /** RCVレビューステータスに対応する星の数（0〜4） */
  rcv_stars: number;
  interpretation: string | undefined;
  /** 臨床有意性の分類コード（`data-sign` 属性に使用） */
  significance_class: string | undefined;
  last_evaluated: string | undefined;
  condition: {
    label: string | undefined;
    url: string;
  };
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 生バインディングをテンプレート用の表示行に変換する。
 * 元のコードはバインディングを直接書き換えていたが、
 * 元データを保ちつつ新しいオブジェクトを返す形に改めた。
 */
function buildClinVarRow(rawBinding: ClinVarRawBinding): ClinVarRow {
  return {
    title: rawBinding.title,
    clinvar: rawBinding.clinvar,
    vcv_review_status: rawBinding.vcv_review_status,
    vcv_stars: REVIEW_STATUS[rawBinding.vcv_review_status ?? ""]?.stars ?? 0,
    rcv_review_status: rawBinding.rcv_review_status,
    rcv_stars: REVIEW_STATUS[rawBinding.rcv_review_status ?? ""]?.stars ?? 0,
    interpretation: rawBinding.interpretation,
    // 解釈ラベルを小文字に揃えてCLINICAL_SIGNIFICANCEのキーと照合する
    significance_class: CLINICAL_SIGNIFICANCE[rawBinding.interpretation?.toLowerCase() ?? ""]?.key,
    last_evaluated: rawBinding.last_evaluated,
    condition: {
      label: rawBinding.condition,
      url: `https://identifiers.org/medgen:${rawBinding.medgen}`,
    },
  };
}

// ============================================================
// Stanza本体
// ============================================================

export default class VariantClinVar extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    let templateParams: { result: ClinVarRow[] } | { error: { message: string } };

    try {
      if (!this.params?.sparqlist) {
        throw new Error("sparqlist parameter is required");
      }

      const sparqlistUrl = this.params.sparqlist.concat(
        `/api/variant_clinvar?tgv_id=${this.params.tgv_id}`
      );

      const response = await fetch(sparqlistUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`${sparqlistUrl} returned status ${response.status}`);
      }

      const json: SparqlJsonResponse = await response.json();
      const rawBindings = unwrapValueFromBinding(json) as ClinVarRawBinding[];

      templateParams = { result: rawBindings.map(buildClinVarRow) };
    } catch (e) {
      console.error(e);
      templateParams = { error: { message: (e as Error).message } };
    }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...templateParams,
      },
    });

    // テーブルの連続する同一セルを結合（rowspan処理）
    rowSpanize(this.root.querySelector("#target"));
  }
}
