import Stanza from "togostanza/stanza";

import { CLINICAL_SIGNIFICANCE, ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import { escapeHtml } from "@/lib/html";
import { rowSpanize } from "@/lib/table";

export default class GeneMGeND extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const { "data-url": dataURL, term } = this.params;

    try {
      const response = await fetch(dataURL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: {
            "and": [
              {
                "gene": {
                  "relation": "eq",
                  "terms": [
                    term
                  ]
                }
              },
              {
                "significance": {
                  "relation": "ne",
                  "terms": [
                    "NC"
                  ],
                  "source": [
                    "mgend"
                  ]
                }
              }
            ]
          }
        })
      });

      // レスポンスのステータスをチェックし、問題があればエラーをスロー
      if (!response.ok) {
        throw new Error(`${dataURL} returned status ${response.status}`);
      }

      const jsonData = await response.json();

      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: extractConditions(jsonData)
        }
      });
    } catch (error) {
      console.error(error)
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params
        }
      });
    }

    // テーブルのセルを結合
    rowSpanize(this.root.querySelector("#target"));

    // データのバインディングを整形
    function extractConditions(data) {
      const results = [];

      data.data.forEach(item => {
        const significance = item.significance;

        significance.forEach(entry => {
          if (entry.source === "mgend") {
            if (entry.conditions.length === 0) {
              results.push({
                tgvid: item.id,
                rs: item.existing_variations,
                position: `${item.chromosome}:${item.position}`,
                title: item.external_link.mgend[0].title,
                xref: item.external_link.mgend[0].xref,
                conditionHtml: "others",
                name: "others",
                medgen: "others",
                interpretation_class: entry.interpretations[0],
                interpretation: getInterpretationLabel(entry.interpretations[0]),
              });

            } else {
              entry.conditions.forEach(condition => {
                const safeName = condition.name ? escapeHtml(condition.name) : undefined;
                let conditionHtml;
                if (condition.medgen && safeName) {
                  // href 属性値としてエスケープ（引用符混入による属性破壊/XSSを防ぐ）
                  const safeMedgen = encodeURIComponent(condition.medgen);
                  conditionHtml = `<a href='/disease/${safeMedgen}'>${safeName}</a>`;
                } else if (safeName) {
                  conditionHtml = safeName;
                } else {
                  conditionHtml = "others";
                }
                results.push({
                  tgvid: item.id,
                  rs: item.existing_variations,
                  position: `${item.chromosome}:${item.position}`,
                  title: item.external_link.mgend[0].title,
                  xref: item.external_link.mgend[0].xref,
                  conditionHtml: conditionHtml,
                  name: condition.name || "others",
                  medgen: condition.medgen,
                  interpretation_class: entry.interpretations[0],
                  interpretation: getInterpretationLabel(entry.interpretations[0]),
                });
              });
            }
          }
        });
      });


      return sortAndGroupByInterpretationClass(results);
    }

    function getInterpretationLabel(key) {
      return CLINICAL_SIGNIFICANCE[key]?.label ?? null;
    }

    function sortAndGroupByInterpretationClass(results) {
      // グループ化
      const grouped = results.reduce((acc, item) => {
        const key = item.interpretation_class;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      // 各グループを大文字・小文字で並び替え
      Object.keys(grouped).forEach(key => {
        grouped[key] = grouped[key]
          .sort((a, b) => {
            const nameA = a.name;
            const nameB = b.name;
            return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
          }).filter((item, index, array) => {
            return !item.medgen || array.findIndex(i => i.medgen === item.medgen) === index;
          });
      });

      // グループ化を解除して並び替えたデータを平坦化
      return Object.values(grouped).flat();
    }
  }
}
