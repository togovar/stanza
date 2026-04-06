import {
  ALPHAMISSENSE,
  CONSEQUENCE,
  POLYPHEN,
  SIFT,
  SO,
  ensureAllDatasets,
} from "./constants";
import { buildFrequencyDisplay } from "./frequency";

const floatFormatter = (digits) => {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const fractionDigits3 = floatFormatter(3);

const toNumericValue = (value) => {
  return Number.parseFloat(String(value));
};

export const refAlt = (ref, alt) => {
  const refLength = ref?.length || 0;
  const altLength = alt?.length || 0;

  let compactRef = ref || "";
  let compactAlt = alt || "";

  if (refLength > 4) {
    compactRef = `${compactRef.slice(0, 4)}...`;
  }
  if (altLength > 4) {
    compactAlt = `${compactAlt.slice(0, 4)}...`;
  }

  return {
    ref: compactRef,
    alt: compactAlt,
    ref_length: refLength,
    alt_length: altLength,
  };
};

export const variantType = (accession) => ({
  type: SO[String(accession)]?.label || "Unknown",
});

export const consequence = (accession) => ({
  most_severe_consequence: CONSEQUENCE[String(accession)]?.label || "",
});

export const alphaMissense = (value) => {
  const numericValue = toNumericValue(value);
  if (Number.isNaN(numericValue)) {
    return {};
  }

  const rank =
    numericValue > 0.564
      ? ALPHAMISSENSE.likely_pathogenic
      : numericValue >= 0.34
        ? ALPHAMISSENSE.ambiguous
        : ALPHAMISSENSE.likely_benign;

  return {
    alpha_missense: fractionDigits3.format(numericValue),
    alpha_missense_class: rank?.key,
    alpha_missense_label: rank?.label,
  };
};

export const sift = (value) => {
  const numericValue = toNumericValue(value);
  if (Number.isNaN(numericValue)) {
    return {};
  }

  const rank = numericValue >= 0.05 ? SIFT.tolerated : SIFT.deleterious;

  return {
    sift: fractionDigits3.format(numericValue),
    sift_class: rank?.key,
    sift_label: rank?.label,
  };
};

export const polyphen = (value) => {
  const numericValue = toNumericValue(value);
  if (Number.isNaN(numericValue)) {
    return {};
  }

  let rank = POLYPHEN.unknown;
  if (numericValue > 0.908) {
    rank = POLYPHEN.probably_damaging;
  } else if (numericValue > 0.446) {
    rank = POLYPHEN.possibly_damaging;
  } else {
    rank = POLYPHEN.benign;
  }

  return {
    polyphen: fractionDigits3.format(numericValue),
    polyphen_class: rank?.key,
    polyphen_label: rank?.label,
  };
};

const hasNumericValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !Number.isNaN(Number(value))
  );
};

/**
 * ≥1 Alt/Alt (homozygote) および ≥1 Alt hemizygote アイコンの表示判定に使用する。
 */
const isPositiveNumeric = (value) =>
  hasNumericValue(value) && Number(value) >= 1;

/**
 * 各頻度エントリに表示用フォーマットとアイコン表示フラグを付与する。
 *
 * - ≥1 Alt/Alt (homozygote): aac が 1 以上のとき has_homozygote_marker = true
 * - ≥1 Alt hemizygote:       hac / hrc / hoc のいずれかが 1 以上のとき has_hemizygote_marker = true
 */
const enrichFrequencyEntry = (entry) => {
  Object.assign(entry, buildFrequencyDisplay(entry.ac, entry.af), {
    has_homozygote_marker: isPositiveNumeric(entry.aac),
    has_hemizygote_marker:
      isPositiveNumeric(entry.hac) ||
      isPositiveNumeric(entry.hrc) ||
      isPositiveNumeric(entry.hoc),
  });
};

/**
 * 臨床的意義エントリを表示用に整形する。
 * - 2 件以上ある場合は significance_badge（残件数+）を付与
 * - 先頭エントリの疾患名・解釈を record.significance に展開
 */
const enrichSignificance = (record) => {
  const entries = Array.isArray(record.significance)
    ? record.significance
    : undefined;

  if (!entries) return;

  if (entries.length > 1) {
    record.significance_badge = `${entries.length - 1}+`;
  }

  const firstCondition = entries[0]?.conditions?.[0]?.name;
  const firstInterpretation = entries[0]?.interpretations?.[0];

  if (firstCondition && firstInterpretation) {
    record.significance = {
      condition: firstCondition,
      interpretation: firstInterpretation,
    };
  }
};

/**
 * スタンザ描画用にバリアントレコードを正規化する。
 * 複数のスタンザで共有し、表示ロジックを一元管理する。
 */
export const transformRecord = (record, assembly) => {
  // バリアント種別・Ref/Alt 表記を付与
  Object.assign(record, variantType(record.type));
  Object.assign(record, refAlt(record.reference, record.alternate));

  // dbSNP ID を先頭 existing_variation から取得
  if (record.existing_variations?.length) {
    record.dbsnp = record.existing_variations[0];
  }

  // 全データセット分の頻度スロットを補完してから各エントリを整形
  record.frequencies = ensureAllDatasets(record.frequencies, assembly);
  record.frequencies.forEach(enrichFrequencyEntry);

  // Most severe consequence ラベルを付与
  Object.assign(record, consequence(record.most_severe_consequence));

  // トランスクリプトが複数ある場合はバッジ（残件数+）を付与
  if (record.transcripts && record.transcripts.length > 1) {
    record.consequence_badge = `${record.transcripts.length - 1}+`;
  }

  // 機能予測スコアを整形
  Object.assign(record, sift(record.sift));
  Object.assign(record, polyphen(record.polyphen));

  // 臨床的意義を整形
  enrichSignificance(record);

  return record;
};
