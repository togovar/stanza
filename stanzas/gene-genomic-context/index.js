export default async function geneJbrowse(stanza, params) {
  const r = await stanza.query({
    template: "fetch_position.rq",
    parameters: params,
    endpoint: params?.ep || "/sparql",
  }).then(data => {
    const binding = stanza.unwrapValueFromBinding(data)[0];

    if (!binding) {
      return {error: {message: `Failed to obtain genomic position for ${params.hgnc_id}`}};
    }

    const type = binding.type;
    const chr = binding.chromosome;
    const start = parseInt(binding.start);
    const stop = parseInt(binding.stop);
    const range = 200;

    if (type.match("SO_0000159")) {
      start = start - 1;
    } else if (type.match("SO_0000667")) {
      stop = stop - 1;
    }


    const src = (params.jbrowse ? params.jbrowse : "/jbrowse").concat(
      "/index.html?data=", encodeURIComponent("data/" + params.assembly),
      "&loc=", encodeURIComponent(`${chr}:${start - range}..${stop + range}`),
      "&highlight=", encodeURIComponent(`${chr}:${start}..${stop}`));

    return {
      result: {
        src: src,
        width: params.width || "100%",
        height: params.height || "600px",
      },
    };
  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: 'stanza.html.hbs',
    parameters: {
      params: params,
      ...r,
    },
  });
}
