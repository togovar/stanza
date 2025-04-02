import Stanza from 'togostanza/stanza';

export default class JogoHaplotypeExplorer extends Stanza {
  async render() {

    //// variables
    const aa = {Gly: "G", Ala: "A", Leu: "L", Met: "M", Phe: "F", Trp: "W", Lys: "K", Gln: "Q", Glu: "E", Ser: "S", Pro: "P", Val: "V", Ile: "I", Cys: "C", Tyr: "Y", His: "H", Arg: "R", Asn: "N", Asp: "D", Thr: "T", Ter: "X"};
    
    const tgv_api = this.params.togovar_api + "?formatter=jogo";
    const tgv_bdy = '{"offset":#offset,"limit":#limit,"query":{"and":[{"gene":{"relation":"eq","terms":[#hgncid]}},{"or":[{"significance":{"relation":"eq","source":["mgend"],"terms":["P","LP","US","LB","B","DR","O","NP"]}},{"significance":{"relation":"eq","source":["clinvar"],"terms":["P","LP","PLP","LPLP","ERA","LRA","URA","US","LB","B","CI","DR","CS","RF","A","PR","AF","O","NP","AN"]}}]}]}}';
    let tgv_opt = {method: 'POST', headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}}

    let jogo_api = "https://jogo.csml.org/gene?format=json&&genename=" + this.params.symbol;
    let stanza_title = this.params.symbol;
    if (this.params.region_name.match(/chr.+_\d+_\d+/)) {
      jogo_api = "https://jogo.csml.org/genicregion?format=json&regionname=" + this.params.region_name;
      stanza_title = this.params.region_name;
    }
    if (this.params.hide_header == 1) stanza_title = false;
    const jogo_basic = {
      headers: {
	Authorization: "Basic " + btoa("nagalab:nagalab")
      }
    }

    let id_list = {};
    let popup_id2info = {};
    let popup_id2tgv = {};
    let hapid2var = {};
    let prev_order = {};


    //// construct html
    // make freq. color
    const make_freq_color = (count, total) => {
      return "rgb(127 0 255 / " + ((Math.log(count) + 0.5) / (Math.log(total) + 0.5)) + ")"
    }

    // make freq. graph html
    const make_freq_graph = (pop, rotate) => {
      let r = "";
      if (rotate) r = " r270deg";
      let html = "<ul class='freq_bar_graph" + r + "'>";
      let max = 0;
      for (const p of pop) {
	if (p.count > max) max = p.count;
      }
      for (const p of pop) {
	html += "<li class='freq_bar_li'><span class='freq_series'>" + p.label + "</span> <span class='freq_bar' style='width: calc(" + p.count + "/" + max + " * 50px)'></span> " + p.count + "</li>";
      }
      html += "</ul>";
      return html;
    }

    // make variant title html
    const make_var_title = (v) => {
      const chr_tmp = v.chr.replace(/^chr/, "");
      let ref_tmp = v.ref;
      let alt_tmp = v.alt;
      if (v.ref.length > 4) ref_tmp = v.ref[0] + v.ref[1] + v.ref[2] + "...";
      if (v.alt.length > 4) alt_tmp = v.alt[0] + v.alt[1] + v.alt[2] + "...";
      return "<span style='white-space: nowrap;'>chr<span class='chr'>" + chr_tmp + "</span> : " + v.pos + " <div class='ref-alt'><span class='ref' data-sum='" + v.ref.length + "'>" + ref_tmp + "</span><span class='arrow'></span><span class='alt' data-sum='" + v.alt.length + "'>" + alt_tmp + "<span></div></span>";
    }
    
    //// parse jogo json
    // get ids
    const ext_id_list = (hap_sum, id_name) => {
      let list = [];
      for (const d of hap_sum) {
	list.push({
	  id: d[id_name],
	  count: d.total,
	  pop: [
	    {label: "AFR", count: parseInt(d.AFR_total)},
	    {label: "AMR", count: parseInt(d.AMR_total)},
	    {label: "EAS", count: parseInt(d.EAS_total)},
	    {label: "EUR", count: parseInt(d.EUR_total)},
	    {label: "SAS", count: parseInt(d.SAS_total)}
	  ]
	});
      }
      return list;
    }

