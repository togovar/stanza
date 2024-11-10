import Stanza from 'togostanza/stanza';

export default class GeneStructure extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_pdb_mapping?hgnc_id=${this.params.hgnc_id}`);
    
    const res = await fetch(sparqlist, {method: "get", headers: {"Accept": "application/json"}}).then(res => res.json());
    
    //const molmil= "https://pdbj.org/molmil2/#";  // 本家
    //const molmil = "https://sparql-support.dbcls.jp/molmil/#";  // 開発
    const molmil = (this.params?.molmil || "https://sparql-support.dbcls.jp/molmil/") + "#";
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
    url += "turn y,0.5,50;"
    
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
    }

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
    }
    
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
    }

    const change_var_select = (e) => {
      if (e.target.checked) {
	this.root.querySelector("#variant_select_" + this.params.hgnc_id).querySelectorAll("option").forEach(e => e.style.display = "none");
	this.root.querySelectorAll(".cs_" + this.params.hgnc_id).forEach(e => e.style.display = "block");
      } else {
	this.root.querySelector("#variant_select_" + this.params.hgnc_id).querySelectorAll("option").forEach(e => e.style.display = "block");	
      }
    }

    change_tgv(res.structure[0]);
    pdb_refine_text(res.structure[0]);

    this.root.querySelector("#pdb_select_" + this.params.hgnc_id).addEventListener("change", e => { change_view(true);})
    this.root.querySelector("#variant_select_" + this.params.hgnc_id).addEventListener("change", e => { change_view(false); })
    this.root.querySelector("#variant_checkbox_" + this.params.hgnc_id).addEventListener("change", e => { change_var_select(e); })
  }
}
