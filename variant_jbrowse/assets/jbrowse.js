function display(container, ref, disp_start, disp_end) {
  var frame_height = 600;
  var jbrowse_url = "/browse/?data=togovar&loc=" + ref + "%3A" + disp_start + ".." + disp_end;

  d3.select(container)
    .append("div")
    .attr("id", "jbrowse")
    .style("height", (frame_height - 30) + "px")
    .style("border-radius", "4px")
    .style("box-shadow", "0 2px 2px rgba(0,0,0,0.2)")
    .append("iframe")
    .attr("id", "jbrowse-frame")
    .attr("src", String(jbrowse_url))
    .attr("frameborder", 0)
    .attr("width", "100%")
    .attr("height", (frame_height - 30) + "px");
}