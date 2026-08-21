import Stanza from "togostanza/stanza";

import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import {
  buildIdentifierQueryString,
  describeVariantIdentifier,
  fetchSparqlBindings,
} from "@/lib/sparqlist";
import { fetchVariantDataByIdentifier } from "@/lib/togovar-variant";
import type { SparqlistStanzaParams } from "@/lib/types";
import { assertValidVariantIdentifier, parseVariantParam } from "@/lib/variant";

interface VariantHeaderParams extends SparqlistStanzaParams {
  "data-url"?: string;
}

interface Tgv2RsBinding {
  rs?: string;
}

interface RefLink {
  label: string;
  url: string;
}

interface XrefGroup {
  name: string;
  refs: RefLink[];
}

interface TemplateRenderParams {
  params: VariantHeaderParams;
  result?: {
    xrefs: XrefGroup[];
  };
  error?: {
    message: string;
  };
}

const buildEmptyResult = (): TemplateRenderParams["result"] => ({
  xrefs: [],
});

const buildResultFromTgv2rsBindings = (
  results: Tgv2RsBinding[],
): TemplateRenderParams["result"] => {
  const rsUrls = Array.from(
    new Set(results.map((result) => result.rs).filter(Boolean)),
  ) as string[];

  if (rsUrls.length === 0) {
    return buildEmptyResult();
  }

  return {
    xrefs: [
      {
        name: "RefSNP ID",
        refs: rsUrls.map((rsUrl) => ({
          label: rsUrl.split("/").slice(-1)[0],
          url: rsUrl,
        })),
      },
    ],
  };
};

export default class VariantHeader extends Stanza {
  async render(): Promise<void> {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = (this.params ?? {}) as VariantHeaderParams;
    const parsedVariant = parseVariantParam(params.variant);
    const templateParams: TemplateRenderParams = { params };

    try {
      assertValidVariantIdentifier(
        params.tgv_id,
        params.variant,
        parsedVariant,
      );

      let tgvId = params.tgv_id;
      if (!tgvId) {
        if (!params["data-url"]) {
          throw new Error(
            "data-url parameter is required when variant is given without tgv_id",
          );
        }

        const variantData = await fetchVariantDataByIdentifier(
          params["data-url"],
          tgvId,
          parsedVariant,
          describeVariantIdentifier(params),
        );

        // TogoVar未登録variantは検索API上で見つかっても id が空のことがある。
        // tgv2rs は空クエリだと endpoint 側のデフォルトIDへフォールバックし得るため、
        // 解決済み tgv_id が無い場合は RefSNP なしとして終了する。
        if (!variantData.id) {
          templateParams.result = buildEmptyResult();
          this.renderTemplate({
            template: "stanza.html.hbs",
            parameters: templateParams,
          });
          return;
        }

        tgvId = variantData.id;
      }

      // tgv2rs は variant を解釈しないため、必ず解決済みの tgv_id だけを渡す。
      const queryString = buildIdentifierQueryString({ tgv_id: tgvId });
      const sparqlist = (params.sparqlist || "/sparqlist").concat(
        `/api/tgv2rs?${queryString}`,
      );

      const bindings = await fetchSparqlBindings<Tgv2RsBinding>(sparqlist);
      templateParams.result = buildResultFromTgv2rsBindings(bindings);
    } catch (reason) {
      templateParams.error = {
        message: reason instanceof Error ? reason.message : String(reason),
      };
    }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: templateParams,
    });
  }
}
