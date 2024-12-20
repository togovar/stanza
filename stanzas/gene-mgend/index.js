import Stanza from "togostanza/stanza";

import { CLINICAL_SIGNIFICANCE } from "@/lib/constants";
import { rowSpanize } from "@/lib/table";

export default class GeneMGeND extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

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
                interpretation: getPropertyNameByKey(entry.interpretations[0]),
              });

            } else {
              entry.conditions.forEach(condition => {
                let conditionHtml;
                if (condition.medgen && condition.name) {
                  conditionHtml = `<a href='/disease/${condition.medgen}'>${condition.name}</a>`;
                } else if (condition.name) {
                  conditionHtml = condition.name;
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
                  interpretation: getPropertyNameByKey(entry.interpretations[0]),
                });
              });
            }
          }
        });
      });


      return sortAndGroupByInterpretationClass(results);
    }

    function getPropertyNameByKey(key) {
      const entry = Object.entries(CLINICAL_SIGNIFICANCE).find(
        ([, value]) => value.key === key
      );

      if (!entry) {
        return null; // キーが見つからない場合は null を返す
      }

      // プロパティ名の最初の文字を大文字に変換
      const capitalizedPropertyName = entry[0].charAt(0).toUpperCase() + entry[0].slice(1);
      return capitalizedPropertyName;
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
