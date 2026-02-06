import Stanza from 'togostanza/stanza';

export default class JogoHaplotypeStructureMapping extends Stanza {
  async render() {

    this.renderTemplate(
      {
        template: 'loading.html.hbs',
        parameters: {}
      }
    );

    let uniprot = false;
    let haplotypes = {};
    
    // ensp to uniprot
    const ensp2uniprot = async (ensp) => {
      const uniparc_api = "https://rest.uniprot.org/uniparc/";
      const uniparcs = await fetch(uniparc_api + "search?size=10&query=" + ensp).then(res => res.json());
      let upis = [];
      if (uniparcs.results.length == 1) {
	upis = [uniparcs.results[0].uniParcId] || [false];
      } else { // 複数の UniParc が Hit した場合
	let count = 0;
	for (let d of uniparcs.results) {
          // UniProt entry が多い順
          if (d.uniProtKBAccessions?.length > count) {
            upis.unshift(d.uniParcId);
            count = d.uniProtKBAccessions.length;
          } else {
            upis.push(d.uniParcId);
          }    
	}
      }

      if (!upis[0]) return false;
      let uniprot = false;
      for (let upi of upis) {
	const uniparc = await fetch(uniparc_api + upi + "/?fields=upi%2Caccession%2Corganism_id").then(res => res.json());
	uniprot = false;
	let chk = 0;
	for (let d of uniparc.uniParcCrossReferences) {
	  if (d.active && d.database == "UniProtKB/Swiss-Prot" && d.organism.taxonId == 9606) {
	    uniprot = d.id;
	    console.log(uniprot);
	    chk++;
	  }
	  if (d.active && d.database == "Ensembl" && d.id == ensp) {
	    chk++;
	    console.log(d.id);
	  }
	  if (chk == 2) break;
	}
	if (uniprot) break;
      }
      return uniprot;
    }

    // construct molmil url
    const make_molmil_url = (positions, cif_url, turn_change) => {
      const sphere = this.root.querySelector("#molmil_mode_" + this.params.region_name)?.checked;
      const turn = this.root.querySelector("#molmil_turn_" + this.params.region_name)?.checked;
      const molmil = "https://sparql-support.dbcls.jp/molmil/#";
      const alphafold = cif_url.replace(".cif", ".pdb");
      let url = molmil + "load " + encodeURI(alphafold) + ";";
      url += "bg_color [120,120,120];";
      if (! sphere) {
        url += "cartoon_color [220,220,220], all;";
      } else {
	url += "show spheres, all; color [220,220,220], all;";
      }
      for (let pos of positions) {
	if (! sphere) {
	  url += "cartoon_color limegreen, resi " + pos + ";";
	  // url += label chain A and resi " + pos + ", " + pos +  ";";
	} else {
	  url += "color limegreen, resi " + pos + ";";
	}
      }
      if (turn_change) {
	if (turn) url += "turn y,0.1,1;";
	else url += "turn y,-0.1,1;";
      }
      return url;
    }

    // change haplotype
    const change_haplotype = (cif_url, turn_change) => {
      const id = this.root.querySelector("#haplotype_select_" + this.params.region_name).value;

      const url = make_molmil_url(haplotypes[id], cif_url, turn_change);

   //   if (! turn_change) {
	this.root.querySelector("#alphafold_iframe_" + this.params.region_name).setAttribute("src", url);
    /*  } else {
	// molmil の cookie の関係で iframe の src だけ変更するとラベルが表示できないので iframe を再描画
	const html = '<iframe src="' + url + '" id="alphafold_iframe_' + this.params.region_name + '""></iframe>';
	this.root.querySelector("#structure_div_" + this.params.region_name).innerHTML = html;
      }*/
    }

    // render error
    const render_error = () => {
       this.renderTemplate(
	{
          template: 'error.html.hbs',
	  parameters: {
	    error: "There is no AlphaFold data corresponding to the MANE select."
	  }
	}
      );
    }


    //=============================  
    // main
    //=============================
    
    // get jogo data
    const jogo_api = "https://jogo.csml.org/genicregion?format=json&sections=maneinfo,ahaplotypesummary,avariants&regionname=" + this.params.region_name;
    const jogo = await fetch(jogo_api).then(res => res.json());
    const ensp = jogo.maneinfo.ensembl_prot.replace(/\.\d+$/, "");
    
    // get uniprot id
    uniprot = await ensp2uniprot(ensp);
    //console.log(uniprot);

    if (!uniprot) {
      render_error();
      return false;
    }

    const json = await fetch("https://alphafold.ebi.ac.uk/api/uniprot/summary/" + uniprot + ".json").then(res => {
      if (!res.ok) {
	render_error();
	return false;
      } else {
	return res.json();
      }
    });
    
    const cif_url = json.structures[0].summary.model_url;
    
    if (!json.structures) {
      render_error(ensp);
      return false;
    }    

    // construct data
    jogo.ahaplotypesummary.forEach(d => {
      haplotypes[d.ahapid] = [];
    });
    jogo.avariants.forEach(d => {
      const pos = d.snpeff_aa_pos_length.replace(/\/\d+$/, "");
      d.ahapids.split(/,/).forEach(id => {
	haplotypes[id].push(pos);
      });
    });
    let haplotype_ids = jogo.ahaplotypesummary.map(d => { return {id: d.ahapid, count: haplotypes[d.ahapid].length}});
 
    // render
    let url = make_molmil_url(haplotypes[haplotype_ids[0].id], cif_url);
    this.renderTemplate(
      {
        template: 'stanza.html.hbs',
        parameters: {
	  params: this.params,
	  url: url,
          haplotypes: haplotype_ids
        }
      }
    );

    this.root.querySelector("#haplotype_select_" + this.params.region_name).addEventListener("change", e => { change_haplotype(cif_url); });
    this.root.querySelector("#molmil_mode_" + this.params.region_name).addEventListener("change", e => { change_haplotype(cif_url); });
    this.root.querySelector("#molmil_turn_" + this.params.region_name).addEventListener("change", e => { change_haplotype(cif_url, true); });
  }
}
