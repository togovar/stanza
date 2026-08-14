import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import './stanza-644a6e8e.js';
import { u as unwrapValueFromBinding } from './utils-97dc77a0.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-4313dcda.js';
import { a as buildIdentifierQueryString, d as describeVariantIdentifier } from './sparqlist-47ca0758.js';
import { f as fetchVariantDataByIdentifier } from './togovar-variant-0e8288d9.js';
import { p as parseVariantParam, a as assertValidVariantIdentifier } from './variant-0dd96a22.js';

const RS_PREFIX = "http://identifiers.org/dbsnp/";

class VariantPublication extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params ?? {};
    const parsedVariant = parseVariantParam(params.variant);

    const r = await Promise.resolve().then(async () => {
      assertValidVariantIdentifier(params.tgv_id, params.variant, parsedVariant);

      let tgvId = params.tgv_id;
      if (!tgvId) {
        if (!params["data-url"]) {
          throw new Error("data-url parameter is required when variant is given without tgv_id");
        }

        const variantData = await fetchVariantDataByIdentifier(
          params["data-url"],
          tgvId,
          parsedVariant,
          describeVariantIdentifier(params),
        );
        tgvId = variantData.id;
      }

      // tgv2rs は variant を解釈しないため、必ず解決済みの tgv_id だけを渡す。
      const queryString = buildIdentifierQueryString({ tgv_id: tgvId });
      const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);

      return fetch(sparqlist, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
    }).then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error("tgv2rs returns status " + res.status);
    }).then(json => {
      return unwrapValueFromBinding(json)[0];
    }).then(result => {
      if (!result) {
        return;
      }

      const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_publication?rs=${result.rs.replace(RS_PREFIX, "")}`);

      return fetch(sparqlist, {
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
        return {
          result: json.data.map(x => x.reduce((previousValue, currentValue, currentIndex) => {
            previousValue[json.columns[currentIndex]] = currentValue;
            return previousValue;
          }, {}))
        }
      }).catch(e => ({ error: { message: e.message } }));
    }).catch(e => ({error: {message: e.message}}));

    const sources = [
      new URL("./assets/vendor/jquery/3.6.0/jquery.min.js", import.meta.url),
      new URL("./assets/vendor/datatables/1.10.24/jquery.dataTables.js", import.meta.url),
    ];

    this.embedScriptTag(...sources).then(() => {
      $(this.root.querySelector("#dataTable")).DataTable({
        data: r?.result || [],
        searching: false,
        dom: "ilrtfp",
        order: [[2, "desc"]],
        language: {
          emptyTable: "No data",
        },
        columns: [
          {
            data: 'PMID',
            title: 'PMID',
          },
          {
            data: 'Reference',
            title: 'Reference',
          },
          {
            data: 'Year',
            title: 'Year',
          },
          {
            data: 'Cited by',
            title: 'Cited by',
            className: 'dt-head-right dt-body-right',
            render: (data, type, _row) => {
              if (type === "display" && Array.isArray(data)) {
                data = `<ul>${data.map(x => `<li>${x}</li>`).join("")}</ul>`;
              }
              return data;
            }
          },
        ]
      });
    });

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
  'default': VariantPublication
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-publication",
	"stanza:label": "Variant / Publication",
	"stanza:definition": "Display publications to be related to the variant",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-04-22",
	"stanza:updated": "2026-08-12",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv29245294",
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
    return "  <table id=\"dataTable\" style=\"width:100%\">\n  </table>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":6,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-publication.js.map
