import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { C as CLINICAL_SIGNIFICANCE } from './constants-f43484af.js';
import { r as rowSpanize } from './table-6800e3de.js';

class GeneMGeND extends Stanza {
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
      console.error(error);
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

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': GeneMGeND
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-mgend",
	"stanza:label": "Gene / MGeND",
	"stanza:definition": "Display MGeND annotations of the gene",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "PENQE",
	"stanza:address": "",
	"stanza:contributor": [
],
	"stanza:created": "2024-11-14",
	"stanza:updated": "2024-11-14",
	"stanza:parameter": [
	{
		"stanza:key": "term",
		"stanza:type": "number",
		"stanza:example": 6298,
		"stanza:description": "TogoVar term",
		"stanza:required": true
	},
	{
		"stanza:key": "data-url",
		"stanza:example": "https://stg-grch38.togovar.org/api/search/variant",
		"stanza:description": "URL"
	}
],
	"stanza:about-link-placement": "bottom-right",
	"stanza:style": [
	{
		"stanza:key": "--togostanza-canvas-height",
		"stanza:type": "number",
		"stanza:default": 280,
		"stanza:description": "Canvas height"
	}
]
};

var templates = [
  ["stanza.html.hbs", {"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class='alert alert-danger'>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":45}}}) : helper)))
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <table id='target' class='table'>\n    <thead>\n      <tr>\n        <th>tgvid</th>\n        <th>rs</th>\n        <th>position</th>\n        <th>Title</th>\n        <th>Clinical significance</th>\n        <th>Condition</th>\n      </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":17,"column":6},"end":{"line":43,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td class='tgvid'>\n            <a href='/variant/"
    + alias4(((helper = (helper = lookupProperty(helpers,"tgvid") || (depth0 != null ? lookupProperty(depth0,"tgvid") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"tgvid","hash":{},"data":data,"loc":{"start":{"line":20,"column":30},"end":{"line":20,"column":39}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"tgvid") || (depth0 != null ? lookupProperty(depth0,"tgvid") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"tgvid","hash":{},"data":data,"loc":{"start":{"line":20,"column":41},"end":{"line":20,"column":50}}}) : helper)))
    + "</a>\n          </td>\n          <td class='rs'>\n            <a href='https://www.ncbi.nlm.nih.gov/snp/"
    + alias4(((helper = (helper = lookupProperty(helpers,"rs") || (depth0 != null ? lookupProperty(depth0,"rs") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rs","hash":{},"data":data,"loc":{"start":{"line":23,"column":54},"end":{"line":23,"column":60}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"rs") || (depth0 != null ? lookupProperty(depth0,"rs") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rs","hash":{},"data":data,"loc":{"start":{"line":23,"column":62},"end":{"line":23,"column":68}}}) : helper)))
    + "</a>\n          </td>\n          <td class='position'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"position") || (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"position","hash":{},"data":data,"loc":{"start":{"line":25,"column":31},"end":{"line":25,"column":43}}}) : helper)))
    + "</td>\n          <td class='title'>\n            <a href='"
    + alias4(((helper = (helper = lookupProperty(helpers,"xref") || (depth0 != null ? lookupProperty(depth0,"xref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"xref","hash":{},"data":data,"loc":{"start":{"line":27,"column":21},"end":{"line":27,"column":29}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":27,"column":31},"end":{"line":27,"column":40}}}) : helper)))
    + "</a>\n          </td>\n          <td class='clinical-significance-col'>\n            <span\n              class='clinical-significance-full'\n              data-sign='"
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretation_class") || (depth0 != null ? lookupProperty(depth0,"interpretation_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretation_class","hash":{},"data":data,"loc":{"start":{"line":32,"column":25},"end":{"line":32,"column":49}}}) : helper)))
    + "'\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretation") || (depth0 != null ? lookupProperty(depth0,"interpretation") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretation","hash":{},"data":data,"loc":{"start":{"line":33,"column":13},"end":{"line":33,"column":31}}}) : helper)))
    + "</span>\n          </td>\n          <td class='condition'>\n            "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"conditionHtml") || (depth0 != null ? lookupProperty(depth0,"conditionHtml") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"conditionHtml","hash":{},"data":data,"loc":{"start":{"line":36,"column":12},"end":{"line":36,"column":31}}}) : helper))) != null ? stack1 : "")
    + "\n          </td>\n        </tr>\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td class='text-center' colspan='6'>No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":46,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-mgend.js.map