    // get variants
    const ext_variant = (hap_var, id_name, type, type_num, variant) => {
      for (const v of hap_var) {
	let id = {};
	for (const d of v[id_name].split(/,/)) {
	  id[d] = true;
	}
	let cons = v.snpeff_annotation.replace(/_/g, " ");
	cons = cons.charAt(0).toUpperCase() + cons.slice(1);
	let pop = [
	    {label: "AFR", count: 0},
	    {label: "AMR", count: 0},
	    {label: "EAS", count: 0},
	    {label: "EUR", count: 0},
	    {label: "SAS", count: 0}
	];
	for (const d of id_list.g) {
	  if (v.ghapids.match(d.id)) {
	    for (const [i ,p] of d.pop.entries()) {
	      pop[i].count += d.pop[i].count;
	    }
	  }
	}
	variant.push({
	  type: type,
	  type_num: type_num,
	  chr: v.chr,
	  pos: parseInt(v.pos),
	  ref: v.ref,
	  alt: v.alt,
	  cons: cons,
	  hgvsc: v.snpeff_hgvs_c,
	  hgvsp: v.snpeff_hgvs_p,
	  id: id,
	  count: v.haplotypeid_count,
	  pop: pop
	});
	popup_id2info[v.ref + v.pos + v.alt] = make_var_title(v) + "<br>" + cons + "<br>HGVSc: " + v.snpeff_hgvs_c;
	if (v.snpeff_hgvs_p) popup_id2info[v.ref + v.pos + v.alt] += "<br>HGVSp: " + v.snpeff_hgvs_p;
      }
      return variant;
    }

    //// construct haplotype data
    // check nucleotide by strand
    const chk_strand = (nt, strand) => {
      if (strand == "+") return nt;
      else if (nt == "A" || nt == "a") return "T";
      else if (nt == "C" || nt == "c") return "G";
      else if (nt == "G" || nt == "g") return "C";
      else if (nt == "T" || nt == "t") return "A";
    }

    // construct variant array of a haplotype
    const make_var_char = (id, num, strand, variant, amino) => {
      let array = [];
      for (const v of variant) {
	if (v.type_num < num) {
	  let char = ".";
	  let popup_id = "";
	  if (v.ref.length == 1) char = chk_strand(v.ref);
	  else if (v.hgvsc.match(/del/) && v.ref.length == 2) char = chk_strand(v.ref[1], strand);
	  if (amino) {
	    if (v.hgvsp.match(/p\.[A-Z][a-z]{2}\d+/)) char = aa[v.hgvsp.match(/([A-Z][a-z]{2})\d+/)[1]];
	    else if (v.hgvsp.match(/\*\d+/)) char = "*";
	  }
	  let type = "r";
	  if (v.id[id]
	      || v.id[id.replace(/:c\d+/, "")] || v.id[id.replace(/:t\d+/, "")] || v.id[id.replace(/:g\d+/, "")]
	      || v.id[id.replace(/:c\d+:t\d+/, "")] || v.id[id.replace(/:t\d+:g\d+/, "")]
	      || v.id[id.replace(/:c\d+:t\d+:g\d+/, "")]) {
	    char = "?";
	    if (amino) {
	      if (v.hgvsp.match(/\d+[A-Z][a-z]{2}/)) char = aa[v.hgvsp.match(/\d+([A-Z][a-z]{2})/)[1]];
	      else if (v.hgvsp.match(/\d+ins[A-Z]/)) char = "+";
	      else if (v.hgvsp.match(/\d+del/)) char = "-";
	      else if (v.hgvsp.match(/\d+dup/)) char = "d";
	      else if (v.hgvsp.match(/\d+fs/)) char = "f";
	      else if (v.hgvsp.match(/\d+\*/)) char = "*";
	    }
	    else if (v.hgvsc.match(/>/)) {
	      char = ">";
	      if (v.alt.length == 1) char = chk_strand(v.alt, strand);
	    }
	    else if (v.hgvsc.match(/ins/)) char = "+";
	    else if (v.hgvsc.match(/del/)) char = "-";
	    else if (v.hgvsc.match(/dup/)) char = "d";
	    type = v.type;
	    if (v.sig) type += "s";
	    popup_id = v.ref + v.pos.toString() + v.alt;
	  }
	  array.push({
	    char: char,
	    type: type,
	    popup_id: popup_id
	  });
	}
      }
      return array;
    }
    
