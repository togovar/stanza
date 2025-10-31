import Stanza from 'togostanza/stanza';

export default class JogoHaplotypeExplorer extends Stanza {
  async render() {
    
    //=============================================================
    //// variables
    const aa = {Gly: "G", Ala: "A", Leu: "L", Met: "M", Phe: "F", Trp: "W", Lys: "K", Gln: "Q", Glu: "E", Ser: "S", Pro: "P", Val: "V", Ile: "I", Cys: "C", Tyr: "Y", His: "H", Arg: "R", Asn: "N", Asp: "D", Thr: "T", Ter: "X"};
    
    const tgv_api = this.params.togovar_api + "?formatter=jogo";
    const tgv_bdy = '{"offset":#offset,"limit":#limit,"query":{"and":[{"gene":{"relation":"eq","terms":[#hgncid]}},{"or":[{"significance":{"relation":"eq","source":["mgend"],"terms":["P","LP","US","LB","B","DR","O","NP"]}},{"significance":{"relation":"eq","source":["clinvar"],"terms":["P","LP","PLP","LPLP","ERA","LRA","URA","US","LB","B","CI","DR","CS","RF","A","PR","AF","O","NP","AN"]}}]}]}}';
    let tgv_opt = {method: 'POST', headers: {'Accept': 'application/json', 'Content-Type': 'application/json'}};

    let jogo_api = "https://jogo.csml.org/gene?format=json&&genename=" + this.params.symbol;
    let stanza_title = this.params.symbol;
    if (this.params.region_name.match(/chr.+_\d+_\d+/)) {
      jogo_api = "https://jogo.csml.org/genicregion?format=json&sections=maneinfo,ahaplotypesummary,chaplotypesummary,thaplotypesummary,ghaplotypesummary,achaplotypesummary,acthaplotypesummary,actghaplotypesummary,avariants,cvariants,tvariants,gvariants&regionname=" + this.params.region_name;
      stanza_title = this.params.region_name;
    }
    if (this.params.hide_header == 1) stanza_title = false;
   // if (window.location.hostname == "sparql-support.dbcls.jp") jogo_api = "https://sparql-support.dbcls.jp/api/jogo_api?url=" + encodeURIComponent(jogo_api);


    let symbol = this.params.symbol;
    if (this.params.region_name) symbol = this.params.region_name.match(/^([^_]+)_/)[1];
    const togoid_api = "https://api.togoid.dbcls.jp/convert?route=hgnc_symbol%2CTIO_000022%2Chgnc&report=target&format=json&ids=" + symbol;

    const init_search_ids = this.params.search_ids;
    const init_highlight_ids = this.params.highlight_ids;
    const init_highlight_positions = this.params.highlight_positions;
    const togovar_url = "https://togovar.org/variant/";
    const dbsnp_url = "https://www.ncbi.nlm.nih.gov/snp/";
    let init_level = this.params.level;
    if (!init_level) init_level = "act";
    
    
    let id_list = {};
    let popup_id2title = {};
    let popup_id2info = {};
    let popup_id2tgv = {};
    let popup_id_current = false;
    let hapid2var = {};
    let prev_order = {};

    //=============================================================
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

    //=============================================================
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
	  id[d.match(/([a-z]\d{4})$/)[1]] = true;
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
	for (const d of id_list.actg) {
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
	popup_id2title[v.ref + v.pos + v.alt] = make_var_title(v) + "<br>";
	popup_id2info[v.ref + v.pos + v.alt] = cons + "<br>HGVSc: " + v.snpeff_hgvs_c;
	if (v.snpeff_hgvs_p) popup_id2info[v.ref + v.pos + v.alt] += "<br>HGVSp: " + v.snpeff_hgvs_p;
      }
      return variant;
    }

    //=============================================================
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
    const make_var_char = (id, min, max, strand, variant, amino) => {
      let array = [];
      let ii = 0;
      for (const v of variant) {
	if (min <= v.type_num && v.type_num <= max) {
	  let char = ".";
	  let popup_id = "";
	  if (v.ref.length == 1) char = chk_strand(v.ref, strand);
	  else if (v.hgvsc.match(/del/) && v.ref.length == 2) char = chk_strand(v.ref[1], strand);
	  if (amino) {
	    if (v.hgvsp.match(/p\.[A-Z][a-z]{2}\d+/)) char = aa[v.hgvsp.match(/([A-Z][a-z]{2})\d+/)[1]];
	    else if (v.hgvsp.match(/\*\d+/)) char = "*";
	  }
	  let type = "r";
	  let flag = false;
	  for (const d of Object.keys(v.id)) {
	    if (id.match(d)) {
	      flag = true;
	      break;
	    }
	  }
	  if (flag) { //v.id[id]) {
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
	    popup_id = v.ref + v.pos.toString() + v.alt;
	  }
	  array.push({
	    char: char,
	    type: type == "r" ? false : type,
//	    significance: v.sig ? true : false,
	    popup_id: popup_id,
	  });
	}
	ii++;
      }
      return array;
    }
    
