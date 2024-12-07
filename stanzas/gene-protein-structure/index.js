import Stanza from 'togostanza/stanza';

export default class GeneStructure extends Stanza {
  async render() {
    const togovar_api = encodeURI(location.protocol + "//" + location.hostname + "/api/search/variant");
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_pdb_mapping?hgnc_id=${this.params.hgnc_id}&togovar_api=${togovar_api}`);
    
    const res = await fetch(sparqlist, {method: "get", headers: {"Accept": "application/json"}}).then(res => res.json());
    
    const molmil = new URL("./assets/vendor/molmil/", import.meta.url) + "#";
    const colors = ["67,122,204", "204,67,149", "177,204,67", "67,204,204", "177,67,204", "204,149,67", "67,204,122", "94,67,204", "204,67,67", "95,204,67"];
    const colors_l = ["204,224,255", "255,204,235", "245,255,204", "204,255,255", "245,204,255", "255,235,204", "204,255,224", "214,204,255", "255,204,204", "214,255,204"];
    
    res.variant.unshift({id: "All variants with clinical significance", cs_class: true});
    res.variant.unshift({id: "Colouring by structure"});
    res.variant.unshift({id: "Colouring by molecule"});
    res.variant.unshift({id: "Colouring by gradient N- to C-term"});

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
	disabled[v.id] = true;
        if (v.id.match(/^Colouring by/) || v.id == "All variants with clinical significance" || pdb_j.pdb == "AlphaFold" || pdb_j.positions[v.position.toString()]) {
	  disabled[v.id] = false;
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
      const id = this.root.querySelector("#variant_select_" + this.params.hgnc_id).value;
      let pdb_j;
      let tgv_j;
      for (const p of res.structure) {
	if (p.pdb == pdb) {
	  pdb_j = p;
	  break;
	}
      }
      for (const v of res.variant) {
	if (v.id == id) {
	  tgv_j = v;
	  break;
	}
      }
      // molmil url 構築
      let url = molmil;
      if (pdb_j.pdb == "AlphaFold") url += "load " + encodeURI(pdb_j.url) + ";";
      else url += "fetch " + pdb + ";";
      if (tgv_j.id.match(/^Colouring by/)) {
	let type = "group";
	if (tgv_j.id.match(/structure/)) type = "structure";
	url += "bg_color white;cartoon_color white, all;";
	for (const [i, c] of pdb_j.chains.entries()) {
	  if (tgv_j.id.match(/molecule/)) type = "[" + colors[i % 10] + "]";
	  url += "cartoon_color " + type + ", chain " + c + ";";
	}
	url += "turn y,0.5,50;";
      } else {
	url += "bg_color [130,130,130];cartoon_color [160,160,160], all;";
	let resi =  tgv_j.position;
	if (pdb_j.pdb != "AlphaFold" && tgv_j.id != "All variants with clinical significance") resi = pdb_j.positions[tgv_j.position.toString()];
	let resi_all = [];
	for (let i = 0; i <= 8; i++) { resi_all[i] = []; } // 9 color types
	let resi_color = [];
	if (tgv_j.id == "All variants with clinical significance") {
	  for (const v of res.variant) {
	    if (v.sig) {
	      resi_all[v.color_num].push(v.position);
	      resi_color[v.color_num] = v.color;
	    }
	  }
	}
	for (const [i, c] of pdb_j.chains.entries()) {
	  let color = colors_l[i % 10];
	  url += "cartoon_color [" + color + "], chain " + c + ";";
	  if (tgv_j.id == "All variants with clinical significance") {
	    // 弱い significance から塗っていって、同一ポジションに Pathogenic などの強い significance があれば上塗り
	    for (let i = 8; i >= 0; i--) {
	      if (resi_all[i][0]) url += "cartoon_color [" + resi_color[i] + "], chain " + c + " and resi " + resi_all[i].join("+") + ";";
	    }
	    const resi = [...new Set(resi_all[0].concat(resi_all[1]).concat(resi_all[2]))];
	    url += "show sticks, chain " + c + " and resi " + resi.join("+") + ";";
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