    // construct hierarchical haplotype data (a > c > t > g)
    const construct_data = (d, num, child_hap, total, strand, variant, amino) => {
      const id_sub =  d.id.replace(/:/g, "_");
      const var_data = make_var_char(d.id, num, strand, variant, amino);
      let obj = {
	id: d.id,
	count: d.count,
	id_sub: id_sub,
	var_data: var_data,
	color: make_freq_color(d.count, total)
      };
      if (child_hap) obj.child_hap = child_hap;
      popup_id2info[d.id.replace(/:/g, "_")] = "<span class='hapid'>" + d.id + "</span><br>" + d.count + " / " + total + make_freq_graph(d.pop, true);
      hapid2var[d.id] = var_data;
      return obj;
    }

    //// make DOMs for sort view
    // add event to vaiant
    const add_var_event = (el) => {
      el.addEventListener("mouseover", (e) => {
	const popup_id = e.target.getAttribute("popup_id");
	const root_el = this.root.querySelector("main");
	const popup_el = this.root.querySelector("#popup");
	popup_el.innerHTML = popup_id2info[popup_id];
	popup_el.style.display = "block";
	popup_el.style.top = (parseInt(e.target.offsetTop - root_el.scrollTop) + 20) + "px";
	popup_el.style.left = (parseInt(e.target.offsetLeft - root_el.scrollLeft) + 30) + "px"; // popup on the right
	if (root_el.offsetWidth < popup_el.offsetWidth + e.target.offsetLeft - root_el.scrollLeft + 30) {
	  popup_el.style.left = (parseInt(e.target.offsetLeft - root_el.scrollLeft - popup_el.offsetWidth) - 20) + "px"; // popup on the left
	}
      })
      el.addEventListener("mouseout", (e) => {
	this.root.querySelector("#popup").style.display = "none";
      })
      el.addEventListener("click", async (e) => {
	const popup_id = e.target.getAttribute("popup_id");
	if (popup_id2tgv[popup_id]) {
	  if (popup_id2tgv[popup_id] == "NF") {
	    this.root.querySelector("#popup").innerHTML = popup_id2info[popup_id];
	  } else {
	    window.open("https://grch38.togovar.org/variant/" + popup_id2tgv[popup_id], "jogo_tgv");
	  }
	} else if (popup_id.match(/[A-Z]+\d+[A-Z]+$/)) {
	  let [, ref, pos, alt] = popup_id.match(/([A-Z]+)(\d+)([A-Z]+)/);
	  if (ref[0] == alt[0]) {
	    ref = ref.slice(1);
	    alt = alt.slice(1);
	    pos++;
	  }
	  tgv_opt.body = '{"offset":0,"query":{"location":{"chromosome":"' + chr + '","position":' + pos + '}}}'
	  const togovar = await fetch(tgv_api, tgv_opt).then(res => res.json());
	  let f = true;
	  if (togovar.data) {
	    for (const v of togovar.data) {
	      if (v.reference == ref && v.alternate == alt) {
		if (v.id) {
		  window.open("https://grch38.togovar.org/variant/" + v.id, "jogo_tgv");
		  popup_id2tgv[popup_id] = v.id;
		  popup_id2info[popup_id] = "TogoVar: " + v.id + "<br>" + popup_id2info[popup_id];
		  f = false;
		  break;
		}
	      }
	    }
	  } else if (togovar.error) {
	    this.root.querySelector("#popup").innerHTML = "<span class='c_a'>API error</span><br>" + popup_id2info[popup_id];
	    f = false;
	  }
	  if (f) {
	    popup_id2tgv[popup_id] = "NF";
	    popup_id2info[popup_id] = "TogoVar: <span class='c_c'>Not found</span><br>" + popup_id2info[popup_id];
	    this.root.querySelector("#popup").innerHTML = popup_id2info[popup_id];
	  }
	}
      })
    };

