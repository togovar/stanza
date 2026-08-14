import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { r as referenceToChrAssembly, a as refAlt } from './display-a7e019c1.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-4313dcda.js';
import { b as buildSparqlistApiUrl, f as fetchSparqlBindings } from './sparqlist-47ca0758.js';
import './frequency-9d3406e7.js';
import './utils-97dc77a0.js';

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
const convertSummaryBindingToDisplayData = (binding) => {
    const { reference, ...sharedFields } = binding;
    const displayData = {
        ...sharedFields,
        ...referenceToChrAssembly(reference),
    };
    // ref / alt の長さが4文字を超える場合は "ACGT..." に省略する（display.refAlt の仕様）
    Object.assign(displayData, refAlt(binding.ref, binding.alt));
    return displayData;
};
/**
 * variant_summary バインディングから遺伝子表示データを組み立てる。
 * バリアントが遺伝子領域外の場合は symbol 等が undefined になるため、
 * その場合は表示データなし（undefined）として扱う。
 */
const convertSummaryBindingToGeneDisplayData = (binding) => {
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
class VariantSummary extends Stanza {
    /**
     * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
     * variant_summary の結果に gene/hgnc/symbol/approved_name も含まれるため、
     * 1回の fetch のみで済ませている。
     */
    async render() {
        // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = this.params;
        const templateParams = { params };
        try {
            const summaryApiUrl = buildSparqlistApiUrl("variant_summary", params);
            const bindings = await fetchSparqlBindings(summaryApiUrl);
            const firstBinding = bindings[0];
            if (!firstBinding) {
                this.renderTemplate({
                    template: "stanza.html.hbs",
                    parameters: templateParams,
                });
                return;
            }
            templateParams.result =
                convertSummaryBindingToDisplayData(firstBinding);
            templateParams.gene =
                convertSummaryBindingToGeneDisplayData(firstBinding);
        }
        catch (reason) {
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

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantSummary
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-summary",
	"stanza:label": "Variant / Summary",
	"stanza:definition": "Display summary information",
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
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div>\n    <dl class=\"variant-summary-list\">\n      <dt>Position</dt>\n      <dd>\n"
    + ((stack1 = lookupProperty(helpers,"with").call(alias1,(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":11,"column":17}}})) != null ? stack1 : "")
    + "      </dd>\n\n      <dt>Ref / Alt</dt>\n      <dd>\n"
    + ((stack1 = lookupProperty(helpers,"with").call(alias1,(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":16,"column":8},"end":{"line":21,"column":17}}})) != null ? stack1 : "")
    + "      </dd>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"gene") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":24,"column":6},"end":{"line":36,"column":13}}})) != null ? stack1 : "")
    + "    </dl>\n  </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <span class=\"chromosome\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"chr") || (depth0 != null ? lookupProperty(depth0,"chr") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chr","hash":{},"data":data,"loc":{"start":{"line":9,"column":35},"end":{"line":9,"column":42}}}) : helper)))
    + "</span>:<span class=\"position\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"position") || (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"position","hash":{},"data":data,"loc":{"start":{"line":9,"column":73},"end":{"line":9,"column":85}}}) : helper)))
    + "</span>\n          <span class=\"assembly\">("
    + alias4(((helper = (helper = lookupProperty(helpers,"assembly") || (depth0 != null ? lookupProperty(depth0,"assembly") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"assembly","hash":{},"data":data,"loc":{"start":{"line":10,"column":34},"end":{"line":10,"column":46}}}) : helper)))
    + ")</span>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <div class=\"ref-alt\">\n            <span class=\"ref\" data-sum=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"ref_length") || (depth0 != null ? lookupProperty(depth0,"ref_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref_length","hash":{},"data":data,"loc":{"start":{"line":18,"column":40},"end":{"line":18,"column":54}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"ref") || (depth0 != null ? lookupProperty(depth0,"ref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref","hash":{},"data":data,"loc":{"start":{"line":18,"column":56},"end":{"line":18,"column":63}}}) : helper)))
    + "</span><span class=\"arrow\"></span><span\n              class=\"alt\" data-sum=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"alt_length") || (depth0 != null ? lookupProperty(depth0,"alt_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt_length","hash":{},"data":data,"loc":{"start":{"line":19,"column":36},"end":{"line":19,"column":50}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"alt") || (depth0 != null ? lookupProperty(depth0,"alt") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt","hash":{},"data":data,"loc":{"start":{"line":19,"column":52},"end":{"line":19,"column":59}}}) : helper)))
    + "</span>\n          </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <dt>HGNC/Approved symbol</dt>\n        <dd>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? lookupProperty(depth0,"gene") : depth0)) != null ? lookupProperty(stack1,"hgnc_url") : stack1),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":27,"column":10},"end":{"line":31,"column":17}}})) != null ? stack1 : "")
    + "        </dd>\n\n        <dt>HGNC/Approved name</dt>\n        <dd>"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"gene") : depth0)) != null ? lookupProperty(stack1,"approved_name") : stack1), depth0))
    + "</dd>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <a href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"gene") : depth0)) != null ? lookupProperty(stack1,"hgnc_url") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"gene") : depth0)) != null ? lookupProperty(stack1,"symbol") : stack1), depth0))
    + "</a>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"gene") : depth0)) != null ? lookupProperty(stack1,"symbol") : stack1), depth0))
    + "\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":39,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-summary.js.map
