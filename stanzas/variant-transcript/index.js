import {polyphen, sift} from "../../lib/display";

export default async function variantTranscript(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  let sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_transcript?tgv_id=${params.tgv_id}`);

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

    bindings.forEach(binding => {
      binding.transcript = {
        label: binding.transcript ? binding.transcript.split("/").reverse()[0] : "",
        url: binding.enst_id ? "http://identifiers.org/ensembl/".concat(binding.enst_id) : null
      };
      binding.consequence_label = binding.consequence_label.split(",");

      Object.assign(binding, sift(binding.sift));
      Object.assign(binding, polyphen(binding.polyphen));
    });

    return {result: bindings};
  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });
}
