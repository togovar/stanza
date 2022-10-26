import Stanza from "togostanza/stanza";

import {DATASETS} from "@/lib/constants";
import {frequency} from "@/lib/display";
import {sortBy} from "@/lib/sort";

export default class VariantSummary extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    const assembly = this.params.assembly;
    const sparqlist = (this.params?.sparqlist || "/sparqlist").concat(`/api/variant_frequency?tgv_id=${this.params.tgv_id}`);

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
    }).then(function (bindings) {
      const datasets = Object.values(DATASETS);

      bindings.forEach(function (binding) {
        const dataset = datasets.find(x => x.source === binding.source);
        const ac = parseInt(binding.num_alt_alleles);
        const freq = parseFloat(binding.frequency);

        const localeString = (v) => v ? parseInt(v).toLocaleString() : null;

        binding.key = dataset?.id;
        binding.dataset = dataset?.dataset(assembly);
        binding.population = dataset?.population;
        binding.class_name = binding.source.startsWith("ExAC:") ? "none" : "";
        binding.num_alleles = localeString(binding.num_alleles);
        binding.num_alt_alleles = localeString(binding.num_alt_alleles);
        binding.num_genotype_alt_homo = localeString(binding.num_genotype_alt_homo);
        binding.num_genotype_hetero = localeString(binding.num_genotype_hetero);
        binding.num_genotype_ref_homo = localeString(binding.num_genotype_ref_homo);

        Object.assign(binding, frequency(ac, freq));
      });

      sortBy(bindings, x => datasets.find(y => y.source === x.source)?.idx);

      return {result: {bindings: bindings}};
    }).catch(e => ({error: {message: e.message}}));

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
    });

    const gnomad_genomes = this.root.querySelector("#gnomad_genomes");
    if (gnomad_genomes) {
      const gnomad_genomes_total = this.root.querySelector("tr[data-dataset='gnomad_genomes']");
      const gnomad_genomes_subset = this.root.querySelectorAll("tr[data-dataset^='gnomad_genomes_']");

      gnomad_genomes.addEventListener("click", function () {
        gnomad_genomes.classList.toggle("open");
        gnomad_genomes_total.classList.toggle("close");

        gnomad_genomes_subset.forEach(x => x.classList.toggle("none"));
      });
    }

    const gnomad_exomes = this.root.querySelector("#gnomad_exomes");
    if (gnomad_exomes) {
      const gnomad_exomes_total = this.root.querySelector("tr[data-dataset='gnomad_exomes']");
      const gnomad_exomes_subset = this.root.querySelectorAll("tr[data-dataset^='gnomad_exomes_']");

      gnomad_exomes.addEventListener("click", function () {
        gnomad_exomes.classList.toggle("open");
        gnomad_exomes_total.classList.toggle("close");

        gnomad_exomes_subset.forEach(x => x.classList.toggle("none"));
      });
    }
  }
}