    // sort same level haplotype (id)
    const sort_hapid = (mode, id_sub) => {
      let list = id_list[mode];
      let hapid = [];
      for (const cmp of list) {
	const cmp_ids = cmp.id.split(/:/);
	let display = true;
	for (let i = 0; i < cmp_ids.length - 1; i++) {
	  let tmp_arr = [];
	  for (let j = 0; j <= i; j++) {
	    tmp_arr.push(cmp_ids[j]);
	  }
	  if (this.root.querySelector("#" + tmp_arr.join("_") + "_chld").style.display == "none") {
	    display = false;
	    break;
	  }
	}
	if (! display) continue;
	let match = 0;
	if (id_sub) {
	  const id = id_sub.replace(/_/g, ":");
	  for (const [i, d] of hapid2var[cmp.id].entries()) {
	    if (d.type == hapid2var[id][i].type) match++;
	  }
	}
	hapid.push({
	  id : cmp.id,
	  match: match
	})
      }
      if (id_sub) return hapid.sort((a, b) => b.match - a.match);
      this.root.querySelectorAll(".var_freq_li").forEach((el) => {
	el.style.display = "none";
      })
      this.root.querySelector("#" + mode + "_freq_li").style.display = "block";
      return hapid;
    }

    // sort animation
    const sort_animation = (list, id_sub) => {
      const sort_div = this.root.querySelector("#sort_ul");
      sort_div.querySelectorAll("li").forEach((el) => {
	el.style.position = "relative";
      })
      let count = 0;
      const frame = 25;
      const intervalID = setInterval(
	() => {
	  count++;
	  const sort_div = this.root.querySelector("#sort_ul");
	  for (const [i, d] of list.entries()) {
	    const id = d.id.replace(/:/g, "_")
	    const dist = prev_order.end[i] - prev_order.dom[id].start;
	    const unit = dist / frame;
	    prev_order.dom[id].top += unit;
	    if (count >= frame) prev_order.dom[id].top = dist;
	    const el = sort_div.querySelector("#" + id + "_li_clone");
	    el.style.top = prev_order.dom[id].top + "px";
	  }
	  if (count == frame + 1) {
	    sort_li(list, id_sub);
	    clearInterval(intervalID);
	  }
	}, 20);
    }

    // sort same level haplotype (viewer)
    const sort_li = (list, id_sub) => {
      let sort_div = this.root.querySelector("#sort_ul");
      sort_div.innerHTML = "";
      for (const d of list) {
	sort_div.appendChild(this.root.querySelector("#" + d.id.replace(/:/g, "_")  + "_li").cloneNode(true));
      }
      sort_div.querySelectorAll("li").forEach((el) => {
	const id_sub = el.id.replace(/_li/, "");
	const id_span = el.querySelector("#" + id_sub);
	id_span.addEventListener("click", (e) => {
	  const id_sub = e.target.id;
	  window.open("https://jogo.csml.org/haplotype_detail?regionname=" + region + "&hapid=" + id_sub.replace(/_/g, "%3A"));
	})
	const button = el.querySelector("#" + id_sub + "_button");
	button.classList.remove("opened_button");
	button.classList.remove("no_button");
	button.classList.add("open_button");
	button.classList.add("sort_button");
	button.setAttribute("title", "sort");
	button.addEventListener("click", (e) => {
	  const mode = this.root.querySelector("input:checked[name=mode]").value;
	  const id_sub = e.target.id.replace(/_button/, "");
	  const list = sort_hapid(mode, id_sub);
	  sort_animation(list, id_sub);
	})
	el.id = el.id + "_clone";
      })
      sort_div.querySelectorAll(".popup").forEach(el => {
	add_var_event(el);
      })
      sort_div.style.display = "block";
      this.root.querySelector("#root_ul").style.display = "none";
      prev_order.end = [];
      prev_order.dom = {};
      for (const d of list) {
	const top = sort_div.querySelector("#" + d.id.replace(/:/g, "_") + "_li_clone").offsetTop;
	prev_order.dom[d.id.replace(/:/g, "_")] = {start: top, top: 0};
	prev_order.end.push(top);
      }
    }

