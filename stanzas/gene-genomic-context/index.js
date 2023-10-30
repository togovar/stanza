import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

export default class GeneJbrowse extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_genomic_context?hgnc_id=${this.params.hgnc_id}`);

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
        return {error: {message: `Failed to obtain genomic position for ${this.params.hgnc_id}`}};
      }

      const chr = binding.chromosome;
      const start = parseInt(binding.start);
      const stop = parseInt(binding.stop);
      const margin = Math.max((stop - start) * ((parseInt(this.params.margin) || 10) / 100.0), 50);

      const src = (this.params.jbrowse ? this.params.jbrowse : "/jbrowse").concat(
        "/index.html?loc=", encodeURIComponent(`${chr}:${start - margin}..${stop + margin}`),
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
      template: 'stanza.html.hbs',
      parameters: {
        params: this.params,
        ...r,
      },
    });
  }
}
