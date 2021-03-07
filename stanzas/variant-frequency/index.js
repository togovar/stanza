import {DATASETS} from "@/lib/constants.js";
import * as display from "@/lib/display.js";
import {sortBy} from "@/lib/sort.js";

export default async function variantSummary(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
  stanza.importWebFontCSS("/assets/fontello.css");

  const sparqlist = (params?.sparqlist || "/sparqlist")
    .concat(`/api/variant_frequency?tgv_id=${params.tgv_id}`)
    .concat(params.ep ? `&ep=${encodeURIComponent(params.ep)}` : "");

  const r = await fetch(sparqlist, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  }).then(function (response) {
    if (response.ok) {
      return response.json();
    }
    throw new Error(sparqlist + " returns status " + response.status);
  }).then(function (json) {
    const datasets = Object.values(DATASETS);
    const bindings = stanza.unwrapValueFromBinding(json);

    bindings.forEach(function (binding) {
      const dataset = datasets.find(x => x.source === binding.source);
      const ac = parseInt(binding.num_alt_alleles);
      const freq = parseFloat(binding.frequency);

      const localeString = (v) => v ? parseInt(v).toLocaleString() : null;

      binding.key = dataset?.id;
      binding.dataset = dataset?.dataset;
      binding.population = dataset?.population;
      binding.class_name = binding.source.startsWith("ExAC:") ? "none" : "";
      binding.num_alleles = localeString(binding.num_alleles);
      binding.num_alt_alleles = localeString(binding.num_alt_alleles);
      binding.num_genotype_alt_homo = localeString(binding.num_genotype_alt_homo);
      binding.num_genotype_hetero = localeString(binding.num_genotype_hetero);
      binding.num_genotype_ref_homo = localeString(binding.num_genotype_ref_homo);

      Object.assign(binding, display.frequency(ac, freq));
    });

    sortBy(bindings, x => datasets.find(y => y.source === x.source)?.idx);

    return {result: {bindings: bindings}};
  }).catch(e => {
    console.error(e);

    return {error: {message: e.message}}
  });

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });

  const exac = stanza.select("#exac");
  if (exac) {
    const exac_first_tr = stanza.select("tr[data-dataset='exac']");
    const exac_other_tr = stanza.selectAll("tr[data-dataset^='exac_']");

    exac.addEventListener("click", function () {
      exac.classList.toggle("open");
      exac_first_tr.classList.toggle("close");
      exac_other_tr.forEach(x => x.classList.toggle("none"));
    });
  }
}
