import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import uniq from "@/lib/uniq";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";

export default class VariantHeader extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?tgv_id=${this.params.tgv_id}`);

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

      if (!results) {
        return {result: {xrefs: {}}};
      }

      return {
        result: {
          xrefs: [
            {
              name: "RefSNP ID",
              refs: uniq(results.map(x => x.rs)).map(x => ({label: x.split("/").slice(-1)[0], url: x})),
            },
          ],
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
