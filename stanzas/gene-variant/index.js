import {DATASETS} from "../../lib/constants.js";
import * as display from "../../lib/display.js";
import {sortBy} from "../../lib/sort.js";

const sources = ["gem_j_wga","jga_ngs","jga_snp","tommo_4.7kjpn","hgvd","exac"];

export default async function geneVariant(stanza, params) {
  const sparqlist = (params?.sparqlist || "/sparqlist")
    .concat(`/api/gene_variant?hgnc_id=${params.hgnc_id}`)
    .concat(params.search_api ? `&search_api=${encodeURIComponent(params.search_api)}` : "")
    .concat(params.ep ? `&ep=${encodeURIComponent(params.ep)}` : "");
  
  const r = await fetch(sparqlist,{
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  }).then(res => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(sparqlist + " returns status " + res.status);
  }).then(function (json) {

    const datasets = Object.values(DATASETS);
    const bindings = json.data;

    bindings.forEach(function (binding) {
      const frequencies = (binding?.frequencies || []);

      frequencies.forEach(function (frequency){ 
        const dataset = datasets.find(x => x.source === frequency.source);
        const ac = parseInt(frequency.allele.count);
        const freq = parseFloat(frequency.allele.frequency);

        Object.assign(binding, display.frequency(ac, freq));
      });      
      Object.assign(binding, display.refAlt(binding.reference, binding.alternative));
      Object.assign(binding, display.polyphen(binding.polyphen));
      Object.assign(binding, display.sift(binding.sift));
      Object.assign(binding, display.consequence(binding.most_severe_consequence));
    });

    return {result: {bindings: bindings}};
  }).catch(e => ({error: {message: e.message}}));
  stanza.render({
    template: 'stanza.html.hbs',
    parameters: {
      params: params,
      ...r,
    }
  });

}
