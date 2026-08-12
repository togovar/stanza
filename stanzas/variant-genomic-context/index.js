import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import {referenceToChrAssembly} from "@/lib/display";
import {buildIdentifierQueryString, describeVariantIdentifier, requireFirstBinding} from "@/lib/sparqlist";

export default class VariantSummary extends Stanza {
  async render() {
    // tgv_id が無いバリアント（TogoVar未登録）は variant(CHROM-POS-REF-ALT) で解決する。
    // sparqlist側は tgv_id があれば優先し、無ければ variant を使う。
    const queryString = buildIdentifierQueryString(this.params ?? {});
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_summary?${queryString}`);

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
      const binding = requireFirstBinding(
        unwrapValueFromBinding(data),
        `Failed to obtain genomic position for ${describeVariantIdentifier(this.params ?? {})}`,
      );

      const { chr } = referenceToChrAssembly(binding.reference);
      const from = parseInt(binding.position);
      const to = from + Math.max(binding.ref.length - 1, 0);
      const range = parseInt(this.params.margin) || 50;

      const src = (this.params.jbrowse ? this.params.jbrowse : "/jbrowse").concat(
        "/index.html?loc=", encodeURIComponent(`${chr}:${from - range}..${to + range}`),
        "&highlight=", encodeURIComponent(`${chr}:${from}..${to}`));

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
