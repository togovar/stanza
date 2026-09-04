import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { r as referenceToChrAssembly } from './display-3a18fc32.js';
import { a as buildIdentifierQueryString, f as fetchSparqlBindings, d as describeVariantIdentifier } from './sparqlist-47ca0758.js';
import { p as parseVariantParam, a as assertValidVariantIdentifier, n as normalizeChromosome } from './variant-0dd96a22.js';
import './constants-c005a6eb.js';
import './frequency-9d3406e7.js';
import './utils-97dc77a0.js';

/**
 * variant_summary の binding から JBrowse 表示用の座標を取り出す。
 * SPARQList 結果は reference URI と position/ref が分かれて返るため、
 * reference URI を chr/assembly に分解し、Ref の長さからハイライト終端を計算する。
 */
const buildGenomicPositionFromBinding = (binding) => {
    const { chr } = referenceToChrAssembly(binding.reference);
    const from = Number(binding.position);
    if (!chr || !Number.isSafeInteger(from) || from < 1 || !binding.ref) {
        throw new Error("Failed to obtain genomic position");
    }
    return {
        chr,
        from,
        to: from + Math.max(binding.ref.length - 1, 0),
        reference: binding.ref,
        alternate: binding.alt,
    };
};
/**
 * SPARQList に summary 行が無い variant-only 入力向けの fallback。
 * VCF表記の variant には CHROM/POS/REF/ALT が含まれるため、遺伝子情報などは無くても
 * JBrowse の表示範囲とハイライト範囲だけは組み立てられる。
 */
const buildGenomicPositionFromVariant = (parsedVariant) => {
    const from = Number(parsedVariant.position);
    if (!Number.isSafeInteger(from) || from < 1) {
        throw new Error("Failed to obtain genomic position");
    }
    const chr = normalizeChromosome(parsedVariant.chromosome);
    if (!chr) {
        throw new Error("Failed to obtain genomic position");
    }
    return {
        chr,
        from,
        to: from + Math.max(parsedVariant.reference.length - 1, 0),
        reference: parsedVariant.reference,
        alternate: parsedVariant.alternate,
    };
};
/**
 * JBrowse iframe の src を組み立てる。
 * loc は前後 margin を含む表示範囲、highlight は実際のvariant範囲として分けて渡す。
 */
const buildJbrowseSrc = (params, { chr, from, to, reference, alternate }) => {
    const parsedRange = Number(params.margin);
    const range = Number.isSafeInteger(parsedRange) && parsedRange >= 0 ? parsedRange : 50;
    const baseUrl = params.jbrowse || "/jbrowse";
    const start = Math.max(from - range, 1);
    return baseUrl.concat("/index.html?loc=", encodeURIComponent(`${chr}:${start}..${to + range}`), "&highlight=", encodeURIComponent(`chr${chr}:${from}..${to}`), "&variant=", encodeURIComponent(`${chr}-${from}-${reference}-${alternate}`));
};
class VariantGenomicContext extends Stanza {
    /**
     * variant_summary を優先して座標を取得し、空結果の場合だけ variant 文字列から fallback する。
     * tgv_id がある場合は SPARQList の解決結果を信頼し、別の variant 値へは fallback しない。
     */
    async render() {
        const params = (this.params ?? {});
        const parsedVariant = parseVariantParam(params.variant);
        const templateParams = { params };
        try {
            assertValidVariantIdentifier(params.tgv_id, params.variant, parsedVariant);
            const queryString = buildIdentifierQueryString(params);
            const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_summary?${queryString}`);
            const bindings = await fetchSparqlBindings(sparqlist);
            const binding = bindings[0];
            const genomicPosition = this.buildGenomicPosition(params, parsedVariant, binding);
            templateParams.result = {
                src: buildJbrowseSrc(params, genomicPosition),
                width: params.width || "100%",
                height: params.height || "600px",
            };
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
    /**
     * SPARQList のbindingを座標に変換し、空結果や不完全なbindingの場合は fallback を試す。
     * staging/local のSPARQList差分や未登録variantでも、variant-onlyならJBrowse表示を維持するため。
     */
    buildGenomicPosition(params, parsedVariant, binding) {
        if (!binding) {
            return this.buildFallbackPosition(params, parsedVariant);
        }
        try {
            return buildGenomicPositionFromBinding(binding);
        }
        catch (error) {
            if (!params.tgv_id && parsedVariant) {
                console.warn(error);
                return this.buildFallbackPosition(params, parsedVariant);
            }
            throw error;
        }
    }
    /**
     * SPARQList が空結果だった場合の座標 fallback を判断する。
     * tgv_id と variant が両方ある場合は tgv_id 優先という全体方針に合わせ、
     * tgv_id 無しの variant-only 入力だけ variant 由来の座標を使う。
     */
    buildFallbackPosition(params, parsedVariant) {
        if (!params.tgv_id && parsedVariant) {
            // variant には座標とRef/Altが含まれるため、SPARQListにsummary行が無い未登録variantでも
            // JBrowseの表示範囲だけは組み立てられる。
            return buildGenomicPositionFromVariant(parsedVariant);
        }
        throw new Error(`Failed to obtain genomic position for ${describeVariantIdentifier(params)}`);
    }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantGenomicContext
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-genomic-context",
	"stanza:label": "Variant / Genomic context",
	"stanza:definition": "Schematic view of the structure and surroundings of a variant.",
	"stanza:type": "Stanza",
	"stanza:display": "Other",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2015-02-03",
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
		"stanza:key": "assembly",
		"stanza:example": "GRCh38",
		"stanza:description": "assembly: \"GRCh37\" or \"GRCh38\"",
		"stanza:required": true
	},
	{
		"stanza:key": "jbrowse",
		"stanza:example": "https://stg-grch38.togovar.org/jbrowse",
		"stanza:description": "JBrowse URL",
		"stanza:required": false
	},
	{
		"stanza:key": "sparqlist",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL",
		"stanza:required": false
	},
	{
		"stanza:key": "margin",
		"stanza:example": 50,
		"stanza:description": "Margin of front and rear of the variation",
		"stanza:required": false
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
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":6,"column":11}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <iframe src=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"src") || (depth0 != null ? lookupProperty(depth0,"src") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"src","hash":{},"data":data,"loc":{"start":{"line":5,"column":17},"end":{"line":5,"column":24}}}) : helper)))
    + "\" width=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"width") || (depth0 != null ? lookupProperty(depth0,"width") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"width","hash":{},"data":data,"loc":{"start":{"line":5,"column":33},"end":{"line":5,"column":42}}}) : helper)))
    + "\" height=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"height") || (depth0 != null ? lookupProperty(depth0,"height") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"height","hash":{},"data":data,"loc":{"start":{"line":5,"column":52},"end":{"line":5,"column":62}}}) : helper)))
    + "\"></iframe>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":7,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-genomic-context.js.map