    // construct hierarchical haplotype data (a > c > t > g)
    const construct_data = (d, min, max, total, strand, variant, mode, amino) => {
      const var_data = make_var_char(d.id, min, max, strand, variant, amino);
      let obj = {
	id: d.id,
	mode: mode,
	count: d.count,
	var_data: var_data,
	color: make_freq_color(d.count, total)
      };
      popup_id2title[d.id] = "<span class='hapid'>" + d.id + "</span><br>";
      popup_id2info[d.id] = d.count + " / " + total + make_freq_graph(d.pop, true);
      hapid2var[d.id] = var_data;
      return obj;
    }

    //=============================================================
    //// make DOMs for sort view    
    // clinical significance の無い varitn の TogoVar 情報を追加取得
    const get_additional_tgv = async (popup_id, popup_el) => {
      let [, ref, pos, alt] = popup_id.match(/([A-Z]+)(\d+)([A-Z]+)/);
      if (ref[0] == alt[0]) {
	ref = ref.slice(1);
	alt = alt.slice(1);
	pos++;
      }
      tgv_opt.body = '{"offset":0,"query":{"location":{"chromosome":"' + chr + '","position":' + pos + '}}}'
      const togovar = await fetch(tgv_api, tgv_opt).then(res => res.json());
      let f = true;
      let error = "";
      if (togovar.data) {
	for (const v of togovar.data) {
	  if (v.reference == ref && v.alternate == alt) {
	    if (v.existing_variations) {
	      const rss = v.existing_variations.map(rs => "<a href='" + dbsnp_url + rs + "' target='" + rs + "'>" + rs + "</a>");
	      popup_id2info[popup_id] = "dbSNP: " + rss.join(", ") + "<br>" + popup_id2info[popup_id];
	    }
	    if (v.id) {
	      popup_id2tgv[popup_id] = v.id;
	      popup_id2info[popup_id] = "TogoVar: <a href='" + togovar_url + v.id + "' target='" + v.id + "'>" + v.id + "</a><br>" + popup_id2info[popup_id];
	      f = false;
	      break;
	    }
	  }
	}
      } else if (togovar.error) {
	error = "<span class='c_a'>API error</span><br>";
	f = false;
      }
      if (f) {
	popup_id2tgv[popup_id] = "NF";
	popup_id2info[popup_id] = "TogoVar: <span class='c_c'>Not found</span><br>" + popup_id2info[popup_id];
      }
      if (popup_id_current == popup_id) popup_el.innerHTML = popup_id2title[popup_id] + error + popup_id2info[popup_id];     
    }
    
    // add event to vaiant
    const add_var_event = (el) => {
      el.addEventListener("mouseover", (e) => {
	const popup_id = e.target.getAttribute("popup_id");
	popup_id_current = popup_id;
	const root_el  = this.root.querySelector("main");
	const view_el  = this.root.querySelector("#haplotype_view");
	const scroll_el  = this.root.querySelector("#haplotype_view_scroll");
	const popup_el = this.root.querySelector("#popup");
	const scale = view_el.scale ? parseFloat(view_el.scale) : 1;
	const headerHeight = view_el.offsetTop - root_el.offsetTop;
	popup_el.innerHTML = popup_id2title[popup_id] + popup_id2info[popup_id];
	popup_el.classList.remove("hidden");
	const scroll_rect = scroll_el.getBoundingClientRect();
	const target_rect = e.target.getBoundingClientRect();
	const target_offset_top = target_rect.top - scroll_rect.top;
	const target_offset_left = target_rect.left - scroll_rect.left;
	const popup_top = parseInt(target_offset_top + headerHeight) + 20;
	const popup_left = parseInt(target_offset_left) + 30;
	const scroll_top = popup_el.offsetHeight + target_offset_top - root_el.scrollTop + 30;
	const scroll_left = popup_el.offsetWidth + target_offset_left - root_el.scrollLeft + 30;
	//console.log([popup_top, popup_left]);
	popup_el.style.top = popup_top + "px";  // popup on the bottom
	popup_el.style.left = popup_left + "px"; // popup on the right
	if (popup_top > 200 && root_el.offsetHeight < scroll_top) {
	  let top = parseInt(target_offset_top - popup_el.offsetHeight) - 20;
	  if (top < 0) top = 10;
	  popup_el.style.top = top + "px"; // popup on the upper
	}
	if (popup_left > 300 && root_el.offsetWidth < scroll_left) {
	  popup_el.style.left = (parseInt(target_offset_left - popup_el.offsetWidth) - 20) + "px"; // popup on the left
	}
	if (!popup_id2tgv[popup_id] && popup_id.match(/[A-Z]+\d+[A-Z]+$/)) {
	  popup_id2tgv[popup_id] = "-";
	  get_additional_tgv(popup_id, popup_el);
	}	  
      })
      el.addEventListener("click", async (e) => {
	const popup_id = e.target.getAttribute("popup_id");
	if (popup_id2tgv[popup_id]) {
	  if (popup_id2tgv[popup_id] == "NF") {
	    this.root.querySelector("#popup").innerHTML = popup_id2title[popup_id] + popup_id2info[popup_id];
	  } else {
	    window.open(togovar_url + popup_id2tgv[popup_id], popup_id2tgv[popup_id]);
	  }
	}
      })
    };

