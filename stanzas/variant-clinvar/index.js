import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import {CLINICAL_SIGNIFICANCE, REVIEW_STATUS} from "@/lib/constants";
import {rowSpanize} from "@/lib/table";

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_clinvar?tgv_id=${this.params.tgv_id}`);

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
      let bindings = unwrapValueFromBinding(json);

      bindings.forEach(function (binding) {
        binding.stars = REVIEW_STATUS[binding.review_status]?.stars || 0;
        binding.significance_class = CLINICAL_SIGNIFICANCE[binding.interpretation?.toLowerCase()]?.key;
        binding.condition = {
          label: binding.condition,
          url: "https://identifiers.org/medgen:".concat(binding.medgen),
        };
      });
      return {result: bindings};
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
    });

    rowSpanize(this.root.querySelector("#target"));
  }
}
