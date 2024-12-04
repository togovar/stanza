import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { u as uniq } from './uniq-f80b7f40.js';
import { u as unwrapValueFromBinding } from './utils-6f61a843.js';

class GeneSummary extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_summary?hgnc_id=${this.params.hgnc_id}`);

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
      const binding = bindings[0];

      return {
        result: {
          hgnc_url: binding.hgnc_uri,
          approved_name: uniq(bindings.map(x => x.approved_name)).join(','),
          ensembl_url: binding.ensg,
          ensembl: binding.ensg ? binding.ensg.split('/').slice(-1)[0] : null,
          alias: uniq(bindings.map(x => x.alias)).join(','),
          ncbi_gene_url: binding.ncbigene,
          ncbi_gene: binding.ncbigene ? binding.ncbigene.split('/').slice(-1)[0] : null,
          location: uniq(bindings.map(x => x.chromosomal_location)).join(','),
          refseq_url: binding.refseq,
          refseq: binding.refseq ? binding.refseq.split('/').slice(-1)[0] : null,
        }
      };
    }).catch(e => ({error: {message: e.message}}));

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
  'default': GeneSummary
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-summary",
	"stanza:label": "Gene / Summary",
	"stanza:definition": "Display summary information",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "Togovar",
	"stanza:license": "MIT",
	"stanza:author": "Shuichi Tahara",
	"stanza:address": "tahara@biosciencedbc.jp",
	"stanza:contributor": [
],
	"stanza:created": "2021-06-08",
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
		"stanza:example": "https://grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL",
		"stanza:required": false
	}
],
	"stanza:menu-placement": "bottom-right",
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
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":54,"column":11}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <table class=\"table gene -horizontalkeyvalue\">\n      <tr>\n        <th>HGNC/Approved name</th>\n        <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"hgnc_url") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(7, data, 0),"data":data,"loc":{"start":{"line":9,"column":10},"end":{"line":13,"column":17}}})) != null ? stack1 : "")
    + "        </td>\n\n        <th>Ensembl</th>\n        <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"ensembl_url") : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(11, data, 0),"data":data,"loc":{"start":{"line":18,"column":10},"end":{"line":22,"column":17}}})) != null ? stack1 : "")
    + "        </td>\n      </tr>\n\n      <tr>\n        <th>Alias</th>\n        <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"alias") || (depth0 != null ? lookupProperty(depth0,"alias") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alias","hash":{},"data":data,"loc":{"start":{"line":28,"column":12},"end":{"line":28,"column":21}}}) : helper)))
    + "</td>\n\n        <th>NCBI Gene</th>\n        <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"ncbi_gene_url") : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.program(15, data, 0),"data":data,"loc":{"start":{"line":32,"column":10},"end":{"line":36,"column":17}}})) != null ? stack1 : "")
    + "        </td>\n      </tr>\n\n      <tr>\n        <th>Chromosomal Location</th>\n        <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"location") || (depth0 != null ? lookupProperty(depth0,"location") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"location","hash":{},"data":data,"loc":{"start":{"line":42,"column":12},"end":{"line":42,"column":24}}}) : helper)))
    + "</td>\n\n        <th>RefSeq</th>\n        <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"refseq_url") : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0),"inverse":container.program(19, data, 0),"data":data,"loc":{"start":{"line":46,"column":10},"end":{"line":50,"column":17}}})) != null ? stack1 : "")
    + "        </td>\n      </tr>\n    </table>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"hgnc_url") || (depth0 != null ? lookupProperty(depth0,"hgnc_url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hgnc_url","hash":{},"data":data,"loc":{"start":{"line":10,"column":21},"end":{"line":10,"column":33}}}) : helper)))
    + "\" target=\"_blank\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"approved_name") || (depth0 != null ? lookupProperty(depth0,"approved_name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"approved_name","hash":{},"data":data,"loc":{"start":{"line":10,"column":51},"end":{"line":10,"column":68}}}) : helper)))
    + "</a>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"approved_name") || (depth0 != null ? lookupProperty(depth0,"approved_name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"approved_name","hash":{},"data":data,"loc":{"start":{"line":12,"column":12},"end":{"line":12,"column":29}}}) : helper)))
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"ensembl_url") || (depth0 != null ? lookupProperty(depth0,"ensembl_url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ensembl_url","hash":{},"data":data,"loc":{"start":{"line":19,"column":21},"end":{"line":19,"column":36}}}) : helper)))
    + "\" target=\"_blank\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"ensembl") || (depth0 != null ? lookupProperty(depth0,"ensembl") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ensembl","hash":{},"data":data,"loc":{"start":{"line":19,"column":54},"end":{"line":19,"column":65}}}) : helper)))
    + "</a>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"ensembl") || (depth0 != null ? lookupProperty(depth0,"ensembl") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"ensembl","hash":{},"data":data,"loc":{"start":{"line":21,"column":12},"end":{"line":21,"column":23}}}) : helper)))
    + "\n";
},"13":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"ncbi_gene_url") || (depth0 != null ? lookupProperty(depth0,"ncbi_gene_url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ncbi_gene_url","hash":{},"data":data,"loc":{"start":{"line":33,"column":21},"end":{"line":33,"column":38}}}) : helper)))
    + "\" target=\"_blank\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"ncbi_gene") || (depth0 != null ? lookupProperty(depth0,"ncbi_gene") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ncbi_gene","hash":{},"data":data,"loc":{"start":{"line":33,"column":56},"end":{"line":33,"column":69}}}) : helper)))
    + "</a>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"ncbi_gene") || (depth0 != null ? lookupProperty(depth0,"ncbi_gene") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"ncbi_gene","hash":{},"data":data,"loc":{"start":{"line":35,"column":12},"end":{"line":35,"column":25}}}) : helper)))
    + "\n";
},"17":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"refseq_url") || (depth0 != null ? lookupProperty(depth0,"refseq_url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"refseq_url","hash":{},"data":data,"loc":{"start":{"line":47,"column":21},"end":{"line":47,"column":35}}}) : helper)))
    + "\" target=\"_blank\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"refseq") || (depth0 != null ? lookupProperty(depth0,"refseq") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"refseq","hash":{},"data":data,"loc":{"start":{"line":47,"column":53},"end":{"line":47,"column":63}}}) : helper)))
    + "</a>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"refseq") || (depth0 != null ? lookupProperty(depth0,"refseq") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"refseq","hash":{},"data":data,"loc":{"start":{"line":49,"column":12},"end":{"line":49,"column":22}}}) : helper)))
    + "\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":55,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-summary.js.map