    const add_var_freq  = (num, v, total, var_freq) => {
      for (let i = num; i < 4; i++) {
	var_freq[i].var_data.push({
	  count: v.count,
	  color: make_freq_color(v.count, total),
	  popup_id: v.ref + v.pos + v.alt + "_f"
	})
      }
    }

    ////// main
    // paese html
    const jogo_json = await fetch(jogo_api, jogo_basic).then(res => res.json());
    // console.log(jogo_json);
    const hgncid = jogo_json.maneinfo.hgncid;
    const chr    = jogo_json.maneinfo.chr.replace(/^chr/, "");
    const strand = jogo_json.maneinfo.strand;
    const region = jogo_json.maneinfo.regionname5000;
    let variant = [];
    
    id_list.a = ext_id_list(jogo_json.ahaplotypesummary, "ahapid");
    id_list.c = ext_id_list(jogo_json.chaplotypesummary, "chapid");
    id_list.t = ext_id_list(jogo_json.thaplotypesummary, "thapid");
    id_list.g = ext_id_list(jogo_json.ghaplotypesummary, "ghapid");

    variant = ext_variant(jogo_json.avariants, "ahapids", "a", 0, variant);
    variant = ext_variant(jogo_json.cvariants, "chapids", "c", 1, variant);
    variant = ext_variant(jogo_json.tvariants, "thapids", "t", 2, variant);
    variant = ext_variant(jogo_json.gvariants, "ghapids", "g", 3, variant);

    const total = id_list.a.reduce((a, c) => a + c.count, 0);

    // sort variants arong the gene strand
    if (strand == "+") {
      variant = variant.sort((a,b) => a.pos - b.pos);
    } else {
      variant = variant.sort((a,b) => b.pos - a.pos);
    }

    //construct variant frequency data
    let var_freq = [
      {level: "a", space : "     ", var_data: []},
      {level: "c", space : "           ", var_data: []},
      {level: "t", space : "                 ", var_data: []},
      {level: "g", space : "                       ", var_data: []}
    ];
    for (const v of variant) {
      if (v.type == "a") add_var_freq(0, v, total, var_freq);
      else if (v.type == "c") add_var_freq(1, v, total, var_freq);
      else if (v.type == "t") add_var_freq(2, v, total, var_freq);
      else if (v.type == "g") add_var_freq(3, v, total, var_freq);
      popup_id2info[v.ref + v.pos + v.alt + "_f"] = make_var_title(v) + "<br>" + v.count + " / " + total + make_freq_graph(v.pop, false);
    }
      
