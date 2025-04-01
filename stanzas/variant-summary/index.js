import Stanza from "togostanza/stanza";
import {grouping, unwrapValueFromBinding} from "togostanza/utils";

import uniq from "@/lib/uniq";
import * as display from "@/lib/display";

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_summary?tgv_id=${this.params.tgv_id}`);

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
      let binding = bindings[0];

      if (binding) {
        [binding.chr, binding.assembly] = binding.reference.split("/").slice(-2);

        Object.assign(binding, display.refAlt(binding.ref, binding.alt));
      }

      return {result: {...binding}};
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
    });
  }
}
