const frequencyDisplayDigits = 4;
const frequencyFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: frequencyDisplayDigits,
  maximumFractionDigits: frequencyDisplayDigits,
});

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
  if (Number.isNaN(alleleCount)) return "na";
  if (alleleCount === 0) return "monomorphic";
  if (alleleFrequency < 0.0001) return "<0.0001";
  if (alleleFrequency < 0.001) return "<0.001";
  if (alleleFrequency < 0.01) return "<0.01";
  if (alleleFrequency < 0.05) return "<0.05";
  if (alleleFrequency < 0.5) return "<0.5";
  if (alleleFrequency >= 0.5) return "≥0.5";
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

  return frequencyFormatter.format(
    truncateDecimal(numeric, frequencyDisplayDigits),
  );
};

export const buildFrequencyDisplay = (count, value) => {
  const alleleCount = toNumericValue(count);
  const alleleFrequency = toNumericValue(value);

  return {
    frequency: formatFrequencyValue(value),
    count,
    level: resolveFrequencyLevel(alleleCount, alleleFrequency),
  };
};
