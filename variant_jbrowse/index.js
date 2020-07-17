Stanza((stanza, params) => {
  if (!params.tgv_id) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Parameter missing: tgv_id",
      }
    });
  }
  if (!params.assembly) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Parameter missing: assembly",
      }
    });
  } else if (!(params.assembly === "GRCh37" || params.assembly === "GRCh38")) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Invalid parameter: assembly=" + params.assembly,
      }
    });
  }

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_position.rq",
    parameters: params
  }).then((data) => {
    const v = stanza.unwrapValueFromBinding(data)[0];

    if (!v) {
      return stanza.render({
        template: "error.html",
        parameters: {
          params: params,
          message: "Failed to obtain genomic position for " + params.tgv_id,
        }
      });
    }

    const chr = v.label.split('-')[0];
    const position = parseInt(v.label.split('-')[1]);
    const range = parseInt(params.margin) || 50;

    const src = (params.jbrowse ? params.jbrowse : "/jbrowse").concat(
      "/index.html?data=", encodeURIComponent("data/" + params.assembly),
      "&loc=", encodeURIComponent(`${chr}:${position - range}..${position + range}`),
      "&highlight=", encodeURIComponent(`${chr}:${position}..${position}`));

    stanza.render({
      template: "stanza.html",
      parameters: {
        src: src,
        width: params.width || "100%",
        height: params.height || "600px"
      }
    });
  }).catch(function (e) {
    stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: e.message,
      }
    });
  });
});
