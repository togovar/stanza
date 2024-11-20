import Stanza from "togostanza/stanza";

import { CLINICAL_SIGNIFICANCE } from "@/lib/constants";
import { rowSpanize } from "@/lib/table";

export default class DiseaseMGeND extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const { "data-url": dataURL, terms } = this.params;

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
                "disease": {
                  "relation": "eq",
                  "terms": [
                    terms
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
      ({ error: { message: error.message } })
    }

    // テーブルのセルを結合
    rowSpanize(this.root.querySelector("#target"));

    // データのバインディングを整形
    function extractConditions(data) {
      const results = [];

      data.data.forEach(item => {
        const significance = item.significance;
        significance.forEach(entry => {
          if (entry.conditions && Array.isArray(entry.conditions)) {
            if (entry.source === "mgend") {
              results.push({
                tgvid: item.id,
                rs: item.existing_variations,
                position: `chr${item.chromosome}:${item.position}`,
                title: item.external_link.mgend[0].title,
                xref: item.external_link.mgend[0].xref,
                interpretation_class: entry.interpretations[0],
                interpretation: getPropertyNameByKey(entry.interpretations[0]),
              });
            }
          }
        });
      });

      return sortAndGroupByInterpretationClass(results)
    }

    function getPropertyNameByKey(key) {
      const entry = Object.entries(CLINICAL_SIGNIFICANCE).find(
        ([, value]) => value.key === key
      );
      return entry ? entry[0] : null; // プロパティ名（キー名）を返す
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
            const titleA = a.title;
            const titleB = b.title;
            return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
          })
          .filter((item, index, array) => {
            return array.findIndex(i => i.tgvid === item.tgvid) === index;
          });
      });

      // グループ化を解除して並び替えたデータを平坦化
      return Object.values(grouped).flat();
    }
  }
}
