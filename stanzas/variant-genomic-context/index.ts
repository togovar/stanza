import Stanza from "togostanza/stanza";

import { referenceToChrAssembly } from "@/lib/display";
import {
  buildIdentifierQueryString,
  describeVariantIdentifier,
  fetchSparqlBindings,
} from "@/lib/sparqlist";
import type {
  SparqlistStanzaParams,
  SparqlistTemplateRenderParams,
} from "@/lib/types";
import {
  assertValidVariantIdentifier,
  normalizeChromosome,
  parseVariantParam,
} from "@/lib/variant";
import type { ParsedVariant } from "@/lib/variant";

interface VariantGenomicContextParams extends SparqlistStanzaParams {
  assembly?: string;
  jbrowse?: string;
  margin?: string | number;
  width?: string;
  height?: string;
}

interface VariantSummaryBinding {
  reference?: string;
  position?: string;
  ref?: string;
}

interface GenomicPosition {
  chr: string;
  from: number;
  to: number;
}

interface JbrowseDisplayParams {
  src: string;
  width: string;
  height: string;
}

interface TemplateRenderParams
  extends SparqlistTemplateRenderParams<JbrowseDisplayParams> {
  params: VariantGenomicContextParams;
}

/**
 * variant_summary の binding から JBrowse 表示用の座標を取り出す。
 * SPARQList 結果は reference URI と position/ref が分かれて返るため、
 * reference URI を chr/assembly に分解し、Ref の長さからハイライト終端を計算する。
 */
const buildGenomicPositionFromBinding = (
  binding: VariantSummaryBinding,
): GenomicPosition => {
  const { chr } = referenceToChrAssembly(binding.reference);
  const from = Number(binding.position);

  if (!chr || !Number.isSafeInteger(from) || from < 1 || !binding.ref) {
    throw new Error("Failed to obtain genomic position");
  }

  return {
    chr,
    from,
    to: from + Math.max(binding.ref.length - 1, 0),
  };
};

/**
 * SPARQList に summary 行が無い variant-only 入力向けの fallback。
 * VCF表記の variant には CHROM/POS/REF/ALT が含まれるため、遺伝子情報などは無くても
 * JBrowse の表示範囲とハイライト範囲だけは組み立てられる。
 */
const buildGenomicPositionFromVariant = (
  parsedVariant: ParsedVariant,
): GenomicPosition => {
  const from = Number(parsedVariant.position);
  if (!Number.isSafeInteger(from) || from < 1) {
    throw new Error("Failed to obtain genomic position");
  }

  const chr = normalizeChromosome(parsedVariant.chromosome);
  if (!chr) {
    throw new Error("Failed to obtain genomic position");
  }

  return {
    chr,
    from,
    to: from + Math.max(parsedVariant.reference.length - 1, 0),
  };
};

/**
 * JBrowse iframe の src を組み立てる。
 * loc は前後 margin を含む表示範囲、highlight は実際のvariant範囲として分けて渡す。
 */
const buildJbrowseSrc = (
  params: VariantGenomicContextParams,
  { chr, from, to }: GenomicPosition,
): string => {
  const range = Number.parseInt(String(params.margin), 10) || 50;
  const baseUrl = params.jbrowse || "/jbrowse";
  const start = Math.max(from - range, 1);

  return baseUrl.concat(
    "/index.html?loc=",
    encodeURIComponent(`${chr}:${start}..${to + range}`),
    "&highlight=",
    encodeURIComponent(`chr${chr}:${from}..${to}`),
  );
};

export default class VariantGenomicContext extends Stanza {
  /**
   * variant_summary を優先して座標を取得し、空結果の場合だけ variant 文字列から fallback する。
   * tgv_id がある場合は SPARQList の解決結果を信頼し、別の variant 値へは fallback しない。
   */
  async render(): Promise<void> {
    const params = (this.params ?? {}) as VariantGenomicContextParams;
    const parsedVariant = parseVariantParam(params.variant);
    const templateParams: TemplateRenderParams = { params };

    try {
      assertValidVariantIdentifier(
        params.tgv_id,
        params.variant,
        parsedVariant,
      );

      const queryString = buildIdentifierQueryString(params);
      const sparqlist = (params.sparqlist || "/sparqlist").concat(
        `/api/variant_summary?${queryString}`,
      );

      const bindings =
        await fetchSparqlBindings<VariantSummaryBinding>(sparqlist);
      const binding = bindings[0];

      const genomicPosition = this.buildGenomicPosition(
        params,
        parsedVariant,
        binding,
      );

      templateParams.result = {
        src: buildJbrowseSrc(params, genomicPosition),
        width: params.width || "100%",
        height: params.height || "600px",
      };
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

  /**
   * SPARQList のbindingを座標に変換し、空結果や不完全なbindingの場合は fallback を試す。
   * staging/local のSPARQList差分や未登録variantでも、variant-onlyならJBrowse表示を維持するため。
   */
  private buildGenomicPosition(
    params: VariantGenomicContextParams,
    parsedVariant: ParsedVariant | undefined,
    binding: VariantSummaryBinding | undefined,
  ): GenomicPosition {
    if (!binding) {
      return this.buildFallbackPosition(params, parsedVariant);
    }

    try {
      return buildGenomicPositionFromBinding(binding);
    } catch (error) {
      if (!params.tgv_id && parsedVariant) {
        console.warn(error);
        return this.buildFallbackPosition(params, parsedVariant);
      }

      throw error;
    }
  }

  /**
   * SPARQList が空結果だった場合の座標 fallback を判断する。
   * tgv_id と variant が両方ある場合は tgv_id 優先という全体方針に合わせ、
   * tgv_id 無しの variant-only 入力だけ variant 由来の座標を使う。
   */
  private buildFallbackPosition(
    params: VariantGenomicContextParams,
    parsedVariant: ParsedVariant | undefined,
  ): GenomicPosition {
    if (!params.tgv_id && parsedVariant) {
      // variant には座標とRef/Altが含まれるため、SPARQListにsummary行が無い未登録variantでも
      // JBrowseの表示範囲だけは組み立てられる。
      return buildGenomicPositionFromVariant(parsedVariant);
    }

    throw new Error(
      `Failed to obtain genomic position for ${describeVariantIdentifier(
        params,
      )}`,
    );
  }
}
