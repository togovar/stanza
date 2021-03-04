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
}
