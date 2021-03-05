import {SO, CONSEQUENCE} from "./constants";

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

export const frequency = (count, freq) => {
  if (isNaN(count)) {
    return {level: "na"};
  } else if (count === 0) {
    return {level: "monomorphic"};
  } else if (count === 1) {
    return {level: "singleton"};
  } else if (freq < 0.0001) {
    return {level: "<0.0001"};
  } else if (0.0001 <= freq && freq < 0.001) {
    return {level: "<0.001"};
  } else if (0.001 <= freq && freq < 0.01) {
    return {level: "<0.01"};
  } else if (0.01 <= freq && freq < 0.05) {
    return {level: "<0.05"};
  } else if (0.05 <= freq && freq < 0.5) {
    return {level: "<0.5"};
  } else if (0.5 <= freq && freq) {
    return {level: "≥0.5"};
  } else {
    return "na";
  }
};

export const consequence = accession => ({most_severe_consequence: CONSEQUENCE[accession]?.label || ""});

const floatFormatter = digits => {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const fractionDigits3 = floatFormatter(3);

export const sift = value => {
  value = parseFloat(value);

  if (isNaN(value)) {
    return {};
  }

  return {sift: fractionDigits3.format(value), sift_class: (value >= 0.05) ? "T" : "D"};
};

export const polyphen = value => {
  value = parseFloat(value);

  if (isNaN(value)) {
    return {};
  }

  let class_name = "U";
  if (value > 0.908) {
    class_name = "PROBD";
  } else if (value > 0.446) {
    class_name = "POSSD";
  } else {
    class_name = "B";
  }

  return {polyphen: fractionDigits3.format(value), polyphen_class: class_name};
};
