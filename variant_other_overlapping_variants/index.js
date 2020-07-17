const DATASETS = [
  "jga_ngs",
  "jga_snp",
  "tommo_4.7kjpn",
  "gem_j_wga",
  "hgvd",
  "exac"
];

const FREQUENCY_TEMPLATE = {
  source: null,
  num_alleles: null,
  num_ref_alleles: null,
  num_alt_alleles: null,
  frequency: null,
  filter: null
};

let consequence_map = {
  "id": "consequence",
  "label": "Consequence",
  "type": "array",
  "items": [{
    "id": "SO_0001566",
    "label": "Regulatory region variant",
    "type": "boolean",
    "default": "1"
  },
    {
      "id": "SO_0001567",
      "label": "Stop retained variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001574",
      "label": "Splice acceptor variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001575",
      "label": "Splice donor variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001578",
      "label": "Stop lost",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001580",
      "label": "Coding sequence variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001583",
      "label": "Missense variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001587",
      "label": "Stop gained",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001589",
      "label": "Frameshift variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001619",
      "label": "Non coding transcript variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001620",
      "label": "Mature miRNA variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001621",
      "label": "NMD transcript variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001623",
      "label": "5 prime UTR variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001624",
      "label": "3 prime UTR variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001626",
      "label": "Incomplete terminal codon variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001627",
      "label": "Intron variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001628",
      "label": "Intergenic variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001630",
      "label": "Splice region variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001631",
      "label": "Upstream gene variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001632",
      "label": "Downstream gene variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001782",
      "label": "TF binding site variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001792",
      "label": "Non coding transcript exon variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001818",
      "label": "Protein altering variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001819",
      "label": "Synonymous variant",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001821",
      "label": "Inframe insertion",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001822",
      "label": "Inframe deletion",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001889",
      "label": "Transcript amplification",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001891",
      "label": "Regulatory region amplification",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001892",
      "label": "TFBS amplification",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001893",
      "label": "Transcript ablation",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001894",
      "label": "Regulatory region ablation",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001895",
      "label": "TFBS ablation",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001906",
      "label": "Feature truncation",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0001907",
      "label": "Feature elongation",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0002012",
      "label": "Start lost",
      "type": "boolean",
      "default": "1"
    },
    {
      "id": "SO_0002019",
      "label": "Start retained variant",
      "type": "boolean",
      "default": "1"
    }
  ]
};

Stanza(function (stanza, params) {
  if (!params.tgv_id) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Parameter missing: tgv_id",
      }
    });
  }

  stanza.handlebars.registerHelper("print_allele", function (variation) {
    if (!variation) {
      return
    }

    let ref = variation.reference || "", alt = variation.alternative || "";

    let ref_length = ref.length;
    let alt_length = alt.length;

    if (ref.length > 4) {
      ref = ref.slice(0, 4) + "..."
    }
    if (alt.length > 4) {
      alt = alt.slice(0, 4) + "..."
    }

    return `<div class="ref-alt"><span class='ref' data-sum='${ref_length}'>${ref}</span><span class='arrow'></span><span class='alt' data-sum='${alt_length}'>${alt}</span></div>`;
  });

  stanza.handlebars.registerHelper("mapConsequence", function (consequence) {
    let variant = "";
    consequence_map.items.forEach(item => {
      if (item.id === consequence) {
        variant = item.label
      }
    });
    return variant
  });

  stanza.handlebars.registerHelper("so_label", function (accession) {
    return {
      "SO_0001483": "SNV",
      "SO_0000667": "insertion",
      "SO_0000159": "deletion",
      "SO_1000032": "indel",
      "SO_1000002": "substitution"
    } [accession] || "Unknown";
  });

  const fraction3 = new Intl.NumberFormat('en', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  stanza.handlebars.registerHelper("getSift", function (value) {
    value = parseFloat(value);
    if (isNaN(value)) {
      return
    }

    let class_name = (value >= 0.05) ? "T" : "D";

    return `<span class="variant-function" data-function="${class_name}">${fraction3.format(value)}</span>`
  });

  stanza.handlebars.registerHelper("getPolyphen", function (value) {
    value = parseFloat(value);
    if (isNaN(value)) {
      return
    }

    let class_name = "U";
    if (value > 0.908) {
      class_name = "PROBD";
    } else if (value > 0.446) {
      class_name = "POSSD";
    } else {
      class_name = "B";
    }

    return `<span class="variant-function" data-function="${class_name}">${fraction3.format(value)}</span>`
  });

  stanza.handlebars.registerHelper("getSignificance", function (significance) {
    if (significance !== undefined && significance.condition !== undefined) {
      return `<span class="clinical-significance" data-sign="${significance.interpretations[0]}">${significance.condition}</span>`
    }
  });

  stanza.handlebars.registerHelper("getFrequency", function (data) {
    let frequencyValue = "";
    let dataSource = "";

    const num_alt_alleles = parseInt(data.num_alt_alleles);
    const frequency = parseFloat(data.frequency);

    if (isNaN(data)) {
      frequencyValue = "na"
    } else {
      dataSource = data.source;
      switch (true) {
        case num_alt_alleles === 1:
          frequencyValue = "singleton";
          break;
        case frequency >= .5:
          frequencyValue = "≥0.5";
          break;
        case frequency > .05:
          frequencyValue = "<0.5";
          break;
        case frequency > .01:
          frequencyValue = "<0.05";
          break;
        case frequency > .001:
          frequencyValue = "<0.01";
          break;
        case frequency > .0001:
          frequencyValue = "<0.001";
          break;
        case frequency > 0:
          frequencyValue = "<0.0001";
          break;
        default:
          frequencyValue = "monomorphic";
          break;
      }
    }

    return `<div class="dataset" data-dataset="${dataSource}" data-frequency="${frequencyValue}"></div>`
  });

  stanza.handlebars.registerHelper("badge", function (count) {
    let badge = parseInt(count) > 1 ? "" + (count - 1) + "+" : "";
    if (badge !== "") {
      return `<span class="badge">${badge}</span>`;
    }
  });

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_other_alternative_alleles?tgv_id=" + params.tgv_id);

  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep))
  }
  if (params.search_api) {
    sparqlist = sparqlist.concat("&search_api=" + encodeURIComponent(params.search_api))
  }

  fetch(sparqlist, {
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
    let data = json.data ? json.data.filter(x => x.id !== params.tgv_id) : [];

    data.forEach(function (row) {
      row.frequencies = DATASETS.map(function (elem) {
        let obj;

        if (row.frequencies) {
          obj = row.frequencies.find(x => x.source === elem)
        }

        if (!obj) {
          obj = JSON.parse(JSON.stringify(FREQUENCY_TEMPLATE));
          obj.source = elem;
        }

        return obj;
      });
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        data: data
      }
    });
  }).catch(function (e) {
    stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: e.message,
      }
    });
  });
});
