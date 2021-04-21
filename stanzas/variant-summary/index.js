import uniq from "../../lib/uniq.js";
import * as display from "../../lib/display.js";

export default async function variantSummary(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  let sparqlist = (params?.sparqlist || "/sparqlist").concat(`/api/variant_summary?tgv_id=${params.tgv_id}`);

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
    let bindings = stanza.unwrapValueFromBinding(json);
    let binding = bindings[0];

    if (binding) {
      [binding.chr, binding.assembly] = binding.reference.split("/").slice(-2);
      binding.position = binding.label.split("-")[1];

      Object.assign(binding, display.refAlt(binding.ref, binding.alt));

      binding.hgvs = uniq(stanza.grouping(bindings, "hgvs").filter(v => v));
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
