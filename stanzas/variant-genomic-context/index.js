import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

export default class VariantSummary extends Stanza {
  async render() {
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
    }).then(data => {
      const binding = unwrapValueFromBinding(data)[0];

      if (!binding) {
        return {error: {message: `Failed to obtain genomic position for ${this.params.tgv_id}`}};
      }

      const chr = binding.reference.split("/").slice(-2)[0];
      const start = parseInt(binding.start);
      const stop = binding.stop ? parseInt(binding.stop) : start;
      const range = parseInt(this.params.margin) || 50;

      const src = (this.params.jbrowse ? this.params.jbrowse : "/jbrowse").concat(
        "/index.html?loc=", encodeURIComponent(`${chr}:${start - range}..${stop + range}`),
        "&highlight=", encodeURIComponent(`${chr}:${start}..${stop}`));

      return {
        result: {
          src: src,
          width: this.params.width || "100%",
          height: this.params.height || "600px",
        },
      };
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
