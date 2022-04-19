import Stanza from "togostanza/stanza";
import {grouping, unwrapValueFromBinding} from "togostanza/utils";

export default class DiseaseHeader extends Stanza {
  async render() {
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/disease_header?medgen_cid=${this.params.medgen_cid}`);

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
      const results = unwrapValueFromBinding(data);

      let xrefs;
      if (results && results.length > 0) {
        xrefs = [{
          name: "Disease Report",
          refs: Array.from(new Set(grouping(results, "xref").filter(v => v))).map(x => ({label: x})),
          approved_name: Array.from(new Set(grouping(results, "approved_name").filter(v => v))).map(x => ({label: x})),
        }];
      }

      return {result: {xrefs: xrefs}};
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
