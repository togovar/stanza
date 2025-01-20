import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { u as unwrapValueFromBinding } from './utils-6f61a843.js';
import { a as alphaMissense, s as sift, p as polyphen } from './display-8f29f2e3.js';
import './constants-f43484af.js';

class VariantTranscript extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/variant_transcript?tgv_id=${this.params.tgv_id}`);

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
      const bindings = unwrapValueFromBinding(json);

      bindings.forEach(binding => {
        binding.transcript = {
          label: binding.transcript ? binding.transcript.split("/").reverse()[0] : "",
          url: binding.enst_id ? "http://identifiers.org/ensembl/".concat(binding.enst_id) : null
        };
        binding.consequence_label = binding.consequence_label.split(",");

        Object.assign(binding, alphaMissense(binding.alpha_missense));
        Object.assign(binding, sift(binding.sift));
        Object.assign(binding, polyphen(binding.polyphen));
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
  }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantTranscript
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-transcript",
	"stanza:label": "Variant / Transcript",
	"stanza:definition": "Display gene and transcript consequences",
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

  return "  <table class=\"table\">\n    <thead>\n    <tr>\n      <th>Transcript ID</th>\n      <th>Gene symbol</th>\n      <th>Consequence type</th>\n      <th>HGVS(cDNA)</th>\n      <th>HGVS(Amino acid seq.)</th>\n      <th>AlphaMissense</th>\n      <th>SIFT</th>\n      <th>PolyPhen</th>\n    </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data,"loc":{"start":{"line":19,"column":4},"end":{"line":49,"column":13}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), alias4=container.hooks.helperMissing, alias5="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <tr>\n        <td><a href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "</a></td>\n        <td><a href=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"gene_xref") || (depth0 != null ? lookupProperty(depth0,"gene_xref") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"gene_xref","hash":{},"data":data,"loc":{"start":{"line":22,"column":21},"end":{"line":22,"column":34}}}) : helper)))
    + "\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"gene_symbol") || (depth0 != null ? lookupProperty(depth0,"gene_symbol") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"gene_symbol","hash":{},"data":data,"loc":{"start":{"line":22,"column":36},"end":{"line":22,"column":51}}}) : helper)))
    + "</a></td>\n        <td>\n          <ul class=\"no-bullet\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias3,(depth0 != null ? lookupProperty(depth0,"consequence_label") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":12},"end":{"line":27,"column":21}}})) != null ? stack1 : "")
    + "          </ul>\n        </td>\n        <td>"
    + alias2(((helper = (helper = lookupProperty(helpers,"hgvs_c") || (depth0 != null ? lookupProperty(depth0,"hgvs_c") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"hgvs_c","hash":{},"data":data,"loc":{"start":{"line":30,"column":12},"end":{"line":30,"column":22}}}) : helper)))
    + "</td>\n        <td>"
    + alias2(((helper = (helper = lookupProperty(helpers,"hgvs_p") || (depth0 != null ? lookupProperty(depth0,"hgvs_p") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"hgvs_p","hash":{},"data":data,"loc":{"start":{"line":31,"column":12},"end":{"line":31,"column":22}}}) : helper)))
    + "</td>\n        <td class=\"alphamissense\">\n          <span class=\"variant-function\" data-function=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"alpha_missense_class") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_class") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"alpha_missense_class","hash":{},"data":data,"loc":{"start":{"line":33,"column":56},"end":{"line":33,"column":80}}}) : helper)))
    + "\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"alpha_missense") || (depth0 != null ? lookupProperty(depth0,"alpha_missense") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"alpha_missense","hash":{},"data":data,"loc":{"start":{"line":33,"column":82},"end":{"line":33,"column":100}}}) : helper)))
    + "</span>\n          <span class=\"alphamissense-label\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"alpha_missense_label") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_label") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"alpha_missense_label","hash":{},"data":data,"loc":{"start":{"line":34,"column":44},"end":{"line":34,"column":68}}}) : helper)))
    + "</span>\n        </td>\n        <td class=\"sift\">\n          <span class=\"variant-function\" data-function=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"sift_class") || (depth0 != null ? lookupProperty(depth0,"sift_class") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"sift_class","hash":{},"data":data,"loc":{"start":{"line":37,"column":56},"end":{"line":37,"column":70}}}) : helper)))
    + "\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"sift") || (depth0 != null ? lookupProperty(depth0,"sift") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"sift","hash":{},"data":data,"loc":{"start":{"line":37,"column":72},"end":{"line":37,"column":80}}}) : helper)))
    + "</span>\n          <span class=\"sift-label\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"sift_label") || (depth0 != null ? lookupProperty(depth0,"sift_label") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"sift_label","hash":{},"data":data,"loc":{"start":{"line":38,"column":35},"end":{"line":38,"column":49}}}) : helper)))
    + "</span>\n        </td>\n        <td class=\"polyphen\">\n          <span class=\"variant-function\" data-function=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"polyphen_class") || (depth0 != null ? lookupProperty(depth0,"polyphen_class") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"polyphen_class","hash":{},"data":data,"loc":{"start":{"line":41,"column":56},"end":{"line":41,"column":74}}}) : helper)))
    + "\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"polyphen") || (depth0 != null ? lookupProperty(depth0,"polyphen") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"polyphen","hash":{},"data":data,"loc":{"start":{"line":41,"column":76},"end":{"line":41,"column":88}}}) : helper)))
    + "</span>\n          <span class=\"polyphen-label\">"
    + alias2(((helper = (helper = lookupProperty(helpers,"polyphen_label") || (depth0 != null ? lookupProperty(depth0,"polyphen_label") : depth0)) != null ? helper : alias4),(typeof helper === alias5 ? helper.call(alias3,{"name":"polyphen_label","hash":{},"data":data,"loc":{"start":{"line":42,"column":39},"end":{"line":42,"column":57}}}) : helper)))
    + "</span>\n        </td>\n      </tr>\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "              <li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "      <tr>\n        <td colspan=\"7\" class=\"text-center\">No data</td>\n      </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":52,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-transcript.js.map
