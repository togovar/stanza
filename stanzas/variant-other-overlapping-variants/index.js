import {DATASETS} from "../../lib/constants.js";
import * as display from "../../lib/display.js";
import {sortBy} from "../../lib/sort.js";

const sources = ["gem_j_wga", "jga_ngs", "jga_snp", "tommo_4.7kjpn", "hgvd", "exac"];

const ensureAllDatasets = frequencies => {
  sources.forEach(source => {
    if (!frequencies.find(x => x.source === source)) {
      frequencies.push({source: source});
    }
  });

  return frequencies;
};

export default async function variantSummary(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  const sparqlist = (params?.sparqlist || "/sparqlist")
    .concat(`/api/variant_other_alternative_alleles?tgv_id=${params.tgv_id}`)
    .concat(params.ep ? `&ep=${encodeURIComponent(params.ep)}` : "")
    .concat(params.search_api ? `&search_api=${encodeURIComponent(params.search_api)}` : "");

  const r = await fetch(sparqlist, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  }).then(res => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(sparqlist + " returns status " + res.status);
  }).then(json => {
    const datasets = Object.values(DATASETS);

    let records = json.data ? json.data.filter(x => x.id !== params.tgv_id) : [];

    records.forEach(record => {
      Object.assign(record, display.variantType(record.type));
      Object.assign(record, display.refAlt(record.reference, record.alternative));

      if (!record.frequencies) {
        record.frequencies = [];
      }
      ensureAllDatasets(record.frequencies);
      sortBy(record.frequencies, x => datasets.find(y => y.id === x.source)?.idx);
      record.frequencies.forEach(x => {
        const ac = parseInt(x.allele?.count);
        const freq = parseFloat(x.allele?.frequency);

        Object.assign(x, display.frequency(ac, freq));
      });

      Object.assign(record, display.consequence(record.most_severe_consequence));
      if (record.transcripts && record.transcripts.length > 1) {
        record.consequence_badge = `${record.transcripts.length - 1}+`;
      }

      Object.assign(record, display.sift(record.sift));
      Object.assign(record, display.polyphen(record.polyphen));

      if (record.significance && record.significance.length > 1) {
        record.significance_badge = `${record.significance.length - 1}+`;
      }
      if (record.significance && record.significance.length > 0) {
        record.significance = record.significance[0];
        record.significance.interpretation = record.significance.interpretations[0];
      }
    });

    return {result: {data: records}};
  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });
}
