import Stanza from "togostanza/stanza";

import {transformRecord} from "@/lib/display";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";
import {buildIdentifierQueryString} from "@/lib/sparqlist";
import {normalizeChromosome, parseVariantParam} from "@/lib/variant";

const isInputVariant = (record, params) => {
  if (params.tgv_id && record.id === params.tgv_id) {
    return true;
  }

  const variant = parseVariantParam(params.variant);
  if (!variant) {
    return false;
  }

  return normalizeChromosome(record.chromosome) === normalizeChromosome(variant.chromosome) &&
    String(record.position) === variant.position &&
    String(record.reference) === variant.reference &&
    String(record.alternate) === variant.alternate;
};

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    // tgv_id が無いバリアント（TogoVar未登録）は variant(CHROM-POS-REF-ALT) で解決する。
    // sparqlist側は tgv_id があれば優先し、無ければ variant を使う。
    const queryString = buildIdentifierQueryString(this.params ?? {});
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_other_alternative_alleles?${queryString}`)

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
      let records = json.data ? json.data.filter(x => !isInputVariant(x, this.params)) : [];

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
