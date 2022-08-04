import Stanza from "togostanza/stanza";
import uniq from "@/lib/uniq";
import {unwrapValueFromBinding} from "togostanza/utils";

export default class GeneSummary extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_summary?hgnc_id=${this.params.hgnc_id}`);

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
      const binding = bindings[0];

      return {
        result: {
          hgnc_url: binding.hgnc_uri,
          approved_name: uniq(bindings.map(x => x.approved_name)).join(','),
          ensembl_url: binding.ensg,
          ensembl: binding.ensg ? binding.ensg.split('/').slice(-1)[0] : null,
          alias: uniq(bindings.map(x => x.alias)).join(','),
          ncbi_gene_url: binding.ncbigene,
          ncbi_gene: binding.ncbigene ? binding.ncbigene.split('/').slice(-1)[0] : null,
          location: uniq(bindings.map(x => x.chromosomal_location)).join(','),
          refseq_url: binding.refseq,
          refseq: binding.refseq ? binding.refseq.split('/').slice(-1)[0] : null,
        }
      };
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        params: this.params,
        ...r,
      }
    });
  }
}
