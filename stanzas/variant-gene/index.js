export default async function variantGene(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  let sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_gene?tgv_id=${params.tgv_id}`);

  if (params.assembly) {
    sparqlist = sparqlist.concat("&assembly=" + encodeURIComponent(params.assembly))
  }

  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep));
  }

  const r = await fetch(sparqlist, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  }).then(res => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(sparqlist + " returns status " + res.status);
  }).then(json => {
    const bindings = stanza.unwrapValueFromBinding(json);
    const binding = bindings[0];

    if (binding) {
      const hgnc_id = binding.hgnc.split('/').slice(-1)[0]; // TODO: fix sparqlist
      const href = `/gene/${hgnc_id}`

      binding.symbol = Array.from(new Set(stanza.grouping(bindings, "symbol").filter(v => v))).map(v => ({ href: href, value: v }));
      binding.synonym = Array.from(new Set(stanza.grouping(bindings, "synonym").filter(v => v)));
    }

    return {result: {...binding}};
  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });
}
