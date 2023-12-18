import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import {alphaMissense, sift, polyphen} from "@/lib/display";

export default class VariantTranscript extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/variant_transcript?tgv_id=${this.params.tgv_id}`);

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
      const bindings = unwrapValueFromBinding(json);

      bindings.forEach(binding => {
        binding.transcript = {
          label: binding.transcript ? binding.transcript.split("/").reverse()[0] : "",
          url: binding.enst_id ? "http://identifiers.org/ensembl/".concat(binding.enst_id) : null
        };
        binding.consequence_label = binding.consequence_label.split(",");

        Object.assign(binding, alphaMissense(binding.alpha_missense));
        Object.assign(binding, sift(binding.sift));
        Object.assign(binding, polyphen(binding.polyphen));
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
  }
}
