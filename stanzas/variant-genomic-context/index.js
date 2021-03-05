export default async function variantSummary(stanza, params) {
  const r = await stanza.query({
    template: "fetch_position.rq",
    parameters: params,
    endpoint: params?.ep || "/sparql",
  }).then(data => {
    const binding = stanza.unwrapValueFromBinding(data)[0];

    if (!binding) {
      return {error: {message: `Failed to obtain genomic position for ${params.tgv_id}`}};
    }

    const chr = binding.label.split("-")[0];
    const position = parseInt(binding.label.split("-")[1]);
    const range = parseInt(params.margin) || 50;

    const src = (params.jbrowse ? params.jbrowse : "/jbrowse").concat(
      "/index.html?data=", encodeURIComponent("data/" + params.assembly),
      "&loc=", encodeURIComponent(`${chr}:${position - range}..${position + range}`),
      "&highlight=", encodeURIComponent(`${chr}:${position}..${position}`));

    return {
      result: {
        src: src,
        width: params.width || "100%",
        height: params.height || "600px",
      },
    };
  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });
}
