import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { u as unwrapValueFromBinding } from './utils-6f61a843.js';
import { R as REVIEW_STATUS, C as CLINICAL_SIGNIFICANCE } from './constants-f43484af.js';
import { r as rowSpanize } from './table-dac50f51.js';

class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_clinvar?tgv_id=${this.params.tgv_id}`);

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
      let bindings = unwrapValueFromBinding(json);

      bindings.forEach(function (binding) {
        binding.vcv_stars = REVIEW_STATUS[binding.vcv_review_status]?.stars || 0;
        binding.rcv_stars = REVIEW_STATUS[binding.rcv_review_status]?.stars || 0;
        binding.significance_class = CLINICAL_SIGNIFICANCE[binding.interpretation?.toLowerCase()]?.key;
        binding.condition = {
          label: binding.condition,
          url: "https://identifiers.org/medgen:".concat(binding.medgen),
        };
      });
      return {result: bindings};
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
    });

    rowSpanize(this.root.querySelector("#target"));
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
	"stanza:updated": "2022-04-15",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv219804",
		"stanza:description": "TogoVar ID",
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

  return "  <table id=\"target\" class=\"table\">\n    <thead>\n      <tr>\n        <th>Title</th>\n        <th>VCV review status</th>\n        <th>RCV review status</th>\n        <th>Clinical significance</th>\n        <th>Last evaluated</th>\n        <th>Condition(s)</th>\n      </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":17,"column":6},"end":{"line":53,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, alias5=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td class=\"title\">\n            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"clinvar") || (depth0 != null ? lookupProperty(depth0,"clinvar") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clinvar","hash":{},"data":data,"loc":{"start":{"line":20,"column":21},"end":{"line":20,"column":32}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":20,"column":34},"end":{"line":20,"column":43}}}) : helper)))
    + "</a>\n          </td>\n          <td class=\"review-status\">\n            <span class=\"star-rating\">\n              <span data-stars=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"vcv_stars") || (depth0 != null ? lookupProperty(depth0,"vcv_stars") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"vcv_stars","hash":{},"data":data,"loc":{"start":{"line":24,"column":32},"end":{"line":24,"column":45}}}) : helper)))
    + "\" class=\"star-rating-item\"></span>\n            </span>\n            <br />\n            <span class=\"status-description\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"vcv_review_status") || (depth0 != null ? lookupProperty(depth0,"vcv_review_status") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"vcv_review_status","hash":{},"data":data,"loc":{"start":{"line":27,"column":45},"end":{"line":27,"column":66}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"review-status rowspan-ignore\">\n            <span class=\"star-rating\">\n              <span data-stars=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"rcv_stars") || (depth0 != null ? lookupProperty(depth0,"rcv_stars") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rcv_stars","hash":{},"data":data,"loc":{"start":{"line":31,"column":32},"end":{"line":31,"column":45}}}) : helper)))
    + "\" class=\"star-rating-item\"></span>\n            </span>\n            <br />\n            <span class=\"status-description\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"rcv_review_status") || (depth0 != null ? lookupProperty(depth0,"rcv_review_status") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rcv_review_status","hash":{},"data":data,"loc":{"start":{"line":34,"column":45},"end":{"line":34,"column":66}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"clinical-significance-col rowspan-ignore\">\n            <span\n              class=\"clinical-significance-full\"\n              data-sign=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"significance_class") || (depth0 != null ? lookupProperty(depth0,"significance_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"significance_class","hash":{},"data":data,"loc":{"start":{"line":39,"column":25},"end":{"line":39,"column":47}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"interpretation") || (depth0 != null ? lookupProperty(depth0,"interpretation") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"interpretation","hash":{},"data":data,"loc":{"start":{"line":40,"column":13},"end":{"line":40,"column":31}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"last-evaluated rowspan-ignore\">\n            "
    + alias4(((helper = (helper = lookupProperty(helpers,"last_evaluated") || (depth0 != null ? lookupProperty(depth0,"last_evaluated") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"last_evaluated","hash":{},"data":data,"loc":{"start":{"line":43,"column":12},"end":{"line":43,"column":30}}}) : helper)))
    + "\n          </td>\n          <td class=\"condition rowspan-ignore\">\n            <a href=\""
    + alias4(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\">"
    + alias4(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"condition") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "</a>\n          </td>\n        </tr>\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td class=\"text-center\" colspan=\"6\">No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":56,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-clinvar.js.map
