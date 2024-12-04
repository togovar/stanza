import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import './stanza-f94b87e1.js';

class GenePublication extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/gene_publication?hgnc_id=${this.params.hgnc_id}`);

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
      return {
        result: json.data.map(x => x.reduce((previousValue, currentValue, currentIndex) => {
          previousValue[json.columns[currentIndex]] = currentValue;
          return previousValue;
        }, {}))
      }
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
        lengthMenu: [[5, 20, 50, -1], [5, 20, 50, "All"]],
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
      template: 'stanza.html.hbs',
      parameters: {
        params: this.params,
        ...r,
      }
    });
  }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': GenePublication
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-publication",
	"stanza:label": "Gene / Publication",
	"stanza:definition": "Display publications to be related to the gene",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Yu Tokunaga",
	"stanza:address": "tokunaga@biosciencedbc.jp",
	"stanza:contributor": [
],
	"stanza:created": "2021-05-27",
	"stanza:updated": "2022-04-15",
	"stanza:parameter": [
	{
		"stanza:key": "hgnc_id",
		"stanza:example": "404",
		"stanza:description": "HGNC ID",
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
    return "  <table id=\"dataTable\" style=\"width:100%\">\n  </table>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":6,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-publication.js.map