    // sort same level haplotype (id)
    const sort_hapid = (mode, id) => {
      let list = id_list[mode];
      let hapid = [];
      for (const cmp of list) {
	let match = 0;
	if (id) {
	  for (const [i, d] of hapid2var[cmp.id].entries()) {
	    if (d.type == hapid2var[id][i].type) match++;
	  }
	}
	hapid.push({
	  id : cmp.id,
	  match: match
	})
      }
      if (id) return hapid.sort((a, b) => b.match - a.match);
      this.root.querySelectorAll(".level_mode_li").forEach((el) => {
	el.classList.add("hidden");
      })
      this.root.querySelectorAll("." + mode + "_level_mode_li").forEach((el) => {
	el.classList.remove("hidden");
      })
      return hapid;
    }

    // sort animation
    const sort_animation = (list, id) => {
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
	    const id = d.id;
	    const dist = prev_order.end[i] - prev_order.dom[id].start;
	    const unit = dist / frame;
	    prev_order.dom[id].top += unit;
	    if (count >= frame) prev_order.dom[id].top = dist;
	    const el = sort_div.querySelector("#" + id + "_li_clone");
	    el.style.top = prev_order.dom[id].top + "px";
	  }
	  if (count == frame + 1) {
	    sort_li(list, id);
	    clearInterval(intervalID);
	  }
	}, 20);
    }

    // sort same level haplotype (viewer)
    const sort_li = (list, id, remove_button) => {
      let sort_div = this.root.querySelector("#sort_ul");
      sort_div.innerHTML = "";
      for (const d of list) {
	sort_div.appendChild(this.root.querySelector("#" + d.id  + "_li").cloneNode(true));
      }
      sort_div.querySelectorAll("li").forEach((el) => {
	const id = el.id.replace(/_li/, "");
	const id_span = el.querySelector("#" + id);
	id_span.addEventListener("click", (e) => {
	  const id = e.target.id;
	  window.open("https://jogo.csml.org/haplotype_detail?regionname=" + region + "&hapid=" + id);
	})
	const button = el.querySelector("#" + id + "_button");
	button.classList.remove("opened_button");
	button.classList.remove("no_button");
	button.classList.add("open_button");
	button.classList.add("sort_button");
	if (remove_button) {
	  button.classList.remove("open_button");
	  button.classList.remove("sort_button");
	  button.classList.add("no_button");
	}
	button.setAttribute("title", "sort");
	button.addEventListener("click", (e) => {
	  const mode = this.root.querySelector("input:checked[name=mode]").value;
	  const id = e.target.id.replace(/_button/, "");
	  const list = sort_hapid(mode, id);
	  sort_animation(list, id);
	})
	el.id = el.id + "_clone";
      })
      sort_div.querySelectorAll(".popup").forEach(el => {
	add_var_event(el);
      })
      sort_div.classList.remove("hidden");
      this.root.querySelector("#root_ul").classList.add("hidden");
      prev_order.end = [];
      prev_order.dom = {};
      for (const d of list) {
	const top = sort_div.querySelector("#" + d.id + "_li_clone").offsetTop;
	prev_order.dom[d.id] = {start: top, top: 0};
	prev_order.end.push(top);
      }
    }

    const add_var_freq  = (min, max, level, v, total, var_freq) => {
      for (let i = min; i <= max; i++) {
	var_freq[i].var_data.push({
	  count: v.count,
	  color: make_freq_color(v.count, total),
	  popup_id: v.ref + v.pos + v.alt + "_f",
	  level: level,
	  pos: v.pos
	})
      }
    }

    //=============================================================						   
    //// Event listener
    //
    // attribute change event
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
	if (m.attributeName == "set_search_ids") {
	  this.root.querySelector("#search_ids").value = m.target.getAttribute("set_search_ids");
	}
	if (m.attributeName == "set_level") {
	  const level = m.target.getAttribute("set_level");
	  showLevel(level);
	}
	if (m.attributeName == "set_highlight_ids") {
	  this.root.querySelector("#highlight_ids").value = m.target.getAttribute("set_highlight_ids");
	}
	if (m.attributeName == "set_highlight_positions") {
	  this.root.querySelector("#highlight_positions").value = m.target.getAttribute("set_highlight_positions");
	}
      });
      searchIds(true);
      highlightVar();
    });
    
    const addInitEventListener = () => {
      // ID click event
      this.root.querySelectorAll(".hapid").forEach((el) => {
	el.addEventListener("click", (e) => {
	  const id = e.target.id;
	  window.open("https://jogo.csml.org/haplotype_detail?regionname=" + region + "&hapid=" + id);
	})
      });
      // Add click event
      this.root.querySelectorAll(".show_level").forEach(el => {
	el.addEventListener("click", e => {
	  showLevel(e.currentTarget.getAttribute("level"));
	  this.root.querySelector("#popup").classList.add("hidden");
	});
      });
      // Variant event
      this.root.querySelectorAll(".popup").forEach((el) => {
	add_var_event(el);
      });
      // Change ids & highlight textbox event
      this.root.querySelector("#search_ids").addEventListener("change", () => {
	searchIds(true);
      });
      this.root.querySelector("#highlight_ids").addEventListener("change", () => {
	searchIds(true);
      });
      this.root.querySelector("#highlight_positions").addEventListener("change", () => {
	highlightVar();
      });
      // Show || hide control div
      this.root.querySelector("#ctrl_show_hide").addEventListener("click", (e) => {
	if (e.target.classList.contains("ctrl_hide_button")) {
	  e.target.classList.remove("ctrl_hide_button");
	  e.target.classList.add("ctrl_show_button");
	  this.root.querySelector("#ctrl_div").classList.add("hidden");
	  this.root.querySelector("#haplotype_view_scroll").classList.remove("scroll_height_ctrl_show");
	  this.root.querySelector("#haplotype_view_scroll").classList.add("scroll_height_ctrl_hide");
	} else {
	  e.target.classList.add("ctrl_hide_button");
	  e.target.classList.remove("ctrl_show_button");
	  this.root.querySelector("#ctrl_div").classList.remove("hidden");
	  this.root.querySelector("#haplotype_view_scroll").classList.add("scroll_height_ctrl_show");
	  this.root.querySelector("#haplotype_view_scroll").classList.remove("scroll_height_ctrl_hide");
	}
      });
      //Popup hidden event
      this.root.querySelector("#popup").addEventListener("mouseleave", (e) => {
	e.target.classList.add("hidden");
	popup_id_currnt = false;
      });
      // Scale change event
      const scale_button = this.root.querySelector("#scale_button");
      const haplotype_div = this.root.querySelector("#haplotype_view");
      const main_div = this.root.querySelector("#main");
      let min_scale = 0.5;
      let button_flag = false;
      let mv_width;
      let button_left;
      let button_width;
      let scroll_width;
      const reSetMinScale = () => {
	const view_width = this.root.querySelector("#haplotype_view_scroll").getBoundingClientRect().width;
	const new_scroll_width = haplotype_div.scrollWidth;
	if (new_scroll_width > scroll_width) scroll_width = new_scroll_width;
	min_scale = view_width / scroll_width;
	if (min_scale > 0.5) min_scale = 0.5;
	if (haplotype_div.scale < 1) {
	  if (haplotype_div.scale < min_scale) haplotype_div.scale = min_scale;
	  button_left = mv_width * (scale - min_scale) / (1 - min_scale);
	  scale_button.style.left = button_left + "px";
	  haplotype_div.style.transform = "scale(" + scale + ")";
	}
      };
      scale_button.addEventListener("mousedown", e => {
	button_flag = true;
      });
      main_div.addEventListener("mousemove", e => {
	if (button_flag) {
	  const button_bg_left = this.root.querySelector("#scale_button_bg").getBoundingClientRect().left;
	  button_left = e.clientX - (button_bg_left + 1) - button_width / 2;
	  if (button_left <= 0) button_left = 0;
	  else if (button_left >= mv_width) button_left = mv_width;
	  scale_button.style.left = button_left + "px";
	}
      });
      main_div.addEventListener("mouseup", e => {
	button_flag = false;
	if (button_left >= 0 && button_left <= mv_width) {
	  scale = (mv_width / (1 - min_scale) - (mv_width - button_left)) / (mv_width / (1 - min_scale));
	  haplotype_div.style.transform = "scale(" + scale + ")";
	  haplotype_div.scale = scale;
	  //	this.root.querySelector("#haplotype_view_scroll").style.height = haplotype_div.getBoundingClientRect().height;
	}
      });
      main_div.addEventListener("click", reSetMinScale);
      // JoGo サイトでは 親要素の display が none で描画されるので、最初に描画されたときにセット
      // ついでにここで initalize code
      let setScaleButtton = setInterval(() => {
	const scroll_div_rect = this.root.querySelector("#haplotype_view_scroll").getBoundingClientRect();
	if (scroll_div_rect.width) {
	  const view_width = scroll_div_rect.width;
	  const button_bg_rect = this.root.querySelector("#scale_button_bg").getBoundingClientRect();
	  const button_bg_width = button_bg_rect.width; // style.scss
	  button_width = this.root.querySelector("#scale_button").getBoundingClientRect().width; // style.scss
	  scroll_width = haplotype_div.scrollWidth;
	  min_scale = view_width / scroll_width;
	  if (min_scale > 0.5) min_scale = 0.5;
	  mv_width = button_bg_width - button_width - 6;
	  button_left = mv_width;
	  scale_button.style.left = button_left + "px";
	  //=============================================================
	  // set init ids & highlight
	  if (init_search_ids || init_level || init_highlight_ids || init_highlight_positions) {
	    if (init_search_ids?.match(/g\d/)) {
	      this.root.querySelector("#root_ul").querySelectorAll(".t_chld").forEach(ul => {
		ul.classList.remove("hidden");
	      });
	    }
	    // 優先順位
	    if      (init_level)                                          showLevel(init_level);
	    else if (init_search_ids?.match(/a/) && init_ids?.match(/g/)) showLevel("actg");
	    else if (init_search_ids?.match(/a/) && init_ids?.match(/t/)) showLevel("act");
	    else if (init_search_ids?.match(/a/) && init_ids?.match(/c/)) showLevel("ac");
	    else if (init_search_ids?.match(/a/))                         showLevel("a");
	    else if (init_search_ids?.match(/c/))                         showLevel("c");
	    else if (init_search_ids?.match(/t/))                         showLevel("t");
	    else if (init_search_ids?.match(/g/))                         showLevel("g");
	    if (init_search_ids) this.root.querySelector("#search_ids").value = init_search_ids;
	    if (init_highlight_ids) this.root.querySelector("#highlight_ids").value = init_highlight_ids;
	    if (init_highlight_positions) this.root.querySelector("#highlight_positions").value = init_highlight_positions;
	    if (init_search_ids || init_highlight_ids) {
	      searchIds(true);
	    }
	    observer.observe(this.root.getRootNode().host, {attributes: true});
	  }
	  clearInterval(setScaleButtton);
	  //=============================================================
	  // set main overflow
	  this.root.querySelectorAll("main")[0].style.overflow = "visible";
	}
      }, 10);
    }

    //=============================================================
    ////// Change display (level, search, highlight)
    //
    // Change mode event (amino acid, coding, transcript, genebody)
    const showLevel = (level) => {
      if (!level && this.lavel) level = this.level;
      const ulClass = "ul." + level + "_chld";
      let flag = true;
      for (let el of this.root.querySelectorAll(ulClass)) {
	if (!el.classList.contains("hidden")) {
	  flag = false;
	  break;
	}
      }
      // level が開いてなかったら
      if (flag) {
	this.root.querySelectorAll(ulClass).forEach(ul => {
	  ul.classList.remove("hidden");
	});
      }
      if (this.root.querySelector("#r_" + level).disabled != true) {
	this.root.querySelector("#r_" + level).checked = true;
	const mode = this.root.querySelector("input:checked[name=mode]").value;
	const list = sort_hapid(mode, false);
	highlightIds(mode);
	sort_li(list, false);
	enableHighlight(true);
	searchIds(false);
      }
    };
    // search
    const chk_mode = () => {
      let mode = "a";
      if      (this.root.querySelector("#r_c")?.checked)    mode = "c";
      else if (this.root.querySelector("#r_t")?.checked)    mode = "t";
      else if (this.root.querySelector("#r_g")?.checked)    mode = "g";
      else if (this.root.querySelector("#r_ac")?.checked)   mode = "ac";
      else if (this.root.querySelector("#r_act")?.checked)  mode = "act";
      else if (this.root.querySelector("#r_actg")?.checked) mode = "actg";
      return mode;
    };
    
    const parse_ids = (string, mode) => {
      let ids = [];
      string.trim().split(/[\s\,]+/).forEach(d => {
	if (d.match(/a\d{4}/)) {
	  if (d.match(/a\d{4}(?::c\d{4}(?::t\d{4}(?::g\d{4})?)?)?/)) {
	    let id = d.replace(/:/g, "");
	    if (this.root.querySelector("#r_a").checked) id = id.replace(/c.+/, "");
	    else if (this.root.querySelector("#r_c").checked) id = id.replace(/t.+/, "");
	    else if (this.root.querySelector("#r_t").checked) id = id.replace(/g.+/, "");
	    ids.push(id);
	  }
	} else if (d.match(/^[actg]0*[1-9]/)) {
	  if (d.match(/[actg]\d+(?:[ctg]\d+(?:[tg]\d+(?:g\d+)?)?)?/)) {
	    const parts = d.match(/([actg])(\d+)(?:([ctg])(\d+)(?:([tg])(\d+)(?:(g)(\d+))?)?)?/);
	    let id = parts[1] + parts[2].toString().padStart(4, "0");
	    if (parts[4]) id += parts[3] + parts[4].toString().padStart(4, "0");
	    if (parts[6]) id += parts[5] + parts[6].toString().padStart(4, "0");
	    if (parts[8]) id += parts[7] + parts[8].toString().padStart(4, "0");
	    ids.push(id);
  	  }
	}
      });
      
      if (ids.length === 0) return [];
     
      let new_ids = [];
      ids.forEach(id => {
	id_list.actg.forEach(d => {
	  if (d.id.match(id)) {
	    if      (mode == "a") new_ids.push(d.id.replace(/c.+/, ""));                      // "a0001"
	    else if (mode == "c") new_ids.push(d.id.replace(/t.+/, "").replace(/^.*c/, "c")); // "c0001"
	    else if (mode == "t") new_ids.push(d.id.replace(/g.+/, "").replace(/^.*t/, "t")); // "t0001"
	    else if (mode == "g") new_ids.push(d.id.replace(/^.*g/, "g"));                    // "g0001"
	    else if (mode == "ac") new_ids.push(d.id.replace(/t.+/, ""));                     // "a0001c0001"
	    else if (mode == "act") new_ids.push(d.id.replace(/g.+/, ""));                    // "a0001c0001t0001"
	    else new_ids.push(d.id);                                                          // "a0001c0001t0001g0001"
	  }
	});
      });
      return new_ids;
    };
    const highlightIds = (mode) => {
      let highlight_ids = parse_ids(this.root.querySelector("#highlight_ids")?.value, mode);
      highlight_ids = [...new Set(highlight_ids.filter(d => d !== ""))];
      //console.log(highlight_ids);
      this.root.querySelector("#" + mode + "_chld").querySelectorAll(".hap_li").forEach(li => {
	const seq = li.querySelectorAll(".c_seq")[0];
	seq.classList.remove("seq_highlighted");
	for (const id of highlight_ids) {
	  if (li.id.match(id)) {
	    seq.classList.add("seq_highlighted");
	    break;
	  }
	}
      });
    };
    const searchIds = (changed_flag) => {
      const mode = chk_mode();
      highlightIds(mode);
      let search_ids = parse_ids(this.root.querySelector("#search_ids")?.value, mode);
      if (search_ids.length === 0) {       // reset (show all)
	this.root.querySelectorAll(".hap_li").forEach(li => {
	  li.classList.remove("hidden");
	});
	if (changed_flag) showLevel(mode);
        else highlightVar();
	return false;
      }
      search_ids = [...new Set(search_ids.filter(d => d !== ""))];
      let id2weight = {};
      [...search_ids].reverse().forEach((id, i) => {
	id2weight[id] = i * 100000;
      });
      //console.log(search_ids);
      let list = [];
      let count = 10000;
      this.root.querySelector("#" + mode + "_chld").querySelectorAll(".hap_li").forEach(li => {
	// add 'hidden' class & check matched ID
	const seq = li.querySelectorAll(".c_seq")[0];
	const hapid = li.id.replace(/_li.*/, "");
	let display_flag = false;
	let weight;
	for (const id of search_ids) {
	  if (li.id.match(id)) {
	    display_flag = true;
	    weight = id2weight[id] + count--;
	    break;
	  }
	}
	if (display_flag) {
	  list.push({
	    id: hapid,
	    weight: weight
	  });
	}
      });
      list.sort((a,b) => {
	return b.weight - a.weight;
      });
      //console.log(list);
      sort_li(list, false, true);
      highlightVar();
    };

    // highlight
    const highlightVar = () => {
      this.root.querySelectorAll(".v_highlight").forEach(el => {
	el.classList.remove("v_highlighted");
      });
      const height = this.root.querySelector("#sort_ul").offsetHeight;
      this.root.querySelector("#highlight_positions").value.trim().split(/[\s\,]+/).forEach(pos => {
	this.root.querySelectorAll(".highlight" + pos).forEach(el => {
	  el.classList.add("v_highlighted");
	  el.style.height = (height + 20) + "px";
	});
      });
    };
    const enableHighlight = (flag) => {
      if (flag) this.root.querySelector("#highlight_positions").disabled = false;
      else this.root.querySelector("#highlight_positions").disabled = true;
    };
    
    //=============================================================
    ////// main
    //
    // render loding icon
    this.renderTemplate(
      {
        template: 'loading.html.hbs',
        parameters: {
        }
      }
    );
    
    // get clinical significance from TogoVr
    const getClinSig = async (hgncid) => {
      let filtered = false;
      const limit = 1000;
      let offset = 0;
      let count = 0;
      let clin_sig = {};
      while (filtered === false || filtered > count) {
	tgv_opt.body = tgv_bdy.replace(/#hgncid/, hgncid).replace(/#offset/, offset).replace(/#limit/, limit);
	const togovar = await fetch(tgv_api, tgv_opt).then(res => res.json());
	if (togovar.statistics) filtered = togovar.statistics.filtered;
	else filtered = 0; // for 'formatter=jogo' option in TogoVar API (w/o offset-limit scroll)
	if (togovar.data.length > 0) {
	  for (const d of togovar.data) {
	    clin_sig[d.reference + d.position + d.alternate] = d;
	  }
	  offset = '["' + togovar.data[togovar.data.length - 1].chromosome + '","' + togovar.data[togovar.data.length - 1].position + '","' + togovar.data[togovar.data.length - 1].reference + '","' + togovar.data[togovar.data.length - 1].alternate + '"]';
	  count += limit;
	}
      }
      return clin_sig;
    };
    
    // 非同期処理
    //-------------------------------------------------------------
    // 1) ２つの fetch を同時にスタート
    //    JoGo でのデータ取得
    //    TogoID での HGNC ID 取得
    //-------------------------------------------------------------
    const togoidPromise = fetch(togoid_api).then(res => res.json());
    const jogoPromise   = fetch(jogo_api).then(res => res.json());
    
    //-------------------------------------------------------------
    // 2) togoid の応答が来たらすぐ togovar api からのデータ取得 (getClinSig) を始める
    //    （jogoPromise とは並列で進行）
    //-------------------------------------------------------------
    const firstClinSigPromise = (async () => {
      try {
	const togoidJson = await togoidPromise;
	const hgncid = togoidJson?.results?.[0];
	if (!hgncid) return { hgncid: null, clin_sig: {} };      // 失敗時のフォールバック
	const sig = await getClinSig(hgncid);
	return { hgncid, clin_sig: sig };
      } catch (e) {
	console.warn("firstClinSigPromise failed:", e);
	return { hgncid: null, clin_sig: {} };
      }
    })();

    //-------------------------------------------------------------
    // 3) jogo の取得完了を待って、すぐにデータ構築とレンダリング開始（clin_sig は待たない）
    //-------------------------------------------------------------
    const jogo_json = await jogoPromise;

    const chr    = jogo_json.maneinfo.chr.replace(/^chr/, "");
    const strand = jogo_json.maneinfo.strand;
    const region = jogo_json.maneinfo.regionname5000;
    let variant = [];
    let var_freq = [];
    let region_level = [];
    let haplotype = [];
    let scale = 1;

    // base info for level data construction
    let level_list = [
      {level: "a",    min: 0, max: 0, v_max: 3, amino: true,  space: "     "},
      {level: "ac",   min: 0, max: 1, v_max: 3, amino: false, space: "          "},
      {level: "act",  min: 0, max: 2, v_max: 3, amino: false, space: "               "},
      {level: "actg", min: 0, max: 3, v_max: 3, amino: false, space: "                    "},
      {level: "c",    min: 1, max: 1, v_max: 4, amino: false, space: "     "},
      {level: "t",    min: 2, max: 2, v_max: 5, amino: false, space: "     "},
      {level: "g",    min: 3, max: 3, v_max: 6, amino: false, space: "     "}
    ];

    // get id list
    level_list.forEach(d => {
      id_list[d.level] = ext_id_list(jogo_json[d.level + "haplotypesummary"], d.level + "hapid");
    });
    const total = id_list.a.reduce((a, c) => a + c.count, 0);
   // console.log(level_list);

    // construct variant data
    level_list.forEach(d => {
      if (d.level.length == 1) variant = ext_variant(jogo_json[d.level + "variants"], d.level + "hapids", d.level, d.max, variant);
    });
    // sort variants arong the gene strand
    if (strand == "+") {
      variant = variant.sort((a,b) => a.pos - b.pos);
    } else {
      variant = variant.sort((a,b) => b.pos - a.pos);
    }
    
    // construct variant frequency data
    level_list.forEach((d, i) => {
      var_freq[i] = {level: d.level, space: d.space, var_data: []};
    });
    for (const v of variant) {
      level_list.forEach((d, i) => {
	if (v.type == d.level.slice(-1)) add_var_freq(i, d.v_max, d.level, v, total, var_freq);
      });
      popup_id2title[v.ref + v.pos + v.alt + "_f"] = make_var_title(v) + "<br>";
      popup_id2info[v.ref + v.pos + v.alt + "_f"] = v.count + " / " + total + make_freq_graph(v.pop, false);
    }
    
    // construct region-level data
    for (const [i, level] of var_freq.entries()) {
      let seq = "";
      let pre_level = undefined;
      region_level[i] = {level: var_freq[i].level, space: var_freq[i].space, region_data: []};
      for (const v of level.var_data) {
	if (pre_level && pre_level != v.level) {
	  region_level[i].region_data.push({
	    seq: seq,
	    level: pre_level
	  });
	  seq = "";
	}
	seq += " ";
	pre_level = v.level;
      }
      region_level[i].region_data.push({
	seq: seq,
	level: pre_level
      });
    }
    
    // construct hap data
    level_list.forEach((d, i) => {
      haplotype[i] = {id: d.level, hap: []};
      for (const dat of id_list[d.level]) {
	haplotype[i].hap.push(construct_data(dat, d.min, d.max, total, strand, variant, d.level, d.amino));
      }
    });
    //console.log(haplotype);
    //console.log(popup_id2info);
    //console.log(hapid2var);
    
    // render explorer
    this.renderTemplate(
      {
        template: 'stanza.html.hbs',
        parameters: {
	  title: stanza_title,
	  hap: haplotype,
	  var_freq: var_freq,
	  region: region_level
        }
      }
    );
    
    addInitEventListener();

    //-------------------------------------------------------------
    // 4) clin_sig 側の取得完了を待ってから、必要なら ID 突き合わせ＆再取得 → 追加描画
    //-------------------------------------------------------------
    try {
      const { hgncid: fromTogoid, clin_sig: sig0 } = await firstClinSigPromise;
      // jogo 側の HGNC ID
      const hgncid_jogo = jogo_json?.maneinfo?.hgncid;
      const asInt = v => (v == null || v === "" ? NaN : parseInt(v, 10));
      
      let finalClinSig = sig0;
      
      // 突き合わせ：食い違えば jogo 側の HGNC ID で取り直し
      if (!Number.isNaN(asInt(hgncid_jogo)) && !Number.isNaN(asInt(fromTogoid)) &&
          asInt(hgncid_jogo) !== asInt(fromTogoid)) {
	try {
          finalClinSig = await getClinSig(hgncid_jogo);
	} catch (e) {
          console.warn("getClinSig(hgncid_jogo) failed:", e);
	}
      }
      
      // clin_sig で追加レンダリング
      const clin_sig = finalClinSig || {};
      // add clinical significance to variant data
      for (const [i, v] of variant.entries()) {
	const popup_id =  v.ref + v.pos + v.alt;
	if (clin_sig[popup_id]) {
	  const tgv = clin_sig[popup_id];
	  this.root.querySelectorAll(".v_" + popup_id).forEach(el => {
	    el.classList.add('v_bold');
	  });
	  let sigs = [];
	  tgv.significance.forEach(d => {
	    const sig_ico = " <span class='clinical-significance' data-sign='" + d.interpretations[0] + "'></span> ";
	    //let mgend_ico = "";
	    //if (d.source == "mgend") mgend_ico = " <span class='icon' data-remains='1' data-mgend='true'></span> ";
	    for (const c of d.conditions) {
	      //sigs.push(sig_ico + c.name + mgend_ico);
	      sigs.push(sig_ico + c.name);
	    }
	  })
	  const uniq = Array.from(new Set(sigs));
	  if (tgv.existing_variations) {
	    const rss = tgv.existing_variations.map(rs => "<a href='" + dbsnp_url + rs + "' target='" + rs + "'>" + rs + "</a>");
	    popup_id2info[popup_id] = "dbSNP: " + rss.join(", ") + "<br>" + popup_id2info[popup_id];
	  }
	  if (tgv.id) {
	    popup_id2tgv[popup_id] = tgv.id;
	    popup_id2info[popup_id] = "TogoVar: <a href='" + togovar_url + tgv.id + "' target='" + tgv.id + "'>" + tgv.id + "</a><br>" + popup_id2info[popup_id];
	  }
	  popup_id2info[popup_id] += "<br>Clinical significance:<br>" + uniq.join("<br>");
	}
      }
    } catch (e) {
      console.warn("clin_sig post-processing failed:", e);
    }
  }
}
