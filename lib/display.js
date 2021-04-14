import {SO, CONSEQUENCE, SIFT, POLYPHEN} from "./constants";

const floatFormatter = digits => {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const fractionDigits3 = floatFormatter(3);

export const refAlt = (ref, alt) => {
  const ref_length = ref?.length || 0;
  const alt_length = alt?.length || 0;

  if (!ref) {
    ref = "";
  }
  if (!alt) {
    alt = "";
  }

  if (ref_length > 4) {
    ref = ref.slice(0, 4) + "...";
  }
  if (alt_length > 4) {
    alt = alt.slice(0, 4) + "...";
  }

  return {ref, alt, ref_length, alt_length};
};

export const variantType = accession => ({type: SO[accession]?.label || "Unknown"});

export const frequency = (count, frequency) => {
  const level = ((ac, f) => {
    if (isNaN(ac)) {
      return "na";
    } else if (ac === 0) {
      return "monomorphic";
    } else if (ac === 1) {
      return "singleton";
    } else if (f < 0.0001) {
      return "<0.0001";
    } else if (0.0001 <= f && f < 0.001) {
      return "<0.001";
    } else if (0.001 <= f && f < 0.01) {
      return "<0.01";
    } else if (0.01 <= f && f < 0.05) {
      return "<0.05";
    } else if (0.05 <= f && f < 0.5) {
      return "<0.5";
    } else if (0.5 <= f && f) {
      return "≥0.5";
    } else {
      return "na";
    }
  })(count, frequency);

  frequency = ((v) => {
    if (v === 0) {
      return "0.0";
    } else if (v === 1) {
      return "1.0";
    } else if (v < 0.001) {
      return v.toExponential(3);
    } else {
      return fractionDigits3.format(frequency);
    }
  })(frequency);

  return {frequency, count, level};
};

export const consequence = accession => ({most_severe_consequence: CONSEQUENCE[accession]?.label || ""});

export const sift = value => {
  value = parseFloat(value);

  if (isNaN(value)) {
    return {};
  }

  const rank = (value >= 0.05) ? SIFT["tolerated"] : SIFT["deleterious"];

  return {
    sift: fractionDigits3.format(value),
    sift_class: rank?.key,
    sift_label: rank?.label,
  };
};

export const polyphen = value => {
  value = parseFloat(value);

  if (isNaN(value)) {
    return {};
  }

  let rank = POLYPHEN["unknown"];
  if (value > 0.908) {
    rank = POLYPHEN["probably_damaging"];
  } else if (value > 0.446) {
    rank = POLYPHEN["possibly_damaging"];
  } else {
    rank = POLYPHEN["benign"];
  }

  return {
    polyphen: fractionDigits3.format(value),
    polyphen_class: rank?.key,
    polyphen_label: rank?.label,
  };
};
