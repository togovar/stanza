import Stanza from "togostanza/stanza";

import { CLINICAL_SIGNIFICANCE } from "@/lib/constants";
import { rowSpanize } from "@/lib/table";
import type {
  TogoVarApiResponse,
  DiseaseCondition,
} from "@/lib/types";

// ============================================================
// このスタンザ固有の型定義
// ============================================================

/** テンプレートへ渡す1行分の表示データ */
interface ConditionRow {
  /** MGeNDエントリのタイトル */
  title: string;
  /** MGeNDエントリの外部参照URL */
  xref: string;
  /** 疾患名のHTML（リンク付きまたはプレーンテキスト） */
  conditionHtml: string;
  /** 疾患名（ソート・重複除去に使用） */
  name: string;
  /** MedGenコード（重複除去のキーとして使用） */
  medgen?: string;
  /** 解釈分類コード（グループ化に使用） */
  interpretationClass: string;
  /** 解釈ラベル（CLINICAL_SIGNIFICANCEのプロパティ名） */
  interpretationLabel: string | null;
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * CLINICAL_SIGNIFICANCEのキー値からプロパティ名（ラベル）を返す。
 * 例: "P" → "pathogenic"
 */
function findInterpretationLabel(interpretationKey: string): string | null {
  const matchedEntry = Object.entries(CLINICAL_SIGNIFICANCE).find(
    ([, value]) => value.key === interpretationKey
  );
  return matchedEntry ? matchedEntry[0] : null;
}

/**
 * 疾患条件のMedGenコードと名前からHTML文字列を生成する。
 * - MedGenコードと名前が両方ある → 疾患ページへのリンク
 * - 名前のみ → プレーンテキスト
 * - どちらもない → "others"
 */
function buildConditionHtml(condition: DiseaseCondition): string {
  if (condition.medgen && condition.name) {
    return `<a href='/disease/${condition.medgen}'>${condition.name}</a>`;
  }
  if (condition.name) {
    return condition.name;
  }
  return "others";
}

/**
 * APIレスポンスからMGeNDソースの条件行を抽出し、整形して返す。
 * 疾患条件がない場合は "others" 行として扱う。
 */
function buildConditionRows(apiResponse: TogoVarApiResponse): ConditionRow[] {
  const conditionRows: ConditionRow[] = [];

  apiResponse.data.forEach((variantData) => {
    const mgendLink = variantData.external_links.mgend?.[0];
    if (!mgendLink) return;

    variantData.significance.forEach((significanceEntry) => {
      if (significanceEntry.source !== "mgend") return;

      const interpretationClass = significanceEntry.interpretations[0];
      const interpretationLabel = findInterpretationLabel(interpretationClass);

      // 疾患条件が紐づいていない場合は "others" として1行追加
      if (significanceEntry.conditions.length === 0) {
        conditionRows.push({
          title: mgendLink.title,
          xref: mgendLink.xref,
          conditionHtml: "others",
          name: "others",
          medgen: undefined,
          interpretationClass,
          interpretationLabel,
        });
        return;
      }

      // 疾患条件ごとに1行追加
      significanceEntry.conditions.forEach((diseaseCondition) => {
        conditionRows.push({
          title: mgendLink.title,
          xref: mgendLink.xref,
          conditionHtml: buildConditionHtml(diseaseCondition),
          name: diseaseCondition.name ?? "others",
          medgen: diseaseCondition.medgen,
          interpretationClass,
          interpretationLabel,
        });
      });
    });
  });

  return groupAndSortByInterpretation(conditionRows);
}

/**
 * 条件行を解釈分類コードでグループ化し、各グループ内で疾患名をアルファベット順にソートする。
 * 同一MedGenコードを持つ重複行は除去する。
 * 最終的にグループを解除して平坦化した配列を返す。
 */
function groupAndSortByInterpretation(conditionRows: ConditionRow[]): ConditionRow[] {
  // 解釈分類コードをキーにグループ化
  const groupedByClass = conditionRows.reduce<Record<string, ConditionRow[]>>(
    (accumulator, row) => {
      const groupKey = row.interpretationClass;
      if (!accumulator[groupKey]) {
        accumulator[groupKey] = [];
      }
      accumulator[groupKey].push(row);
      return accumulator;
    },
    {}
  );

  // 各グループ内を疾患名で昇順ソートし、MedGenコードが重複する行を除去
  Object.keys(groupedByClass).forEach((groupKey) => {
    groupedByClass[groupKey] = groupedByClass[groupKey]
      .sort((rowA, rowB) =>
        rowA.name.localeCompare(rowB.name, undefined, { sensitivity: "base" })
      )
      .filter((row, index, allRows) => {
        // MedGenコードがない行（"others"等）は重複除去しない
        if (!row.medgen) return true;
        // 同じMedGenコードが初出の行のみ残す
        return allRows.findIndex((r) => r.medgen === row.medgen) === index;
      });
  });

  return Object.values(groupedByClass).flat();
}

// ============================================================
// Stanza本体
// ============================================================

export default class VariantMGeND extends Stanza {
  async render() {
    this.importWebFontCSS(
      "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900"
    );

    const { "data-url": dataUrl, tgv_id } = this.params;

    try {
      const response = await fetch(dataUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { id: [tgv_id] } }),
      });

      if (!response.ok) {
        throw new Error(`${dataUrl} returned status ${response.status}`);
      }

      const apiResponse: TogoVarApiResponse = await response.json();

      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: buildConditionRows(apiResponse),
        },
      });
    } catch (error) {
      console.error(error);
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
        },
      });
    }

    // テーブルの連続する同一セルを結合（rowspan処理）
    rowSpanize(this.root.querySelector("#target"));
  }
}
