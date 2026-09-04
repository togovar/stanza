import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-c005a6eb.js';
import { d as describeVariantIdentifier, a as buildIdentifierQueryString, f as fetchSparqlBindings } from './sparqlist-0870b0c9.js';
import { f as fetchVariantDataByIdentifier } from './togovar-variant-0e8288d9.js';
import { p as parseVariantParam, a as assertValidVariantIdentifier } from './variant-0dd96a22.js';
import './utils-97dc77a0.js';

const buildEmptyResult = () => ({
    xrefs: [],
});
const buildResultFromTgv2rsBindings = (results) => {
    const rsUrls = Array.from(new Set(results.map((result) => result.rs).filter(Boolean)));
    if (rsUrls.length === 0) {
        return buildEmptyResult();
    }
    return {
        xrefs: [
            {
                name: "RefSNP ID",
                refs: rsUrls.map((rsUrl) => ({
                    label: rsUrl.split("/").slice(-1)[0],
                    url: rsUrl,
                })),
            },
        ],
    };
};
class VariantHeader extends Stanza {
    async render() {
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = (this.params ?? {});
        const parsedVariant = parseVariantParam(params.variant);
        const templateParams = { params };
        try {
            assertValidVariantIdentifier(params.tgv_id, params.variant, parsedVariant);
            let tgvId = params.tgv_id;
            if (!tgvId) {
                if (!params["data-url"]) {
                    throw new Error("data-url parameter is required when variant is given without tgv_id");
                }
                const variantData = await fetchVariantDataByIdentifier(params["data-url"], tgvId, parsedVariant, describeVariantIdentifier(params));
                // TogoVar未登録variantは検索API上で見つかっても id が空のことがある。
                // tgv2rs は空クエリだと endpoint 側のデフォルトIDへフォールバックし得るため、
                // 解決済み tgv_id が無い場合は RefSNP なしとして終了する。
                if (!variantData.id) {
                    templateParams.result = buildEmptyResult();
                    this.renderTemplate({
                        template: "stanza.html.hbs",
                        parameters: templateParams,
                    });
                    return;
                }
                tgvId = variantData.id;
            }
            // tgv2rs は variant を解釈しないため、必ず解決済みの tgv_id だけを渡す。
            const queryString = buildIdentifierQueryString({ tgv_id: tgvId });
            const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);
            const bindings = await fetchSparqlBindings(sparqlist);
            templateParams.result = buildResultFromTgv2rsBindings(bindings);
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
  'default': VariantHeader
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-header",
	"stanza:label": "Variant / Header",
	"stanza:definition": "Display header information",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-06-07",
	"stanza:updated": "2026-08-12",
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
		"stanza:description": "SPARQList URL",
		"stanza:required": false
	},
	{
		"stanza:key": "data-url",
		"stanza:example": "https://stg-grch38.togovar.org/api/search/variant",
		"stanza:description": "TogoVar API base URL or variant search API URL (required when variant is given without tgv_id)",
		"stanza:required": false
	}
],
	"stanza:menu-placement": "none",
	"stanza:style": [
	{
		"stanza:key": "--text-align",
		"stanza:type": "single-choice",
		"stanza:choice": [
			"left",
			"center",
			"right"
		],
		"stanza:default": "center",
		"stanza:description": "text align"
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

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":25,"column":11}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <table class=\"table variant-header\">\n      <thead>\n      <tr>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"xrefs") : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":10,"column":17}}})) != null ? stack1 : "")
    + "      </tr>\n      </thead>\n      <tbody>\n      <tr>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"xrefs") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":15,"column":8},"end":{"line":21,"column":17}}})) != null ? stack1 : "")
    + "      </tr>\n      </tbody>\n    </table>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <th>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data,"loc":{"start":{"line":9,"column":14},"end":{"line":9,"column":22}}}) : helper)))
    + "</th>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <td>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"refs") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":17,"column":12},"end":{"line":19,"column":21}}})) != null ? stack1 : "")
    + "          </td>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a href=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"url") : depth0), depth0))
    + "\">"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"label") : depth0), depth0))
    + "</a>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":26,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-header.js.map
