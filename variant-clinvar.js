import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { R as ROBOTO_CONDENSED_CSS_URL, a as REVIEW_STATUS, C as CLINICAL_SIGNIFICANCE } from './constants-c005a6eb.js';
import { b as buildSparqlistApiUrl, f as fetchSparqlBindings } from './sparqlist-0870b0c9.js';
import { r as rowSpanize } from './table-1f1dea97.js';
import './utils-97dc77a0.js';

// ============================================================
// ヘルパー関数
// ============================================================
/**
 * 大文字小文字と、区切り文字（アンダースコア/スペース）の揺れを吸収して比較できる形に正規化する。
 * ClinVarの解釈テキストには "association_not found" のようにアンダースコアと
 * スペースが混在する値があり、単純な toLowerCase() 比較だと label 側の
 * "Association not found" と一致しないため、区切り文字も揃える。
 */
function normalizeInterpretationText(text) {
    return text
        .toLowerCase()
        .replace(/[_\s]+/g, " ")
        .trim();
}
/**
 * ClinVarの解釈ラベル（例: "Pathogenic"）からCLINICAL_SIGNIFICANCEの
 * 短いコード（例: "P"）を逆引きする。
 */
function findSignificanceClass(interpretation) {
    if (!interpretation)
        return undefined;
    const normalizedInterpretation = normalizeInterpretationText(interpretation);
    const matchedEntry = Object.entries(CLINICAL_SIGNIFICANCE).find(([, value]) => normalizeInterpretationText(value.label) === normalizedInterpretation);
    return matchedEntry?.[0];
}
/**
 * 生バインディングをテンプレート用の表示行に変換する。
 * 元のコードはバインディングを直接書き換えていたが、
 * 元データを保ちつつ新しいオブジェクトを返す形に改めた。
 */
function buildClinVarRow(rawBinding) {
    return {
        title: rawBinding.title,
        clinvar: rawBinding.clinvar,
        vcv_review_status: rawBinding.vcv_review_status,
        vcv_stars: REVIEW_STATUS[rawBinding.vcv_review_status ?? ""]?.stars ?? 0,
        rcv_review_status: rawBinding.rcv_review_status,
        rcv_stars: REVIEW_STATUS[rawBinding.rcv_review_status ?? ""]?.stars ?? 0,
        interpretation: rawBinding.interpretation,
        significance_class: findSignificanceClass(rawBinding.interpretation),
        last_evaluated: rawBinding.last_evaluated,
        condition: {
            label: rawBinding.condition,
            // TogoVar内部の疾患ページへのリンク。medgen が無い疾患名ではリンクを生成しない。
            url: rawBinding.medgen
                ? `/disease/${encodeURIComponent(rawBinding.medgen)}`
                : undefined,
        },
    };
}
// ============================================================
// Stanza本体
// ============================================================
class VariantClinVar extends Stanza {
    async render() {
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = this.params;
        const templateParams = { params };
        try {
            const apiUrl = buildSparqlistApiUrl("variant_clinvar", params);
            const rawBindings = await fetchSparqlBindings(apiUrl);
            templateParams.result = rawBindings.map(buildClinVarRow);
        }
        catch (e) {
            console.error(e);
            templateParams.error = {
                message: e instanceof Error ? e.message : String(e),
            };
        }
        this.renderTemplate({
            template: "stanza.html.hbs",
            parameters: templateParams,
        });
        // テーブルの連続する同一セルを結合（rowspan処理）
        rowSpanize(this.root.querySelector("#target"));
    }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantClinVar
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-clinvar",
	"stanza:label": "Variant / ClinVar",
	"stanza:definition": "Display ClinVar annotations of the variant",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-04-22",
	"stanza:updated": "2026-07-27",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv219804",
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
		"stanza:key": "sparqlist",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL (required)",
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

  return "  <table id=\"target\" class=\"table\">\n    <thead>\n      <tr>\n        <th>Title</th>\n        <th>VCV review status</th>\n        <th>RCV review status</th>\n        <th>Clinical significance</th>\n        <th>Last evaluated</th>\n        <th>Condition(s)</th>\n      </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":17,"column":6},"end":{"line":61,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td class=\"title\">\n            <a\n              href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"clinvar") || (depth0 != null ? lookupProperty(depth0,"clinvar") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clinvar","hash":{},"data":data,"loc":{"start":{"line":21,"column":20},"end":{"line":21,"column":31}}}) : helper)))
    + "\"\n              target=\"_blank\"\n              rel=\"noopener noreferrer\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":24,"column":13},"end":{"line":24,"column":22}}}) : helper)))
    + "</a>\n          </td>\n          <td class=\"review-status\">\n            <span class=\"star-rating\">\n              <span data-stars=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"vcv_stars") || (depth0 != null ? lookupProperty(depth0,"vcv_stars") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"vcv_stars","hash":{},"data":data,"loc":{"start":{"line":28,"column":32},"end":{"line":28,"column":45}}}) : helper)))
    + "\" class=\"star-rating-item\"></span>\n            </span>\n            <br />\n            <span class=\"status-description\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"vcv_review_status") || (depth0 != null ? lookupProperty(depth0,"vcv_review_status") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"vcv_review_status","hash":{},"data":data,"loc":{"start":{"line":31,"column":45},"end":{"line":31,"column":66}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"review-status rowspan-ignore\">\n            <span class=\"star-rating\">\n              <span data-stars=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"rcv_stars") || (depth0 != null ? lookupProperty(depth0,"rcv_stars") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rcv_stars","hash":{},"data":data,"loc":{"start":{"line":35,"column":32},"end":{"line":35,"column":45}}}) : helper)))
    + "\" class=\"star-rating-item\"></span>\n            </span>\n            <br />\n            <span class=\"status-description\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"rcv_review_status") || (depth0 != null ? lookupProperty(depth0,"rcv_review_status") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rcv_review_status","hash":{},"data":data,"loc":{"start":{"line":38,"column":45},"end":{"line":38,"column":66}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"clinical-significance-col rowspan-ignore\">\n            <span\n              class=\"clinical-significance-full\"\n              data-sign=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"significance_class") || (depth0 != null ? lookupProperty(depth0,"significance_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"significance_class","hash":{},"data":data,"loc":{"start":{"line":43,"column":25},"end":{"line":43,"column":47}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretation") || (depth0 != null ? lookupProperty(depth0,"interpretation") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretation","hash":{},"data":data,"loc":{"start":{"line":44,"column":13},"end":{"line":44,"column":31}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"last-evaluated rowspan-ignore\">\n            "
    + alias4(((helper = (helper = lookupProperty(helpers,"last_evaluated") || (depth0 != null ? lookupProperty(depth0,"last_evaluated") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"last_evaluated","hash":{},"data":data,"loc":{"start":{"line":47,"column":12},"end":{"line":47,"column":30}}}) : helper)))
    + "\n          </td>\n          <td class=\"condition rowspan-ignore\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"url") : stack1),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":50,"column":12},"end":{"line":54,"column":19}}})) != null ? stack1 : "")
    + "          </td>\n        </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "</a>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              "
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td class=\"text-center\" colspan=\"6\">No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":64,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-clinvar.js.map
