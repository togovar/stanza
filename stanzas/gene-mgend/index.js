import Stanza from "togostanza/stanza";

import { CLINICAL_SIGNIFICANCE } from "@/lib/constants";
import { rowSpanize } from "@/lib/table";

export default class GeneMGeND extends Stanza {
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
                "gene": {
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
      const result = [];

      data.data.forEach(item => {
        const significance = item.significance;

        significance.forEach(entry => {
          if (entry.conditions && Array.isArray(entry.conditions)) {
            entry.conditions.forEach(condition => {

              let conditionHtml;
              if (condition.medgen && condition.name) {
                conditionHtml = `<a href='/disease/${condition.medgen}'>${condition.name}</a>`;
              } else if (condition.name) {
                conditionHtml = condition.name;
              } else {
                conditionHtml = "others";
              }

              if (entry.source === "mgend") {
                result.push({
                  tgvid: item.id,
                  rs: item.existing_variations,
                  position: `chr${item.chromosome}:${item.position}`,
                  title: item.external_link.mgend[0].title,
                  xref: item.external_link.mgend[0].xref,
                  conditionHtml: conditionHtml,
                  medgen: condition.medgen,
                  interpretation_class: entry.interpretations[0],
                  interpretation: getPropertyNameByKey(entry.interpretations[0]),
                });
              }
            });
          }
        });
      });


      return result;
    }

    function getPropertyNameByKey(key) {
      const entry = Object.entries(CLINICAL_SIGNIFICANCE).find(
        ([, value]) => value.key === key
      );
      return entry ? entry[0] : null; // プロパティ名（キー名）を返す
    }
  }
}
