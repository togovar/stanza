import {CLINICAL_SIGNIFICANCE, REVIEW_STATUS} from "@/lib/constants";
import * as table from "@/lib/table";

export default async function variantSummary(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  const sparqlist = (params?.sparqlist || "/sparqlist")
    .concat(`/api/variant_clinvar?tgv_id=${params.tgv_id}`)
    .concat(params.ep ? `&ep=${encodeURIComponent(params.ep)}` : "");

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

    bindings.forEach(function (binding) {
      binding.significance_class = CLINICAL_SIGNIFICANCE[binding.interpretation?.toLowerCase()]?.key;
      binding.stars = REVIEW_STATUS[binding.review_status]?.stars || 0;
      binding.condition = {
        label: binding.condition,
        url: "https://identifiers.org/medgen:".concat(binding.medgen),
      };
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

  table.rowSpanize(stanza.select("#target"));
}
