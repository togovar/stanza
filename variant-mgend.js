import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { R as ROBOTO_CONDENSED_CSS_URL, C as CLINICAL_SIGNIFICANCE } from './constants-c005a6eb.js';
import { e as escapeHtml } from './html-18194d0e.js';
import { r as rowSpanize } from './table-1f1dea97.js';
import { d as describeVariantIdentifier } from './sparqlist-0870b0c9.js';
import { a as fetchVariantDataById, b as fetchVariantDataByLocation, r as requireVariantData } from './togovar-variant-0e8288d9.js';
import { p as parseVariantParam, a as assertValidVariantIdentifier } from './variant-0dd96a22.js';
import './utils-97dc77a0.js';

// ============================================================
// ヘルパー関数
// ============================================================
/**
 * 疾患条件のMedGenコードと名前からHTML文字列を生成する。
 * - MedGenコードと名前が両方ある → 疾患ページへのリンク
 * - 名前のみ → プレーンテキスト
 * - どちらもない → "others"
 */
function buildConditionHtml(condition) {
    const safeName = condition.name ? escapeHtml(condition.name) : undefined;
    if (condition.medgen && safeName) {
        // href 属性値としてエスケープ（引用符混入による属性破壊/XSSを防ぐ）
        const safeMedgen = encodeURIComponent(condition.medgen);
        return `<a href="/disease/${safeMedgen}">${safeName}</a>`;
    }
    if (safeName) {
        return safeName;
    }
    return "others";
}
/**
 * APIレスポンスからMGeNDソースの条件行を抽出し、整形して返す。
 * 疾患条件がない場合は "others" 行として扱う。
 */
function buildConditionRows(apiResponse) {
    const conditionRows = [];
    apiResponse.data.forEach((variantData) => {
        const mgendLink = variantData.external_links?.mgend?.[0];
        if (!mgendLink)
            return;
        variantData.significance.forEach((significanceEntry) => {
            if (significanceEntry.source !== "mgend")
                return;
            const interpretationClass = significanceEntry.interpretations[0];
            const interpretationLabel = CLINICAL_SIGNIFICANCE[interpretationClass]?.label ?? null;
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
function groupAndSortByInterpretation(conditionRows) {
    // 解釈分類コードをキーにグループ化
    const groupedByClass = conditionRows.reduce((accumulator, row) => {
        const groupKey = row.interpretationClass;
        if (!accumulator[groupKey]) {
            accumulator[groupKey] = [];
        }
        accumulator[groupKey].push(row);
        return accumulator;
    }, {});
    // 各グループ内を疾患名で昇順ソートし、MedGenコードが重複する行を除去
    Object.keys(groupedByClass).forEach((groupKey) => {
        groupedByClass[groupKey] = groupedByClass[groupKey]
            .sort((rowA, rowB) => rowA.name.localeCompare(rowB.name, undefined, { sensitivity: "base" }))
            .filter((row, index, allRows) => {
            // MedGenコードがない行（"others"等）は重複除去しない
            if (!row.medgen)
                return true;
            // 同じMedGenコードが初出の行のみ残す
            return allRows.findIndex((r) => r.medgen === row.medgen) === index;
        });
    });
    return Object.values(groupedByClass).flat();
}
// ============================================================
// Stanza本体
// ============================================================
class VariantMGeND extends Stanza {
    async render() {
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = this.params;
        const { "data-url": dataUrl, tgv_id } = params;
        const parsedVariant = parseVariantParam(params.variant);
        try {
            if (!dataUrl) {
                throw new Error("data-url parameter is required");
            }
            assertValidVariantIdentifier(tgv_id, params.variant, parsedVariant);
            const apiResponse = tgv_id
                ? await fetchVariantDataById(dataUrl, tgv_id)
                : await fetchVariantDataByLocation(dataUrl, parsedVariant);
            const variantData = requireVariantData(apiResponse, tgv_id, parsedVariant, describeVariantIdentifier(params));
            this.renderTemplate({
                template: "stanza.html.hbs",
                parameters: {
                    params: this.params,
                    result: buildConditionRows({ data: [variantData] }),
                },
            });
        }
        catch (error) {
            console.error(error);
            this.renderTemplate({
                template: "stanza.html.hbs",
                parameters: {
                    params: this.params,
                    error: {
                        message: error instanceof Error ? error.message : String(error),
                    },
                },
            });
        }
        // テーブルの連続する同一セルを結合（rowspan処理）
        rowSpanize(this.root.querySelector("#target"));
    }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantMGeND
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-mgend",
	"stanza:label": "Variant / MGeND",
	"stanza:definition": "Display MGeND annotations of the variant",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "PENQE",
	"stanza:address": "",
	"stanza:contributor": [
],
	"stanza:created": "2024-11-14",
	"stanza:updated": "2026-08-12",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv6784522",
		"stanza:description": "TogoVar ID (required if variant is not given)",
		"stanza:required": false
	},
	{
		"stanza:key": "variant",
		"stanza:example": "1-12345-A-T",
		"stanza:description": "Variant in VCF notation CHROM-POS-REF-ALT (required if tgv_id is not given)",
		"stanza:required": false
	},
	{
		"stanza:key": "data-url",
		"stanza:example": "https://stg-grch38.togovar.org/api/search/variant",
		"stanza:description": "TogoVar API base URL or variant search API URL",
		"stanza:required": true
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
  ["stanza.html.hbs", {"0":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class=\"alert alert-danger\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":45}}}) : helper)))
    + "</div>\n";
},"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <table id=\"target\" class=\"table\">\n    <thead>\n      <tr>\n        <th>Title</th>\n        <th>Clinical significance</th>\n        <th>Condition</th>\n      </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":14,"column":6},"end":{"line":37,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td class=\"title\">\n            <a\n              href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"xref") || (depth0 != null ? lookupProperty(depth0,"xref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"xref","hash":{},"data":data,"loc":{"start":{"line":18,"column":20},"end":{"line":18,"column":28}}}) : helper)))
    + "\"\n              target=\"_blank\"\n              rel=\"noopener noreferrer\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":21,"column":13},"end":{"line":21,"column":22}}}) : helper)))
    + "</a>\n          </td>\n          <td class=\"clinical-significance-col\">\n            <span\n              class=\"clinical-significance-full\"\n              data-sign=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretationClass") || (depth0 != null ? lookupProperty(depth0,"interpretationClass") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretationClass","hash":{},"data":data,"loc":{"start":{"line":26,"column":25},"end":{"line":26,"column":48}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretationLabel") || (depth0 != null ? lookupProperty(depth0,"interpretationLabel") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretationLabel","hash":{},"data":data,"loc":{"start":{"line":27,"column":13},"end":{"line":27,"column":36}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"condition\">\n            "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"conditionHtml") || (depth0 != null ? lookupProperty(depth0,"conditionHtml") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"conditionHtml","hash":{},"data":data,"loc":{"start":{"line":30,"column":12},"end":{"line":30,"column":31}}}) : helper))) != null ? stack1 : "")
    + "\n          </td>\n        </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td class=\"text-center\" colspan=\"3\">No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":40,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-mgend.js.map
