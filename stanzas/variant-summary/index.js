import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import * as display from "@/lib/display";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

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
        Object.assign(binding, display.referenceToChrAssembly(binding.reference));
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
