import Stanza from "togostanza/stanza";

import {transformRecord} from "@/lib/display";

export default class GeneVariant extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/gene_variant?hgnc_id=${this.params.hgnc_id}`);

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
      let  records = json.data ? json.data.filter(x => x.symbols.find(y => y.id !== this.params.hgnc_id)) : [];

      records.forEach(record => {
        transformRecord(record);

        if (record.existing_variations) {
          record.dbsnp = record.existing_variations[0];
        }
        if (record.existing_variations && record.existing_variations.length > 1){
          record.dbsnp_badge = `${record.existing_variations.length - 1}+`;
        }
      });

      return {result: {data: records}};
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
