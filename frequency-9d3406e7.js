const frequencyDisplayDigits = 4;
const frequencyFormatter = new Intl.NumberFormat("en", {
    minimumFractionDigits: frequencyDisplayDigits,
    maximumFractionDigits: frequencyDisplayDigits,
});
const hasNumericValue = (value) => {
    return (value !== undefined &&
        value !== null &&
        value !== "" &&
        !Number.isNaN(Number(value)));
};
const toNumericValue = (value) => {
    return Number.parseFloat(String(value));
};
const truncateDecimal = (value, digits) => {
    const factor = 10 ** digits;
    return Math.trunc(value * factor) / factor;
};
/**
 * AF の閾値から、CSS 側が参照する周波数レベルを決定する。
 * シングルトン強調は別属性（data-allele-count）で扱うため、
 * ここでは ac===1 を特別扱いしない。
 */
const resolveFrequencyLevel = (alleleCount, alleleFrequency) => {
    if (Number.isNaN(alleleCount))
        return "na";
    if (alleleCount === 0)
        return "monomorphic";
    if (alleleFrequency < 0.0001)
        return "<0.0001";
    if (alleleFrequency < 0.001)
        return "<0.001";
    if (alleleFrequency < 0.01)
        return "<0.01";
    if (alleleFrequency < 0.05)
        return "<0.05";
    if (alleleFrequency < 0.5)
        return "<0.5";
    if (alleleFrequency >= 0.5)
        return "≥0.5";
    return "na";
};
/**
 * AF 表示は小数 4 桁固定で切り捨てる。
 * ただし 0 < AF < 0.0001 は、非ゼロ値であることを明示するため
 * 画面表示を "<0.0001" にする。
 */
const formatFrequencyValue = (value) => {
    const numeric = toNumericValue(value);
    if (!Number.isFinite(numeric)) {
        return "";
    }
    if (numeric > 0 && numeric < 0.0001) {
        return "<0.0001";
    }
    return frequencyFormatter.format(truncateDecimal(numeric, frequencyDisplayDigits));
};
const buildFrequencyDisplay = (count, value) => {
    const alleleCount = toNumericValue(count);
    const alleleFrequency = toNumericValue(value);
    return {
        frequency: formatFrequencyValue(value),
        count,
        level: resolveFrequencyLevel(alleleCount, alleleFrequency),
    };
};
const formatLocaleInteger = (value) => {
    return hasNumericValue(value)
        ? Number.parseInt(String(value), 10).toLocaleString()
        : undefined;
};
const buildFrequencyMarkerState = (entry) => {
    return {
        // ホモ接合マーカーは aac が 1 以上のときだけ表示する
        has_homozygote_marker: Number(entry.aac) >= 1,
        // ヘミ接合体マーカーは hac が 1 以上のときだけ表示する
        has_hemizygote_marker: Number(entry.hac) >= 1,
        // ヘミ接合体の値が存在するかどうか
        has_hemizygote_value: hasNumericValue(entry.hac) ||
            hasNumericValue(entry.hrc) ||
            hasNumericValue(entry.hoc),
    };
};

export { buildFrequencyDisplay as a, buildFrequencyMarkerState as b, formatLocaleInteger as f };
//# sourceMappingURL=frequency-9d3406e7.js.map
