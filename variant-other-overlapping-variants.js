import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { t as transformRecord } from './display-8f29f2e3.js';
import './constants-f43484af.js';

class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_other_alternative_alleles?tgv_id=${this.params.tgv_id}`);

    const r = await fetch(sparqlist, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    }).then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error(sparqlist + " returns status " + res.status);
    }).then(json => {
      let records = json.data ? json.data.filter(x => x.id !== this.params.tgv_id) : [];

      records.forEach(record => transformRecord(record, this.params.assembly));

      return {result: {data: records}};
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
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
	"@id": "variant-other-overlapping-variants",
	"stanza:label": "Variant / Other overlapping variants",
	"stanza:definition": "Display variants that exists on same chromosomal location",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-04-22",
	"stanza:updated": "2022-04-15",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv122011872",
		"stanza:description": "TogoVar ID",
		"stanza:required": true
	},
	{
		"stanza:key": "assembly",
		"stanza:example": "GRCh38",
		"stanza:description": "assembly: \"GRCh37\" or \"GRCh38\"",
		"stanza:required": true
	},
	{
		"stanza:key": "sparqlist",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL",
		"stanza:required": false
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

  return "  <div class=\"alert alert-danger\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":45}}}) : helper)))
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":100,"column":11}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <table class=\"table other_alternative_alleles\">\n      <thead>\n        <tr>\n          <th>TogoVar ID</th>\n          <th>RefSNP ID</th>\n          <th>Position</th>\n          <th>Ref / Alt</th>\n          <th>Variant type</th>\n          <th>Alt frequency</th>\n          <th>Consequence</th>\n          <th>SIFT</th>\n          <th>PolyPhen</th>\n          <th>Clinical Significance</th>\n        </tr>\n      </thead>\n      <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"data") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(13, data, 0),"data":data,"loc":{"start":{"line":21,"column":8},"end":{"line":97,"column":17}}})) != null ? stack1 : "")
    + "      </tbody>\n    </table>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <tr>\n            <td class=\"id\">\n              <a href=\"/variant/"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":24,"column":32},"end":{"line":24,"column":38}}}) : helper)))
    + "\">\n                "
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":25,"column":16},"end":{"line":25,"column":22}}}) : helper)))
    + "\n              </a>\n            </td>\n            <td class=\"dbsnp\">\n              <a href=\"https://identifiers.org/dbsnp/"
    + alias4(((helper = (helper = lookupProperty(helpers,"dbsnp") || (depth0 != null ? lookupProperty(depth0,"dbsnp") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dbsnp","hash":{},"data":data,"loc":{"start":{"line":29,"column":53},"end":{"line":29,"column":62}}}) : helper)))
    + "\">\n                "
    + alias4(((helper = (helper = lookupProperty(helpers,"dbsnp") || (depth0 != null ? lookupProperty(depth0,"dbsnp") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dbsnp","hash":{},"data":data,"loc":{"start":{"line":30,"column":16},"end":{"line":30,"column":25}}}) : helper)))
    + "\n              </a>\n            </td>\n            <td class=\"position\">\n              <div class=\"chromosome-position\">\n                <div class=\"chromosome\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"chromosome") || (depth0 != null ? lookupProperty(depth0,"chromosome") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chromosome","hash":{},"data":data,"loc":{"start":{"line":35,"column":40},"end":{"line":35,"column":54}}}) : helper)))
    + "</div>\n                <div class=\"coordinate\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"position") || (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"position","hash":{},"data":data,"loc":{"start":{"line":36,"column":40},"end":{"line":36,"column":52}}}) : helper)))
    + "</div>\n              </div>\n            </td>\n            <td>\n              <div class=\"ref-alt\">\n                <span class=\"ref\" data-sum=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"ref_length") || (depth0 != null ? lookupProperty(depth0,"ref_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref_length","hash":{},"data":data,"loc":{"start":{"line":41,"column":44},"end":{"line":41,"column":58}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"ref") || (depth0 != null ? lookupProperty(depth0,"ref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref","hash":{},"data":data,"loc":{"start":{"line":41,"column":60},"end":{"line":41,"column":67}}}) : helper)))
    + "</span><span\n                  class=\"arrow\"\n                ></span><span\n                  class=\"alt\"\n                  data-sum=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"alt_length") || (depth0 != null ? lookupProperty(depth0,"alt_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt_length","hash":{},"data":data,"loc":{"start":{"line":45,"column":28},"end":{"line":45,"column":42}}}) : helper)))
    + "\"\n                >"
    + alias4(((helper = (helper = lookupProperty(helpers,"alt") || (depth0 != null ? lookupProperty(depth0,"alt") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt","hash":{},"data":data,"loc":{"start":{"line":46,"column":17},"end":{"line":46,"column":24}}}) : helper)))
    + "</span>\n              </div>\n            </td>\n            <td class=\"type\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"type") || (depth0 != null ? lookupProperty(depth0,"type") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data,"loc":{"start":{"line":49,"column":29},"end":{"line":49,"column":37}}}) : helper)))
    + "</td>\n            <td>\n              <div class=\"frequency-graph\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"frequencies") : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":52,"column":16},"end":{"line":58,"column":25}}})) != null ? stack1 : "")
    + "              </div>\n            </td>\n            <td class=\"consequence\">\n              "
    + alias4(((helper = (helper = lookupProperty(helpers,"most_severe_consequence") || (depth0 != null ? lookupProperty(depth0,"most_severe_consequence") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"most_severe_consequence","hash":{},"data":data,"loc":{"start":{"line":62,"column":14},"end":{"line":62,"column":41}}}) : helper)))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"consequence_badge") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":63,"column":14},"end":{"line":65,"column":21}}})) != null ? stack1 : "")
    + "            </td>\n            <td class=\"sift\">\n              <span\n                class=\"variant-function\"\n                data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"sift_class") || (depth0 != null ? lookupProperty(depth0,"sift_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift_class","hash":{},"data":data,"loc":{"start":{"line":70,"column":31},"end":{"line":70,"column":45}}}) : helper)))
    + "\"\n              >"
    + alias4(((helper = (helper = lookupProperty(helpers,"sift") || (depth0 != null ? lookupProperty(depth0,"sift") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift","hash":{},"data":data,"loc":{"start":{"line":71,"column":15},"end":{"line":71,"column":23}}}) : helper)))
    + "</span>\n            </td>\n            <td class=\"polyphen\">\n              <span\n                class=\"variant-function\"\n                data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen_class") || (depth0 != null ? lookupProperty(depth0,"polyphen_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen_class","hash":{},"data":data,"loc":{"start":{"line":76,"column":31},"end":{"line":76,"column":49}}}) : helper)))
    + "\"\n              >"
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen") || (depth0 != null ? lookupProperty(depth0,"polyphen") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen","hash":{},"data":data,"loc":{"start":{"line":77,"column":15},"end":{"line":77,"column":27}}}) : helper)))
    + "</span>\n            </td>\n            <td class=\"clinical_significance_wrapper\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"significance") : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":80,"column":14},"end":{"line":90,"column":21}}})) != null ? stack1 : "")
    + "            </td>\n          </tr>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  <div\n                    class=\"dataset\"\n                    data-dataset=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"source") : depth0), depth0))
    + "\"\n                    data-frequency=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"level") : depth0), depth0))
    + "\"\n                  ></div>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <span class=\"badge\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"consequence_badge") || (depth0 != null ? lookupProperty(depth0,"consequence_badge") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"consequence_badge","hash":{},"data":data,"loc":{"start":{"line":64,"column":36},"end":{"line":64,"column":57}}}) : helper)))
    + "</span>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <span\n                  class=\"clinical-significance\"\n                  data-sign=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"significance") : depth0)) != null ? lookupProperty(stack1,"interpretation") : stack1), depth0))
    + "\"\n                >\n                  "
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"significance") : depth0)) != null ? lookupProperty(stack1,"condition") : stack1), depth0))
    + "\n                </span>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"significance_badge") : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":87,"column":16},"end":{"line":89,"column":23}}})) != null ? stack1 : "");
},"11":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  <span class=\"badge\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"significance_badge") || (depth0 != null ? lookupProperty(depth0,"significance_badge") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"significance_badge","hash":{},"data":data,"loc":{"start":{"line":88,"column":38},"end":{"line":88,"column":60}}}) : helper)))
    + "</span>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "          <tr>\n            <td class=\"text-center\" colspan=\"10\">No data</td>\n          </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":101,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-other-overlapping-variants.js.map
