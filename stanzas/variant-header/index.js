import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import uniq from "@/lib/uniq";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";
import {buildIdentifierQueryString} from "@/lib/sparqlist";

export default class VariantHeader extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    // tgv_id が無いバリアント（TogoVar未登録）は variant(CHROM-POS-REF-ALT) で解決する。
    // sparqlist側は tgv_id があれば優先し、無ければ variant を使う。
    const queryString = buildIdentifierQueryString(this.params);
    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);

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
