import {
  ALPHAMISSENSE,
  CONSEQUENCE,
  POLYPHEN,
  SIFT,
  SO,
  ensureAllDatasets,
} from "./constants";
import { buildFrequencyDisplay, type NumericInput } from "./frequency";

type LabelMap = Record<string, { label?: string }>;

interface FrequencyEntry extends Record<string, unknown> {
  source?: string;
  ac?: NumericInput;
  af?: NumericInput;
  aac?: NumericInput;
  hac?: NumericInput;
  hrc?: NumericInput;
  hoc?: NumericInput;
}

interface SignificanceEntry {
  conditions?: Array<{ name?: string }>;
  interpretations?: string[];
}

interface VariantRecord extends Record<string, unknown> {
  type?: string;
  reference?: string;
  alternate?: string;
  existing_variations?: string[];
  frequencies?: FrequencyEntry[];
  most_severe_consequence?: string;
  transcripts?: unknown[];
  significance?:
    | SignificanceEntry[]
    | { condition: string; interpretation: string };
  sift?: NumericInput;
  polyphen?: NumericInput;
}

const floatFormatter = (digits: number): Intl.NumberFormat => {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const fractionDigits3 = floatFormatter(3);

const toNumericValue = (value: NumericInput): number => {
  return Number.parseFloat(String(value));
};

const hasNumericValue = (value: NumericInput): boolean => {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !Number.isNaN(Number(value))
  );
};

export const refAlt = (
  ref?: string,
  alt?: string,
): { ref: string; alt: string; ref_length: number; alt_length: number } => {
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

export const variantType = (accession?: string): { type: string } => ({
  type: (SO as LabelMap)[String(accession)]?.label || "Unknown",
});

export const consequence = (
  accession?: string,
): { most_severe_consequence: string } => ({
  most_severe_consequence:
    (CONSEQUENCE as LabelMap)[String(accession)]?.label || "",
});

export const alphaMissense = (value: NumericInput): Record<string, string> => {
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

export const sift = (value: NumericInput): Record<string, string> => {
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

export const polyphen = (value: NumericInput): Record<string, string> => {
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

/**
 * Normalize one variant record for stanza rendering.
 * This is shared across multiple stanzas to keep display behavior consistent.
 */
export const transformRecord = (
  record: VariantRecord,
  assembly: string,
): VariantRecord => {
  Object.assign(record, variantType(record.type));
  Object.assign(record, refAlt(record.reference, record.alternate));

  if (record.existing_variations?.length) {
    Object.assign(record, { dbsnp: record.existing_variations[0] });
  }

  record.frequencies = ensureAllDatasets(
    record.frequencies,
    assembly,
  ) as FrequencyEntry[];

  record.frequencies.forEach((entry) => {
    // ヘミ接合体マーカーは値が 0 の場合も表示する（データが存在することを示すため）
    const hasHemizygoteValue =
      hasNumericValue(entry.hac) ||
      hasNumericValue(entry.hrc) ||
      hasNumericValue(entry.hoc);

    Object.assign(entry, buildFrequencyDisplay(entry.ac, entry.af), {
      has_homozygote_marker: Number(entry.aac) > 0,
      has_hemizygote_marker: hasHemizygoteValue,
    });
  });

  Object.assign(record, consequence(record.most_severe_consequence));

  if (record.transcripts && record.transcripts.length > 1) {
    record.consequence_badge = `${record.transcripts.length - 1}+`;
  }

  Object.assign(record, sift(record.sift));
  Object.assign(record, polyphen(record.polyphen));

  const significanceEntries = Array.isArray(record.significance)
    ? record.significance
    : undefined;
  if (significanceEntries && significanceEntries.length > 1) {
    record.significance_badge = `${significanceEntries.length - 1}+`;
  }

  const firstSignificance = significanceEntries?.[0];
  const firstCondition = firstSignificance?.conditions?.[0]?.name;
  const firstInterpretation = firstSignificance?.interpretations?.[0];

  if (firstCondition && firstInterpretation) {
    Object.assign(record, {
      significance: {
        condition: firstCondition,
        interpretation: firstInterpretation,
      },
    });
  }

  return record;
};