    // add clinical significance
    let filtered = false;
    const limit = 1000;
    let offset = 0;
    let count = 0;
    let clin_sig = {};
    while (!filtered || filtered > count) {
      tgv_opt.body = tgv_bdy.replace(/#hgncid/, hgncid).replace(/#offset/, offset).replace(/#limit/, limit);
      const togovar = await fetch(tgv_api, tgv_opt).then(res => res.json());
      if (togovar.statistics) filtered = togovar.statistics.filtered;
      else filtered = 1; // for 'formatter=jogo' option in TogoVar API (w/o offset-limit scroll)
      if (togovar.data) {
	for (const d of togovar.data) {
	  clin_sig[ d.reference + d.position + d.alternate] = d.significance;
	}
      }
      offset = '["' + togovar.data[togovar.data.length - 1].chromosome + '","' + togovar.data[togovar.data.length - 1].position + '","' + togovar.data[togovar.data.length - 1].reference + '","' + togovar.data[togovar.data.length - 1].alternate + '"]';
      count += limit;
    }
    for (let i = 0; i < variant.length; i++) {
      const v =  variant[i].ref + variant[i].pos + variant[i].alt;
      if (clin_sig[v]) {
	variant[i].sig = clin_sig[v];
	let sigs = [];
	clin_sig[v].forEach(d => {
	  const sig_ico = " <span class='clinical-significance' data-sign='" + d.interpretations[0] + "'></span> ";
	  //let mgend_ico = "";
	  //if (d.source == "mgend") mgend_ico = " <span class='icon' data-remains='1' data-mgend='true'></span> ";
	  for (const c of d.conditions) {
	    //sigs.push(sig_ico + c.name + mgend_ico);
	    sigs.push(sig_ico + c.name);
	  }
	})
	const uniq = Array.from(new Set(sigs));
	popup_id2info[v] += "<br>Clinical significance:<br>" + uniq.join("<br>");
      }
    }

    // construct hap data
    let a_hap = [];
    for (const a of id_list.a) {
      let c_hap = [];
      for (const c of id_list.c) {
	let t_hap = [];
	for (const t of id_list.t) {
	  let g_hap = [];
	  for (const g of id_list.g) {
	    const ids = g.id.split(/:/);
	    if (ids[0] != a.id || ids[0] + ":" + ids[1] != c.id || ids[0] + ":" + ids[1] + ":" + ids[2] != t.id) continue;
	    g_hap.push(construct_data(g, 4, false, total, strand, variant, false));
	  }
	  const ids = t.id.split(/:/);
	  if (ids[0] != a.id || ids[0] + ":" + ids[1] != c.id) continue;
	  t_hap.push(construct_data(t, 3, g_hap, total, strand, variant, false));
	}
	const ids = c.id.split(/:/);
	if (ids[0] != a.id) continue;
	c_hap.push(construct_data(c, 2, t_hap, total, strand, variant, false));
      }
      a_hap.push(construct_data(a, 1, c_hap, total, strand, variant, true));
    }	
    
    //console.log(a_hap);
    //console.log(popup_id2info);
    //console.log(hapid2var);

    // render
    this.renderTemplate(
      {
        template: 'stanza.html.hbs',
        parameters: {
	  title: stanza_title,
	  hap: a_hap,
	  var_freq: var_freq
        }
      }
    );

    //// event listener
    // check display
    const chk_radio_display = () => {
      this.root.querySelector("#r_c").disabled = true;
      this.root.querySelector("#r_t").disabled = true;
      this.root.querySelector("#r_g").disabled = true;
      this.root.querySelector("#r_c_label").classList.add("c_na");
      this.root.querySelector("#r_g_label").classList.add("c_na");
      this.root.querySelector("#r_t_label").classList.add("c_na");
      for (const el of this.root.querySelectorAll(".a_chld")) {
	if (el.style.display != "none") {
	  this.root.querySelector("#r_c").disabled = false;
	  this.root.querySelector("#r_c_label").classList.remove("c_na");
	  break;
	}
      }
      for (const el of this.root.querySelectorAll(".c_chld")) {
	if (el.style.display != "none"
	    && this.root.querySelector("#" + el.id.replace(/_c\d+/, "")).style.display != "none") {
	  this.root.querySelector("#r_t").disabled = false;
	  this.root.querySelector("#r_t_label").classList.remove("c_na");
	  break;
	}
      }
      for (const el of this.root.querySelectorAll(".t_chld")) {
	if (el.style.display != "none"
	    && this.root.querySelector("#" + el.id.replace(/_t\d+/, "")).style.display != "none"
	    && this.root.querySelector("#" + el.id.replace(/_c\d+_t\d+/, "")).style.display != "none") {
	  this.root.querySelector("#r_g").disabled = false;
	  this.root.querySelector("#r_g_label").classList.remove("c_na");
	  break;
	}
      }
    }
    
    chk_radio_display();
    
    // open / close child level haplotype
    this.root.querySelectorAll(".open_button").forEach((el) => {
      el.setAttribute("title", "open");
      el.addEventListener("click", (e) => {
	const id_sub = e.target.id.replace(/_button/, "");
	const mode = this.root.querySelector("input:checked[name=mode]").value;
	const child = this.root.querySelector("#" + id_sub + "_chld");
	if (child.style.display == "block") child.style.display = "none";
	else child.style.display = "block";
	if (el.classList.contains("opened_button")) {
	  el.classList.remove("opened_button");
	  el.setAttribute("title", "open");
	} else {
	  el.classList.add("opened_button");
	  el.setAttribute("title", "close");
	}
	chk_radio_display();
      })
    });
    this.root.querySelectorAll(".hapid").forEach((el) => {
      el.addEventListener("click", (e) => {
	const id_sub = e.target.id;
	window.open("https://jogo.csml.org/haplotype_detail?regionname=" + region + "&hapid=" + id_sub.replace(/_/g, "%3A"));
      })
    });
    // change mode (all, amino acid, coding, transcript, genebody)
    this.root.querySelector("#show_all").addEventListener("click", () => {
      this.root.querySelectorAll("li").forEach(el => {el.style.display = "block";})
      this.root.querySelectorAll("ul").forEach(el => {el.style.padding = "0px 0px 0px 20px";})
      this.root.querySelector("#sort_ul").style.display = "none";
      this.root.querySelector("#root_ul").style.display = "block";
      this.root.querySelector("#r_all").checked = true;
      this.root.querySelectorAll(".var_freq_li").forEach((el) => {
	el.style.display = "none";
      })
      
    });
    this.root.querySelector("#show_a").addEventListener("click", () => {
      this.root.querySelector("#r_a").checked = true;
      const mode = this.root.querySelector("input:checked[name=mode]").value;
      const list = sort_hapid(mode, false);
      sort_li(list, false);
    });
    this.root.querySelector("#show_c").addEventListener("click", () => {
      if (this.root.querySelector("#r_c").disabled != true) {
	this.root.querySelector("#r_c").checked = true;
	const mode = this.root.querySelector("input:checked[name=mode]").value;
	const list = sort_hapid(mode, false);
	sort_li(list, false);
      }
    });
    this.root.querySelector("#show_t").addEventListener("click", () => {
      if (this.root.querySelector("#r_t").disabled != true) {
	this.root.querySelector("#r_t").checked = true;
	const mode = this.root.querySelector("input:checked[name=mode]").value;
	const list = sort_hapid(mode, false);
	sort_li(list, false);
      }
    });
    this.root.querySelector("#show_g").addEventListener("click", () => {
      if (this.root.querySelector("#r_g").disabled != true) {
	this.root.querySelector("#r_g").checked = true;
	const mode = this.root.querySelector("input:checked[name=mode]").value;
	const list = sort_hapid(mode, false);
	sort_li(list, false);
      }
    });
    // open all level
    this.root.querySelector("#open_all").addEventListener("click", () => {
      this.root.querySelectorAll("ul").forEach(el => {el.style.display = "block";})
      this.root.querySelectorAll("li").forEach(el => {el.style.display = "block";})
      this.root.querySelector("#sort_ul").style.display = "none";
      this.root.querySelector("#root_ul").style.display = "block";
      this.root.querySelector("#r_all").checked = true;
      this.root.querySelectorAll(".var_freq_li").forEach((el) => {
	el.style.display = "none";
      })
      this.root.querySelectorAll(".open_button").forEach((el) => {
	el.classList.add("opened_button");
	el.setAttribute("title", "close");
      })
      chk_radio_display();
    });
    // reset
    this.root.querySelector("#reset").addEventListener("click", () => {
      this.root.querySelectorAll("ul").forEach(el => {el.style.display = "none";})
      this.root.querySelectorAll("li").forEach(el => {el.style.display = "block";})
      this.root.querySelector("#root_ul").style.display = "block";
      this.root.querySelector("#sort_ul").style.display = "none";
      this.root.querySelector("#root_ul").style.display = "block";
      this.root.querySelector("#var_freq").style.display = "block";
      this.root.querySelector("#r_all").checked = true;
      this.root.querySelectorAll(".var_freq_li").forEach((el) => {
	el.style.display = "none";
      })
      this.root.querySelectorAll(".open_button").forEach((el) => {
	el.classList.remove("opened_button");
	el.setAttribute("title", "open");
      })
      chk_radio_display();
    });
    // variant event
    this.root.querySelectorAll(".popup").forEach((el) => {
      add_var_event(el);
    });	
  }
}
