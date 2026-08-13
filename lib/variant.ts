// ============================================================
// variant パラメータ(VCF表記 CHROM-POS-REF-ALT)共通処理
// tgv_id を持たないバリアント（TogoVar未登録）を chromosome/position/reference/alternate
// で解決するために、複数stanza(variant-other-overlapping-variants, variant-links)から使う。
// ============================================================

/** variant パラメータを分解した結果。 */
export interface ParsedVariant {
  chromosome: string;
  position: string;
  reference: string;
  alternate: string;
}

/**
 * variant パラメータ(例: "1-12345-A-T")を CHROM/POS/REF/ALT に分解する。
 * ハイフン区切りが4要素ぴったりでない(いずれかが空になる)場合は解決不能とみなし undefined を返す。
 */
export const parseVariantParam = (
  variant: string | undefined,
): ParsedVariant | undefined => {
  if (!variant) {
    return undefined;
  }

  const parts = variant.split("-");
  if (parts.length !== 4) {
    return undefined;
  }

  const [chromosome, position, reference, alternate] = parts;
  if (!chromosome || !position || !reference || !alternate) {
    return undefined;
  }

  if (!Number.isFinite(Number(position))) {
    return undefined;
  }

  return {
    chromosome,
    position,
    reference: reference.toUpperCase(),
    alternate: alternate.toUpperCase(),
  };
};

/** "chr1" と "1" のような表記揺れを吸収するため、先頭の "chr" プレフィックスを取り除く。 */
export const normalizeChromosome = (
  chromosome: string | undefined,
): string => String(chromosome ?? "").replace(/^chr/i, "").toUpperCase();

/**
 * tgv_id が無い場合に variant の有無と形式を検証する。
 * 未指定と malformed を分けて、ユーザーが入力ミスを直しやすいエラーにする。
 */
export const assertValidVariantIdentifier = (
  tgvId: string | undefined,
  variant: string | undefined,
  parsedVariant: ParsedVariant | undefined,
): void => {
  if (tgvId) {
    return;
  }

  if (!variant) {
    throw new Error("tgv_id or variant parameter is required");
  }

  if (!parsedVariant) {
    throw new Error("variant parameter must use CHROM-POS-REF-ALT notation");
  }
};
