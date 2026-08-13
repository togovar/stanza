import Stanza from "togostanza/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import uniq from "@/lib/uniq";
import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";
import {buildIdentifierQueryString, describeVariantIdentifier} from "@/lib/sparqlist";
import {fetchVariantDataByIdentifier} from "@/lib/togovar-variant";
import {parseVariantParam} from "@/lib/variant";

export default class VariantHeader extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params ?? {};
    const parsedVariant = parseVariantParam(params.variant);

    const r = await Promise.resolve().then(async () => {
      if (!params.tgv_id && !parsedVariant) {
        throw new Error("tgv_id or variant parameter is required");
      }

      let tgvId = params.tgv_id;
      if (!tgvId) {
        if (!params["data-url"]) {
          throw new Error("data-url parameter is required when variant is given without tgv_id");
        }

        const variantData = await fetchVariantDataByIdentifier(
          params["data-url"],
          tgvId,
          parsedVariant,
          describeVariantIdentifier(params),
        );
        tgvId = variantData.id;
      }

      // tgv2rs は variant を解釈しないため、必ず解決済みの tgv_id だけを渡す。
      const queryString = buildIdentifierQueryString({ tgv_id: tgvId });
      const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);

      return fetch(sparqlist, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
    }).then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error("tgv2rs returns status " + res.status);
    }).then(data => {
      const results = unwrapValueFromBinding(data);

      if (!results?.length) {
        return {result: {xrefs: {}}};
      }

      return {
        result: {
          xrefs: [
            {
              name: "RefSNP ID",
              refs: uniq(results.map(x => x.rs).filter(x => x))
                .map(x => ({label: x.split("/").slice(-1)[0], url: x})),
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
