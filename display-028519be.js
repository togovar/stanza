import { e as ensureAllDatasets, S as SO, a as CONSEQUENCE, A as ALPHAMISSENSE, b as SIFT, P as POLYPHEN } from './constants-f43484af.js';
import { b as buildFrequencyDisplay } from './frequency-0e5f07a7.js';

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
const refAlt = (ref, alt) => {
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
const variantType = (accession) => ({
    type: SO[String(accession)]?.label || "Unknown",
});
const consequence = (accession) => ({
    most_severe_consequence: CONSEQUENCE[String(accession)]?.label || "",
});
const alphaMissense = (value) => {
    const numericValue = toNumericValue(value);
    if (Number.isNaN(numericValue)) {
        return {};
    }
    const rank = numericValue > 0.564
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
const sift = (value) => {
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
const polyphen = (value) => {
    const numericValue = toNumericValue(value);
    if (Number.isNaN(numericValue)) {
        return {};
    }
    let rank = POLYPHEN.unknown;
    if (numericValue > 0.908) {
        rank = POLYPHEN.probably_damaging;
    }
    else if (numericValue > 0.446) {
        rank = POLYPHEN.possibly_damaging;
    }
    else {
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
const transformRecord = (record, assembly) => {
    Object.assign(record, variantType(record.type));
    Object.assign(record, refAlt(record.reference, record.alternate));
    if (record.existing_variations?.length) {
        Object.assign(record, { dbsnp: record.existing_variations[0] });
    }
    record.frequencies = ensureAllDatasets(record.frequencies, assembly);
    record.frequencies.forEach((entry) => {
        Object.assign(entry, buildFrequencyDisplay(entry.ac, entry.af), {
            // ホモ接合マーカーは aac が 1 以上のときだけ表示する
            has_homozygote_marker: Number(entry.aac) >= 1,
            // ヘミ接合体マーカーは hac が 1 以上のときだけ表示する
            has_hemizygote_marker: Number(entry.hac) >= 1,
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

export { alphaMissense as a, polyphen as p, refAlt as r, sift as s, transformRecord as t };
//# sourceMappingURL=display-028519be.js.map
