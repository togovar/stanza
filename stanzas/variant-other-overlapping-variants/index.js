import Stanza from "togostanza/stanza";

import {transformRecord} from "@/lib/display";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_other_alternative_alleles?tgv_id=${this.params.tgv_id}`)

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
      let records = json.data ? json.data.filter(x => x.id !== this.params.tgv_id) : [];

      records.forEach(record => transformRecord(record, this.params.assembly));

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
