import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { u as unwrapValueFromBinding } from './utils-6f61a843.js';
import { r as refAlt } from './display-8f29f2e3.js';
import './constants-f43484af.js';

class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_summary?tgv_id=${this.params.tgv_id}`);

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
      let binding = bindings[0];

      if (binding) {
        [binding.chr, binding.assembly] = binding.reference.split("/").slice(-2);

        Object.assign(binding, refAlt(binding.ref, binding.alt));
      }

      return {result: {...binding}};
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
		"stanza:default": 50,
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

  return "  <div>\n    <table class=\"table -horizontalkeyvalue\">\n"
    + ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":6},"end":{"line":28,"column":15}}})) != null ? stack1 : "")
    + "    </table>\n  </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <th>Variant type</th>\n          <td class=\"variant-type-value\"><span class=\"variant-value\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"type") || (depth0 != null ? lookupProperty(depth0,"type") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data,"loc":{"start":{"line":9,"column":69},"end":{"line":9,"column":77}}}) : helper)))
    + "</span></td>\n          <th>Ref / Alt</th>\n          <td>\n            <div class=\"ref-alt\">\n              <span class='ref' data-sum='"
    + alias4(((helper = (helper = lookupProperty(helpers,"ref_length") || (depth0 != null ? lookupProperty(depth0,"ref_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref_length","hash":{},"data":data,"loc":{"start":{"line":13,"column":42},"end":{"line":13,"column":56}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"ref") || (depth0 != null ? lookupProperty(depth0,"ref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ref","hash":{},"data":data,"loc":{"start":{"line":13,"column":58},"end":{"line":13,"column":65}}}) : helper)))
    + "</span><span class='arrow'></span><span\n                class='alt' data-sum='"
    + alias4(((helper = (helper = lookupProperty(helpers,"alt_length") || (depth0 != null ? lookupProperty(depth0,"alt_length") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt_length","hash":{},"data":data,"loc":{"start":{"line":14,"column":38},"end":{"line":14,"column":52}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"alt") || (depth0 != null ? lookupProperty(depth0,"alt") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alt","hash":{},"data":data,"loc":{"start":{"line":14,"column":54},"end":{"line":14,"column":61}}}) : helper)))
    + "</span>\n            </div>\n          </td>\n        </tr>\n\n        <tr>\n          <th>Position</th>\n          <td>\n            <span class=\"chromosome\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"chr") || (depth0 != null ? lookupProperty(depth0,"chr") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chr","hash":{},"data":data,"loc":{"start":{"line":22,"column":37},"end":{"line":22,"column":44}}}) : helper)))
    + "</span>:<span class='position'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"position") || (depth0 != null ? lookupProperty(depth0,"position") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"position","hash":{},"data":data,"loc":{"start":{"line":22,"column":75},"end":{"line":22,"column":87}}}) : helper)))
    + "</span> <span\n              class='assembly'>("
    + alias4(((helper = (helper = lookupProperty(helpers,"assembly") || (depth0 != null ? lookupProperty(depth0,"assembly") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"assembly","hash":{},"data":data,"loc":{"start":{"line":23,"column":32},"end":{"line":23,"column":44}}}) : helper)))
    + ")</span>\n          </td>\n          <th></th>\n          <td></td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":31,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-summary.js.map
