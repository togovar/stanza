import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';

class GeneStructure extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_pdb_mapping?hgnc_id=${this.params.hgnc_id}`);
    
    const res = await fetch(sparqlist, {method: "get", headers: {"Accept": "application/json"}}).then(res => res.json());
    
    const molmil = new URL("./assets/vendor/molmil/", import.meta.url) + "#";
    const colors = ["67,122,204", "204,67,149", "177,204,67", "67,204,204", "177,67,204", "204,149,67", "67,204,122", "94,67,204", "204,67,67", "95,204,67"];
    const colors_l = ["204,224,255", "255,204,235", "245,255,204", "204,255,255", "245,204,255", "255,235,204", "204,255,224", "214,204,255", "255,204,204", "214,255,204"];
    
    res.variant.unshift({tgvid: "All variants with clinical significance", cs_class: true});
    res.variant.unshift({tgvid: "Colouring by structure"});
    res.variant.unshift({tgvid: "Colouring by molecule"});
    res.variant.unshift({tgvid: "Colouring by gradient N- to C-term"});

    // inital url
    let url = molmil + "bg_color white;";
    if (res.structure[0].pdb == "AlphaFold") url += "load " + encodeURI(res.structure[0].url) + ";";
    else url += "fetch " + res.structure[0].pdb + ";";
    url += "cartoon_color white, all;";
    for (const c of res.structure[0].chains) {
      url += "cartoon_color group, chain " + c + ";";
    }
    url += "turn y,0.5,50;";
    
    this.renderTemplate(
      {
        template: 'stanza.html.hbs',
        parameters: {
	  params: this.params,
	  url: url,
          ...res,
        }
      }
    );

    const change_tgv = (pdb_j) => {
      let disabled = {};
      for (const v of res.variant) {
	disabled[v.tgvid] = true;
        if (v.tgvid.match(/^Colouring by/) || v.tgvid == "All variants with clinical significance" || pdb_j.pdb == "AlphaFold" || pdb_j.positions[v.position.toString()]) {
	  disabled[v.tgvid] = false;
	  continue;
	}
      }
      const options = this.root.querySelector("#variant_select_" + this.params.hgnc_id).querySelectorAll("option");
      for (let opt of options) {
	opt.disabled = disabled[opt.value];
      }
    };

    const pdb_refine_text = (pdb_j) => {
      let url = "https://pdbj.org/mine/summary/";
      let info = ["<a href='" + url + pdb_j.pdb + "'>" + pdb_j.pdb + "</a>"];
      if (pdb_j.pdb == "AlphaFold") {
        url = "https://alphafold.ebi.ac.uk/entry/";
        info = ["<a href='" + url + pdb_j.uniprot + "'>" + pdb_j.pdb + "</a>"];
      }
      if (pdb_j.resolution) info.push("Resolution: " + pdb_j.resolution + " Å");
      if (pdb_j.rfree) info.push("R-free: " + pdb_j.rfree);
      if (pdb_j.rwork) info.push("Rwork: " + pdb_j.rwork);
      this.root.querySelector("#pdb_refine_" + this.params.hgnc_id).innerHTML = info.join(", ");
    };
    
    const change_view = (change_pdb) => {
      const pdb = this.root.querySelector("#pdb_select_" + this.params.hgnc_id).value;
      const tgvid = this.root.querySelector("#variant_select_" + this.params.hgnc_id).value;
      let pdb_j;
      let tgv_j;
      for (const p of res.structure) {
	if (p.pdb == pdb) {
	  pdb_j = p;
	  break;
	}
      }
      for (const v of res.variant) {
	if (v.tgvid == tgvid) {
	  tgv_j = v;
	  break;
	}
      }
      let url = molmil;
      if (pdb_j.pdb == "AlphaFold") url += "load " + encodeURI(pdb_j.url) + ";";
      else url += "fetch " + pdb + ";";
      if (tgv_j.tgvid.match(/^Colouring by/)) {
	let type = "group";
	if (tgv_j.tgvid.match(/structure/)) type = "structure";
	url += "bg_color white;cartoon_color white, all;";
	for (const [i, c] of pdb_j.chains.entries()) {
	  if (tgv_j.tgvid.match(/molecule/)) type = "[" + colors[i % 10] + "]";
	  url += "cartoon_color " + type + ", chain " + c + ";";
	}
	url += "turn y,0.5,50;";
      } else {
	url += "bg_color [130,130,130];cartoon_color [160,160,160], all;";
	let resi =  tgv_j.position;
	if (pdb_j.pdb != "AlphaFold" && tgv_j.tgvid != "All variants with clinical significance") resi = pdb_j.positions[tgv_j.position.toString()];
	let resi_r = [];
	let resi_o = [];
	let resi_y= [];
	let resi_dg = [];
	let resi_lg = [];
	let resi_g= [];
	if (tgv_j.tgvid == "All variants with clinical significance") {
	  for (const v of res.variant) {
	    if (v.clinical_significance) {
	      console.log(v.clinical_significance);
	      if (v.clinical_significance.match(/Low penetrance/)) resi_o.push(v.position);
	      else if (v.clinical_significance.match(/[Pp]athogenic/)) resi_r.push(v.position);
	      else if (v.clinical_significance.match(/risk allele/)) resi_y.push(v.position);
	      else if (v.clinical_significance.match(/Uncertain significance/)) resi_dg.push(v.position);
	      else if (v.clinical_significance.match(/Likely benign/)) resi_lg.push(v.position);
	      else resi_g.push(v.position);
	    }
	  }
	}
	for (const [i, c] of pdb_j.chains.entries()) {
	  let color = colors_l[i % 10];
	  url += "cartoon_color [" + color + "], chain " + c + ";";
	  if (tgv_j.tgvid == "All variants with clinical significance") {
	    if (resi_g[0]) url += "cartoon_color mediumaquamarine, chain " + c + " and resi " + resi_g.join("+") + ";";
	    if (resi_lg[0]) url += "cartoon_color lightgreen, chain " + c + " and resi " + resi_lg.join("+") + ";";
	    if (resi_dg[0]) url += "cartoon_color darkkhaki, chain " + c + " and resi " + resi_dg.join("+") + ";";
	    if (resi_y[0]) url += "cartoon_color gold, chain " + c + " and resi " + resi_y.join("+") + ";";
	    if (resi_o[0]) url += "cartoon_color darkorange, chain " + c + " and resi " + resi_o.join("+") + ";";
	    if (resi_r[0]) url += "cartoon_color orangered, chain " + c + " and resi " + resi_r.join("+") + ";";
	    if (resi_y[0] || resi_o[0] || resi_r[0]) {
	      const resi = [...new Set(resi_r.concat(resi_o).concat(resi_y))];
	      url += "show sticks, chain " + c + " and resi " + resi.join("+") + ";";
	    }
	  } else {
	    url += "cartoon_color orangered, chain " + c + " and resi " + resi + ";label chain " + c + " and resi " + resi + ", " + tgv_j.label +  ";";
	  }
	}
      }
      // molmil の cookie の関係で iframe の src だけ変更するとラベルが表示できないので iframe を再描画
      //this.root.querySelector("#pdb_iframe_" + this.params.hgnc_id).setAttribute("src", url);
      const html = '<iframe src="' + url + '" id="pdb_iframe_' + this.params.hgnc_id + '" width="800" height="500"></iframe>';
      this.root.querySelector("#pdb_div_" + this.params.hgnc_id).innerHTML = html;

      if (change_pdb) {
	change_tgv(pdb_j);
	pdb_refine_text(pdb_j);
      }
    };

    const change_var_select = (e) => {
      if (e.target.checked) {
	this.root.querySelector("#variant_select_" + this.params.hgnc_id).querySelectorAll("option").forEach(e => e.style.display = "none");
	this.root.querySelectorAll(".cs_" + this.params.hgnc_id).forEach(e => e.style.display = "block");
      } else {
	this.root.querySelector("#variant_select_" + this.params.hgnc_id).querySelectorAll("option").forEach(e => e.style.display = "block");	
      }
    };

    change_tgv(res.structure[0]);
    pdb_refine_text(res.structure[0]);

    this.root.querySelector("#pdb_select_" + this.params.hgnc_id).addEventListener("change", e => { change_view(true);});
    this.root.querySelector("#variant_select_" + this.params.hgnc_id).addEventListener("change", e => { change_view(false); });
    this.root.querySelector("#variant_checkbox_" + this.params.hgnc_id).addEventListener("change", e => { change_var_select(e); });
  }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': GeneStructure
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-protein-structure",
	"stanza:label": "Gene / Protein structure",
	"stanza:definition": "Display variant position in protein structures",
	"stanza:type": "Stanza",
	"stanza:display": "Other",
	"stanza:provider": "Togovar",
	"stanza:license": "MIT",
	"stanza:author": "Yuki Moriya",
	"stanza:contributor": [
],
	"stanza:created": "2024-09-26",
	"stanza:updated": "2024-09-26",
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
	{
		"stanza:key": "--togostanza-iframe-max-width",
		"stanza:type": "number",
		"stanza:default": 600,
		"stanza:description": "max width of iframe"
	},
	{
		"stanza:key": "--togostanza-iframe-min-height",
		"stanza:type": "number",
		"stanza:default": 600,
		"stanza:description": "min height of iframe"
	},
	{
		"stanza:key": "--togostanza-iframe-max-height",
		"stanza:type": "number",
		"stanza:default": 600,
		"stanza:description": "max height of iframe"
	}
],
	"stanza:incomingEvent": [
],
	"stanza:outgoingEvent": [
]
};

var templates = [
  ["stanza.html.hbs", {"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<select id=\"pdb_select_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias3,(depth0 != null ? lookupProperty(depth0,"structure") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":21,"column":2},"end":{"line":23,"column":11}}})) != null ? stack1 : "")
    + "</select>\n\n<select id=\"variant_select_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias3,(depth0 != null ? lookupProperty(depth0,"variant") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":27,"column":2},"end":{"line":29,"column":11}}})) != null ? stack1 : "")
    + "</select>\n<input type=\"checkbox\" id=\"variant_checkbox_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\">With clinical significance<br>\n\n<div id=\"pdb_div_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\">\n  <iframe src=\""
    + alias2(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias3,{"name":"url","hash":{},"data":data,"loc":{"start":{"line":34,"column":15},"end":{"line":34,"column":22}}}) : helper)))
    + "\" id=\"pdb_iframe_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\" width=\"800\" height=\"500\"></iframe>\n</div>\n<p class=\"pdb_info\" id=\"pdb_refine_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\"></p>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, alias1=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <option value=\""
    + alias1(container.lambda((depth0 != null ? lookupProperty(depth0,"pdb") : depth0), depth0))
    + "\">"
    + alias1(((helper = (helper = lookupProperty(helpers,"pdb") || (depth0 != null ? lookupProperty(depth0,"pdb") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"pdb","hash":{},"data":data,"loc":{"start":{"line":22,"column":31},"end":{"line":22,"column":38}}}) : helper)))
    + "</option>\n";
},"4":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=container.lambda, alias2=container.escapeExpression, alias3=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <option value=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"tgvid") : depth0), depth0))
    + "\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias3,(depth0 != null ? lookupProperty(depth0,"clinical_significance") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":32},"end":{"line":28,"column":106}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias3,(depth0 != null ? lookupProperty(depth0,"cs_class") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":106},"end":{"line":28,"column":167}}})) != null ? stack1 : "")
    + ">"
    + alias2(((helper = (helper = lookupProperty(helpers,"tgvid") || (depth0 != null ? lookupProperty(depth0,"tgvid") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias3,{"name":"tgvid","hash":{},"data":data,"loc":{"start":{"line":28,"column":168},"end":{"line":28,"column":177}}}) : helper)))
    + " "
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"label") : depth0), depth0))
    + ((stack1 = lookupProperty(helpers,"if").call(alias3,(depth0 != null ? lookupProperty(depth0,"clinical_significance") : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":192},"end":{"line":28,"column":264}}})) != null ? stack1 : "")
    + "</option>\n";
},"5":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return " class=\"cs_"
    + container.escapeExpression(container.lambda(((stack1 = (depths[1] != null ? lookupProperty(depths[1],"params") : depths[1])) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + "\"";
},"7":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return " "
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"clinical_significance") : depth0), depth0));
},"9":function(container,depth0,helpers,partials,data) {
    return "<p class=\"pdb_info\">No PDB</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<style>\n  # pdb_div_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + " {\n      width: auto;\n  }\n  #pdb_iframe_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + " {\n      width: 100%;\n      max-width: calc(var(--togostanza-iframe-max-width) * 1px);\n      min-height: calc(var(--togostanza-iframe-min-height) * 1px);\n      max-height: calc(var(--togostanza-iframe-max-height) * 1px);\n  }\n  #pdb_select_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + " {\n      max-width: 100px;\n  }\n  #variant_select_"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"params") : depth0)) != null ? lookupProperty(stack1,"hgnc_id") : stack1), depth0))
    + " {\n      max-width: calc((var(--togostanza-iframe-width) - 300) * 1px);\n  }\n</style>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"structure") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.program(9, data, 0, blockParams, depths),"data":data,"loc":{"start":{"line":19,"column":0},"end":{"line":39,"column":7}}})) != null ? stack1 : "")
    + "\n";
},"useData":true,"useDepths":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-protein-structure.js.map
