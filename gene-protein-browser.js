import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import * as d3 from 'd3';

class GeneProteinBrowser extends Stanza {
  async render() {

    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Mono:200,400,500,600");
    
    this.renderTemplate(
      {
        template: 'stanza.html.hbs',
        parameters: {
        }
      }
    );

    const hgnc_id= this.params.hgnc_id;
    const togovar_target = this.params.togovar_target;
    const jpost_endpoint = this.params.jpost_endpoint;
    const glycosmos_endpoint = this.params.glycosmos_endpoint;
    const api = "https://" + togovar_target + ".togovar.org/sparqlist/api/gene_protein_browser";
    const get_params = "?hgnc_id=" + hgnc_id + "&togovar_target=" + togovar_target + "&jpost_endpoint=" + encodeURI(jpost_endpoint) + "&glycosmos_endpoint=" + encodeURI(glycosmos_endpoint);

    let params = {
      svgWidth: this.root.querySelector("main").offsetWidth,  // const
      svgHeight: 0,
      marginLeft: 20,   // const
      marginTop: 20,    // const
      marginRight: 20,  // const
      marginTrack: 4,  // const
      barGraphTrackHeight: 60, // const
      fontScaleX: 1.4,  // const
      lineHeight: 18,   // const
      boxSize: 19,      // const
      scale: 1,
      start: 1,
      freqLineY: 0,
      mouseX: 0,
      mouseY: 0,
      dragMouseX: 0,
      dragStartX: 0,
      dragFlag: false,
      anime: 100,       // const
      animeFreq: 200    // const
    };
    
    //// init axis and backgroung
    const track_init = (svg, params) => {      
      let xAxis = [];
  //    let xAxisBg = [];
      let aaPos;
      let aa = [];
      for (let i = 0; i < params.seqLen; i++) {
	aa[i] = i;
      }

      // svg defs for bar graph button
      let defs = svg.append("defs");
      defs.append("clipPath")
	.attr("id", "cut_r")
	.append("rect")
	.attr("x", -1).attr("y", -1).attr("width", 45).attr("height", 16);
      defs.append("clipPath")
	.attr("id", "cut_l")
	.append("rect")
	.attr("x", 44).attr("y", -1).attr("width", 45).attr("height", 16);
      
      const setData = () => {
	const interval = 10;
	//x-axis
	xAxis = [];
	let i = 0;
	while (i * interval < params.seqLen) {
	  let axis = { l: i * interval, d: "none" };
	  let x = roundFloat((i * interval - params.start + 1) * params.seqArea / params.seqLen * params.scale);
	  if (x >= 0 && x <= params.seqArea) {
	    axis.x = x + params.marginLeft;
	    if ((i * interval) % 100 == 0
	      || ((i * interval) % 50 == 0 && params.seqLen / params.scale < 250)
	      || ((i * interval) % 10 == 0 && params.seqLen / params.scale < 100)) axis.d = "block";
	  } else if (x < 0) {
	    axis.x = params.marginLeft;
	  } else if (x > params.seqArea) {
	    axis.x = params.seqArea + params.marginLeft;
	  }
	  xAxis.push(axis);
	  i++;
	}
	  
	// x-axis background
/*	xAxisBg = [];
	for (let i = -1; i < params.seqArea / 200 + 1; i++) {  // leter=10 * window=10 * (white+glay=2);
	  xAxisBg[i+1] = {};
	  const sx = roundFloat(((i * 20) - (params.start % 20) + 1) * params.seqArea / params.seqLen * params.scale);
	  const ex = roundFloat(((i * 20) - (params.start % 20) + 11) * params.seqArea / params.seqLen * params.scale);
	  
	  if      (sx >= 0 && sx <= params.seqArea) xAxisBg[i+1].sx = sx + params.marginLeft;
	  else if (sx < 0)                          xAxisBg[i+1].sx = params.marginLeft;
	  else if (sx > params.seqArea)             xAxisBg[i+1].sx = params.seqArea + params.marginLeft;

	  if      (ex >= 0 && ex <= params.seqArea) xAxisBg[i+1].ex = ex + params.marginLeft;
	  else if (ex < 0)                          xAxisBg[i+1].ex = params.marginLeft;
	  else if (ex > params.seqArea)             xAxisBg[i+1].ex = params.seqArea + params.marginLeft;
	} */
	  
	  // seq & aa
	  if(params.scale == params.maxScale){
	    aaPos = roundFloat((1 - params.start) * params.seqArea / params.seqLen * params.scale + params.marginLeft + 8); // 微調整
	  }
	};

      const plot = () => {
	// x-axis
	svg.select("g#axis").selectAll(".x_axis")
	  .data(xAxis)
	  .attr("d", (d) => "M " + d.x + " 0 V 10")
	  .attr("display", (d) => d.d);
	svg.select("g#axis").selectAll(".x_axis_text")
	  .data(xAxis)
	  .attr("x", (d) => d.x - 5)
	  .attr("display", (d) => d.d);
	  
	// seq & aa & back (各トラックの aaseq を一括管理)
	if(params.scale == params.maxScale){
	  svg.selectAll("g.seq")
	    .attr("transform", "translate(" + aaPos + ",0)")
	    .attr("display", "block");
/*	  svg.selectAll("rect.x_axis_bg")
	    .data(xAxisBg)
	    .attr("x", (d) => d.sx)
	    .attr("width", (d) => d.ex - d.sx)
	    .attr("display", "block"); */
	}else {
	  svg.selectAll("g.seq")
	    .attr("display", "none");
/*	  svg.selectAll("rect.x_axis_bg")
	    .attr("display", "none"); */
	}
      };
	
      const render = () => {   
	  // x-axis
	  params.svgHeight += params.marginTop;

	  let g = svg.append("g")
	      .attr("transform", "translate(0," + params.svgHeight + ")")
	      .attr("id", "axis");
/*	  g.selectAll(".x_axis_bg")
	    .data(xAxisBg)
	    .enter()
	    .append("rect")
	    .attr("class", "x_axis_bg")
	    .attr("y", 0)
	    .attr("display", "none"); */
	  g.append("rect")
	    .attr("id", "guide_line")
	    .attr("y", 10);
	  g.append("path")
	    .attr("stroke", "#000000")
	    .attr("fill", "none")
	    .attr("stroke-width", "1px")
	    .attr("d", "M " + params.marginLeft + " 10  H " + (params.seqArea + params.marginLeft));
	  g.selectAll(".x_axis")
	    .data(xAxis)
	    .enter()
	    .append("path")
	    .attr("stroke", "#000000")
	    .attr("fill", "none")
	    .attr("stroke-width", "1px")
	    .attr("class", "x_axis")
	    .attr("d", (d) => "M " + d.x + " 0 V 10");
	  g.selectAll(".x_axis_text")
	    .data(xAxis)
	    .enter()
	    .append("text")
	    .attr("class", "x_axis_text")
	    .attr("text-anchor", "end")
	    .attr("font-size", 12)
	    .attr("x", (d) => d.x - 5)
	    .attr("y", 0)
	  .text((d) => d.l);

	let display = "none";
	if(params.scale == params.maxScale) display = "block";
	g = svg.append("g")
	  .attr("class", "seq view_unit")
	  .attr("display", display)
	  .attr("id", "seq");
	g.append("text")
	  .attr("class", "aaseq protein_browser_mono")
	  .attr("y", 52)
	  .attr("textLength", (params.seqLen * 2 - 1) * 10)
	  .attr("lengthAdjust", "spacingAndGlyphs")
	  .text(params.seqSp);
	g.selectAll(".aa_box")
	  .data(aa)
	  .enter()
	  .append("rect")
	  .attr("class", "aa_box")
	  .attr("x", (d) => d * params.fontWidth - 4)
	  .attr("y", 36)
	  .attr("width", params.boxSize)
	  .attr("height", params.boxSize);
	g.selectAll(".aa_sep_line")
	  .data(aa)
	  .enter()
	  .append("path")
	  .attr("class", "aa_sep_line")
	  .attr("d", (d) => "M " + (d * params.fontWidth - 8) + " 30 V 10");
	  
	  params.svgHeight += params.lineHeight / 2 + params.marginTrack + 28;
	  svg.attr("height", params.svgHeight);
      };
      
      setData();
      render();
      plot();
      
      mouse_event_check(svg, params);
      add_mouse_event(svg, params, setData, plot);
    };

    const x_axis_bg_height = (svg, params) => {
 /*     svg.selectAll("rect.x_axis_bg")
	.transition()
	.duration(params.anime)
	.attr("height", params.svgHeight - params.marginTop - params.marginTrack); */
      svg.select("#guide_line")
	.transition()
	.duration(params.anime)
	.attr("height", params.svgHeight - params.marginTop - params.marginTrack - 10);
      svg.selectAll(".aa_sep_line")
      	.attr("d", (d) => "M " + (d * params.fontWidth - 8) + " 30 V " + (params.svgHeight - params.marginTop - params.marginTrack + 20));
  
      svg.selectAll("rect.aa_hide").remove();
      svg.append("rect")
	.attr("class", "aa_hide")
	.attr("x", 0)
	.attr("y", 20)
	.attr("width", params.marginLeft)
      	.attr("height", params.svgHeight - params.marginTop - params.marginTrack);
      svg.append("rect")
	.attr("class", "aa_hide")
	.attr("x", params.svgWidth - params.marginRight)
	.attr("y", 20)
	.attr("width", params.marginRight)
	.attr("height", params.svgHeight - params.marginTop - params.marginTrack);
    };
    

    //// Bar-graph track for countable data
    //// (jPOST-pohospo)
    const track_bar = (svg, params, data, track_label, dom_id) => {
      let graphSwitchFlag = false;  
      const plotGraphAnime = () => {
	// ptms
	svg.select("g#" + dom_id).selectAll(".graph_freq_bar")
	  .data(data)
	  .transition()
	  .duration(params.animeFreq)
	  .attr("y", (d) => {
	    if (graphSwitchFlag) return d.count_y;
	    else return d.norm_y;
	  })
	  .attr("height", (d) => {
	    if (graphSwitchFlag) return d.count_h;
	    else return d.norm_h;
	  });
      };
      
      const ptmGraphSwitch = (name) => {
	let g = svg.select("#" + dom_id);
	if(graphSwitchFlag){
	  graphSwitchFlag = false;
	  g.selectAll(".button_off").attr("class", "button_ne");
	  g.selectAll(".button_on").attr("class", "button_off");
	  g.selectAll(".button_ne").attr("class", "button_on");
	}else {
	  graphSwitchFlag = true;
	  g.selectAll(".button_on").attr("class", "button_ne");
	  g.selectAll(".button_off").attr("class", "button_on");
	  g.selectAll(".button_ne").attr("class", "button_off");
	}
	plotGraphAnime();
      };
	
      const setData = () => {
	for (let i = 0; i < data.length; i++) {
	  const x = roundFloat((data[i].position - params.start + 0.5) * params.seqArea / params.seqLen * params.scale - params.boxSize / 2); // '+ 0.5' = align center
	  if (x + params.boxSize >= 0 && x <= params.seqArea) {
	    data[i].x = x + params.marginLeft;
	    data[i].d = "block";
	  } else if (x + params.boxSize < 0) {
	    data[i].x = params.marginLeft;
	    data[i].d = "none";
	  } else if (x > params.seqArea) {
	    data[i].x = params.seqArea + params.marginLeft;
	    data[i].d = "none";
	  }
	  const w = roundFloat(params.scale / params.maxScale * params.boxSize);
	  if (w < 2)                   data[i].w = 2;
	  else if (w > params.boxSize) data[i].w = params.boxSize;
	  else                         data[i].w = w;
	  if (max_count < data[i].count) max_count = data[i].count;
	}
	params.freqLineY = params.barGraphTrackHeight + 27; // 微調整
	for(var i = 0; i < data.length; i++){
	  data[i].count_y = (params.freqLineY - (params.lineHeight / 2) - data[i].count * params.barGraphTrackHeight / max_count);
	  data[i].count_h = data[i].count * params.barGraphTrackHeight / max_count;
	  data[i].norm_y = (params.freqLineY - (params.lineHeight / 2) - data[i].count * params.barGraphTrackHeight / data[i].position_count);
	  data[i].norm_h = data[i].count * params.barGraphTrackHeight / data[i].position_count;
	}
      };
	
      const plot = () => { 
	svg.select("g#" + dom_id).selectAll(".graph_freq_bar")
	  .data(data)
	  .attr("display", (d) => d.d)
	  .attr("x", (d) => d.x)
	  .attr("y", (d) => {
	    if (graphSwitchFlag) return d.count_y;
	    else return d.norm_y;
	  })
	  .attr("width", (d) => d.w)
	  .attr("height", (d) => {
	    if (graphSwitchFlag) return d.count_h;
	    else return d.norm_h;
	  });
	svg.select("g#" + dom_id).selectAll(".pin_legend")
	  .data(data)
	  .attr("x", (d) => d.x + 10);
      };
	
      const render = () => {
	let g = svg.append("g")
	    .attr("class", "ptms view_unit")
	    .attr("transform", "translate(0," + params.svgHeight + ")")
	    .attr("id", dom_id);
	g.append("path")
	  .attr("class", "track_sep")
	  .attr("d", "M " + params.marginLeft + " 0 H " + (params.marginLeft + params.seqArea));
	let label = g.append("g").attr("class", "protein_browser_label_set");
	let label_text = label.append("text")
	    .attr("y", 16)
	    .attr("x", params.marginLeft + 6)
	    .attr("fill", "#beccdd")
	    .attr("class", "protein_browser_label")
	    .text(track_label);
	
	// render buttons
	const label_rect = label_text.node().getBoundingClientRect();
	const button_offset_left = label_rect.width + 10;
	let b = label.append("g")
	    .attr("class", "button")
	    .style("cursor", "pointer")
	    .attr("transform", "translate(" + (params.marginLeft + button_offset_left + 6) + ",3)")
	    .on("click", () => { ptmGraphSwitch(); });
	b.append("rect")
	  .attr("class", "button_on")
	  .attr("y", 0)
	  .attr("x", 0)
	  .attr("width", 51)
	  .attr("height", 14)
	  .attr("clip-path", "url(#cut_r)");
	b.append("text")
	  .attr("class", "button_on")
	  .attr("y", 11)
	  .attr("x", 23)
	  .attr("text-anchor", "middle")
	  .text("norm.");
	b.append("rect")
	  .attr("class", "button_off")
	  .attr("y", 0)
	  .attr("x", 36)
	  .attr("width", 51)
	  .attr("height", 14)
	  .attr("clip-path", "url(#cut_l)");
	b.append("text")
	  .attr("class", "button_off")
	  .attr("y", 11)
	  .attr("x", 64)
	  .attr("text-anchor", "middle")
	  .text("count");
	b.append("path")
	  .attr("class", "button_sep")
	  .attr("d", "M 44 0 V 14");

	// render ptm freq. bar
	g.selectAll(".graph_freq_bar")
	  .data(data)
	  .enter()
	  .append("rect")
	  .attr("class", (d) => "graph_freq_bar ptm_p_" + d.site)
	  .attr("x", (d) => d.x)
	  .attr("y", (d) => d.count_y)
	  .attr("width", (d) => d.w)
	  .attr("height", (d) => d.count_h)
	  .on("mouseover", (e) => showPopupInfo(e.target.__data__))
	  .on("mouseout", () => {this.root.querySelector('#popup_info').style.display = "none";  this.root.querySelector('#guide_line').style.display = "none";})
	  .on("click", (e) => window.open(e.target.__data__.link));

	// aaseq, max, half line
/*	g.append("path")
	  .attr("stroke", "#888888")
	  .attr("fill", "none")
	  .attr("stroke-width", "0.5px")
	  .attr("d", "M " + (params.marginLeft + 1) + " " + (params.freqLineY - params.lineHeight / 2 - params.barGraphTrackHeight / 2) + " H " + (params.seqArea + params.marginLeft));
	g.append("path")
	  .attr("stroke", "#888888")
	  .attr("fill", "none")
	  .attr("stroke-width", "0.5px")
	  .attr("d", "M " + (params.marginLeft + 1) + " " + (params.freqLineY - params.lineHeight / 2 - params.barGraphTrackHeight) + " H " + (params.seqArea + params.marginLeft)); */
	// ptm
	g.selectAll(".pin_legend")
	  .data(data)
	  .enter()
	  .append("text")
	  .attr("class", "pin_legend protein_browser_mono")
	  .attr("id", (d) => d.site + d.position + "_" + dom_id)
	  .attr("x", (d) => d.x + 10)
	  .attr("y", params.freqLineY - 10)
	  .attr("display", "none")
	  .text((d) => d.site + d.position + ": " + d.count + "/" + d.position_count);
	
	const h = params.barGraphTrackHeight + params.marginTrack;
	params.svgHeight += h + 19; // 微調整
	svg.transition().duration(params.anime).attr("height", params.svgHeight);
	x_axis_bg_height(svg, params);
      };

      let max_count = 0;
      setData();
      render();
      plot();
      
      add_mouse_event(svg, params, setData, plot);
    };
    
    //// Pin track for exact positional annotation
    //// (TogoVar, UniProt, GlycoDB)
    const track_pin = (svg, params, data, track_label, dom_id) => {

      let maxY = 0;      
      for (const d of data) {
	if(d.y > maxY) maxY = d.y;
      }
	
      const setData = () => {
	for (let i = 0; i < data.length; i++) {
	  const x = roundFloat((data[i].position - params.start + 0.5) * params.seqArea / params.seqLen * params.scale - params.boxSize / 2); // '+ 0.5' = align center
	  if (x + params.boxSize >= 0 && x <= params.seqArea) {
	    data[i].x = x + params.marginLeft;
	    data[i].d = "block";
	  } else if (x + params.boxSize < 0) {
	    data[i].x = params.marginLeft;
	    data[i].d = "none";
	  } else if (x > params.seqArea) {
	    data[i].x = params.seqArea + params.marginLeft;
	    data[i].d = "none";
	  }
	  const w = roundFloat(params.scale / params.maxScale * params.boxSize);
	  if      (w < 2)              data[i].w = 2;
	  else if (w > params.boxSize) data[i].w = params.boxSize;
	  else                         data[i].w = w;
	}
      };
	
      const plot = () => { 
	svg.select("g#" + dom_id).selectAll(".pin_axis")
	  .data(data)
	  .attr("display", (d) => d.d)
	  .attr("d", (d) => "M " + d.x + " " + ((maxY * delta + 1) * params.lineHeight) + " V " + (d.y * delta * params.lineHeight));
	svg.select("g#" + dom_id).selectAll(".pin_symbol_bg")
	  .data(data)
	  .attr("display", (d) => d.d)
	  .attr("x", (d) => d.x)
	  .attr("width", (d) => d.w);
	svg.select("g#" + dom_id).selectAll(".pin_symbol")
	  .data(data)
	  .attr("display", (d) => {
	    if(d.d == "block" && params.scale == params.maxScale) return "block";
	    else return "none" ;
	  })
	  .attr("x", (d) => d.x + 11);
	
	svg.select("g#" + dom_id).selectAll(".pin_legend")
	  .data(data)
	  .attr("x", (d) => d.x + 10);
      };
	
	const render = () => {
	  var g = svg.append("g")
	      .attr("class", "def view_unit")
	      .attr("transform", "translate(0," + params.svgHeight + ")")
	      .attr("id", dom_id);
	  g.append("path")
	    .attr("class", "track_sep")
	    .attr("d", "M " + params.marginLeft + " 0 H " + (params.marginLeft + params.seqArea));
	  var label = g.append("g").attr("class", "protein_browser_label_set");
	  label.append("text")
	    .attr("y", 16)
	    .attr("x", params.marginLeft + 6)
	    .attr("class", "protein_browser_label")
	    .text(track_label);
	  
	  var pin_symbol_g = g.selectAll(".pin_symbol_g")
	      .data(data)
	      .enter()
	      .append("g")
	      .attr("class", "pin_symbol_g")
	      .style("cursor", "pointer")
	      .on("mouseover", (e) => showPopupInfo(e.target.__data__))
	      .on("mouseout", () => {this.root.querySelector('#popup_info').style.display = "none";  this.root.querySelector('#guide_line').style.display = "none";})
	      .on("click", (e) => window.open(e.target.__data__.link));
	  pin_symbol_g.append("rect")
	    .attr("class", (d) => "pin_symbol_bg " + d.type)
	    .attr("x", (d) => d.x)
	    .attr("y", (d) => (d.y * delta) * params.lineHeight)
	    .attr("width", (d) => d.w)
	    .attr("height", params.boxSize);
	  var display = "none";
	  if(params.scale == params.maxScale) display = "block";
	  pin_symbol_g.append("text")
	    .attr("class", "pin_symbol protein_browser_mono")
	    .attr("textLength", params.fontWidth / 2)
	    .attr("lengthAdjust", "spacingAndGlyphs")
	    .attr("text-anchor", "middle")
	    .attr("id", (d) => d.site + d.position + "_uniprot")
	    .attr("x", (d) => d.x + 11)
	    .attr("y", (d) => d.y * delta * params.lineHeight + 16)
	    .attr("fill", "#000000")
	    .attr("display", display)
	    .text((d) => {
	      if (d.type.match(/^sig_/)) return d.symbol;
	      else return "";
	    });
	  
	  var h = (maxY + 1) * delta * params.lineHeight + params.marginTrack;
	  params.svgHeight += h;
	  svg.transition().duration(params.anime).attr("height", params.svgHeight);
	  x_axis_bg_height(svg, params);
	};
      
      const delta = 1.4; // y margin at same position (1: margin = 0)
      setData();
      render();
      plot();
      
      add_mouse_event(svg, params, setData, plot);
    };


    //// mouse event
    const mouse_event_check = (svg, params) => {
      params.mouseOnElement = false;
      svg.on("mouseover", function(){ params.mouseOnElement = true;});
      svg.on("mouseout", function(){ params.mouseOnElement = false;});
    };
	  
    const add_mouse_event = (svg, params, setData, plot) => {
      let setTimeoutId = null; // scroll stop timer
      
      const setParamsStart = () => {
	if (params.start < 1) params.start = 1;
	if ((params.seqLen - params.start - 1) * params.scale < params.seqLen) params.start = params.seqLen * (params.scale - 1) / params.scale + 1;
      };
	
      // drag = [mouseDown + mouseMove + mouseUp] 	
      const mouseMoveEventDraw = (e) => {
	if (params.mouseOnElement) {
	  const rect = e.target.getBoundingClientRect(); 
	  params.mouseX = e.clientX - rect.left;
	  params.mouseY = e.clientY - rect.top;
	  if (params.dragFlag) {
	    params.start = params.dragStartX + (params.dragMouseX - params.mouseX) / params.seqArea * params.seqLen / params.scale;
	    setParamsStart();
	    setData();
	    plot();
	  }
	}else {
	  params.dragFlag = false;
	}
      };

      const mouseDownEvent = () => {
	if (params.mouseOnElement) {
	  params.dragFlag = true;
	  params.dragStartX = params.start;
	  params.dragMouseX = params.mouseX;
	  this.root.querySelector('#guide_line').style.display = "none";
	}
      };

      const mouseUpEvent = ()=> {
	if (params.dragFlag) params.dragFlag = false; 
      };

      // scroll
      const scrollEvent = (e) => {
	if (params.mouseOnElement) {
	  e.preventDefault();
	  e.target;
	  const deltaY = e.deltaY ? -(e.deltaY) : e.wheelDelta ? e.wheelDelta : -(e.detail);
	  const position = (params.mouseX - params.marginLeft) * params.seqLen / params.seqArea / params.scale;
	  if (deltaY > 0 && params.scale != params.maxScale) {
	    params.scale *= 1.03;
	    if(params.scale > params.maxScale) params.scale = params.maxScale;
	  } else if (deltaY < 0 && params.scale != 1) {
	    params.scale /= 1.03;
	    if(params.scale < 1) params.scale = 1;
	  }
	  params.scale = Math.round(params.scale * 100) / 100;
	  const newPosition = (params.mouseX - params.marginLeft) * params.seqLen / params.seqArea / params.scale;	
	  params.start += position - newPosition;
	  params.start = Math.round(params.start * 100) / 100;
	  setParamsStart();
	  setData();
	  plot();
	  
	  // (同期して描画すると重いので、各表示それぞれのタイミングで個別に描画。
	  // タイミングが違うので微妙にずれる。スクロール終了を検知したら全部の描画をし直して合わせる)
	  if(setTimeoutId){ clearTimeout(setTimeoutId); }
	  setTimeoutId = setTimeout( function() {
	    // re-plot if stoped scroll 
	    setParamsStart();
	    setData();
	    plot();
		    setTimeoutId = null;
	  }, 100 );
	  
	}else {
	  if(params.mouseOnElement) window.onwheel = true;
	}
      };
      
      svg.on("mousedown", mouseDownEvent, false);	
      d3.select(window).on("mouseup", mouseUpEvent, false);
      const mousewheel = "onwheel" in document ? "wheel" : "onmousewheel" in document ? "mousewheel" : "DOMMouseScroll";
      document.addEventListener (mousewheel,  scrollEvent, {passive: false});
      // svg.on("mousemove", mouseMoveEventDraw, false);                        // 最後に指定したイベントのみ
      // svg.node().addEventListener ("mousemove",  mouseMoveEventDraw, false); // 描画が排他でブレる
      document.addEventListener ("mousemove",  mouseMoveEventDraw, false);      // 描画が協調？
    };
    
    //// position 少数切り捨て (sig_dig は小数点以下の桁数)
    const roundFloat = (d, sig_dig) => {
      if (!sig_dig) sig_dig = 3; // svg は 3 が推奨
      const num = 10 ** sig_dig;
      return Math.round(d * num) / num;
    };

    //// popup
    const showPopupInfo = (d) => {
      const root = this.root.querySelector("main");
      const popup = this.root.querySelector('#popup_info');
      popup.innerHTML = d.html;
      popup.style.display = "block";
      popup.style.left = (params.mouseX + 20) + "px";
      popup.style.top = (params.mouseY + 10) + "px";
      if (root.offsetWidth < popup.offsetWidth + params.mouseX + 20) {
        popup.style.left = (parseInt(params.mouseX - popup.offsetWidth) - 20) + "px"; // popup on the left
      }
      const guide = this.root.querySelector('#guide_line');
      let dw = roundFloat(params.scale / params.maxScale * params.fontWidth);
      let dx = 4;
      let w = dw * d.highlight_range;
      if (w < 4) {w = 4; dw = 4;}
      else if (w > params.fontWidth * d.highlight_range) w = params.fontWidth * d.highlight_range;
      if (d.x - dw / 2 + w > params.seqArea + params.marginLeft) w = params.seqArea + params.marginLeft - (d.x - dw / 2);
      dx = roundFloat(dx * dw / params.fontWidth);
      guide.setAttribute("x", d.x - dx);
      guide.setAttribute("width", w);
      guide.style.display = "block";
    };

    //// main
    const svg_dom = this.root.querySelector("#protein_browser_svg");
    const svg = d3.select(svg_dom);
    svg_dom.style.width = params.svgWidth + "px";
    params.mouseOnElement = false;
    svg.on("mouseover", function(){ params.mouseOnElement = true;});
    svg.on("mouseout", function(){ params.mouseOnElement = false;});

    const data = await fetch(api + get_params).then(res => res.json());

    this.root.querySelector("#loading").style.display = "none";
    params.seqArea = params.svgWidth - params.marginLeft - params.marginRight;
    params.seq = data.seq;
    params.seqSp = data.seq.replace(/(\w)/g, "$1 ").replace(/ $/, "");
    params.seqLen = data.seq.length;
    params.fontWidth = params.fontScaleX * 10 * 2; // font 依存
    params.maxScale = Math.round(params.seqLen / params.seqArea * params.fontWidth * 100) / 100;
    
    track_init(svg, params);
    if (data.variant[0]) track_pin(svg, params, data.variant, "Missense variants", "track_variant");
    if (data.phospho[0]) track_bar(svg, params, data.phospho, "Phosphorylations in jPOST", "track_phospho");
    if (data.glycan[0])  track_pin(svg, params, data.glycan, "Glycosylations in GlyCosmos", "track_glyco");
    if (data.uniprot[0]) track_pin(svg, params, data.uniprot, "Annotations in UniProt", "track_uniprot");

    svg_dom.querySelectorAll("text.aaseq").forEach((el) => {
      el.setAttribute("transform", "scale(" + params.fontScaleX + ",1)");
    });
  }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
	__proto__: null,
	'default': GeneProteinBrowser
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-protein-browser",
	"stanza:label": "Protein browser for gene page",
	"stanza:definition": "Protein browser for gene page",
	"stanza:license": "MIT",
	"stanza:author": "moriya_dbcls",
	"stanza:contributor": [
],
	"stanza:created": "2024-11-21",
	"stanza:updated": "2024-11-21",
	"stanza:parameter": [
	{
		"stanza:key": "hgnc_id",
		"stanza:type": "string",
		"stanza:example": "2433",
		"stanza:description": "HGNC ID",
		"stanza:required": true
	},
	{
		"stanza:key": "togovar_target",
		"stanza:type": "string",
		"stanza:example": "stg-grch38",
		"stanza:description": "TogoVar target stage",
		"stanza:required": true
	},
	{
		"stanza:key": "jpost_endpoint",
		"stanza:type": "string",
		"stanza:example": "https://tools.jpostdb.org/proxy/sparql",
		"stanza:description": "jPOST SPARQL endpoint",
		"stanza:required": true
	},
	{
		"stanza:key": "glycosmos_endpoint",
		"stanza:type": "string",
		"stanza:example": "https://ts.glycosmos.org/sparql",
		"stanza:description": "GlyCosmos SPARQL endpoint",
		"stanza:required": true
	}
],
	"stanza:menu-placement": "bottom-right",
	"stanza:style": [
	{
		"stanza:key": "--greeting-color",
		"stanza:type": "color",
		"stanza:default": "#eb7900",
		"stanza:description": "text color of greeting"
	},
	{
		"stanza:key": "--greeting-align",
		"stanza:type": "single-choice",
		"stanza:choice": [
			"left",
			"center",
			"right"
		],
		"stanza:default": "center",
		"stanza:description": "text align of greeting"
	}
],
	"stanza:incomingEvent": [
],
	"stanza:outgoingEvent": [
]
};

var templates = [
  ["stanza.html.hbs", {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div id=\"draw_area\">\n  <div id=\"loading\"><span id=\"togovar_loading_icon\"></span></div>\n  <svg id=\"protein_browser_svg\" height=\"0px\"></svg>\n  <div id=\"popup_info\"></div>\n</div>\n";
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-protein-browser.js.map
