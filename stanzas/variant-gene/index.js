import Stanza from "togostanza/stanza";
import {grouping, unwrapValueFromBinding} from "togostanza/utils";

import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";

export default class VariantGene extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    // tgv_id が無いバリアント（TogoVar未登録）は variant(CHROM-POS-REF-ALT) で解決する。
    // sparqlist側は tgv_id があれば優先し、無ければ variant を使う。
    const queryString = new URLSearchParams({
      tgv_id: this.params?.tgv_id ?? "",
      variant: this.params?.variant ?? "",
    }).toString();
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_gene?${queryString}`);

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

      if (binding?.hgnc) {
        const hgnc_id = binding.hgnc.split('/').slice(-1)[0]; // TODO: fix sparqlist
        const href = `/gene/${hgnc_id}`

        binding.symbol = Array.from(new Set(grouping(bindings, "symbol").filter(v => v))).map(v => ({
          href: href,
          value: v
        }));
        binding.synonym = Array.from(new Set(grouping(bindings, "synonym").filter(v => v)));
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
