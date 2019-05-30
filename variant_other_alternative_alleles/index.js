const DATASETS = [
  "jga_ngs",
  "jga_snp",
  "tommo",
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

Stanza(function (stanza, params) {
  stanza.handlebars.registerHelper("print_allele", function (v) {
    if (!v) {
      return
    }

    let ref = v.reference || "";
    let alt = v.alternative || "";

    if (ref.length === 0) {
      ref = "-"
    }
    if (alt.length === 0) {
      alt = "-"
    }

    return ref + " / " + alt;
  });

  stanza.handlebars.registerHelper("so_label", function (accession) {
    return {
      "SO_0001483": "SNV",
      "SO_0000667": "insertion",
      "SO_0000159": "deletion",
      "SO_1000032": "indel",
      "SO_1000002": "substitution"
    }[accession] || "Unknown";
  });

  stanza.handlebars.registerHelper("badge", function (count) {
    return parseInt(count) > 1 ? '' + (count - 1) + '+' : '';
  });

  if (params.api && params.ep) {
    stanza.query({
      endpoint: params.ep,
      template: "fetch_position.rq",
      parameters: params
    }).then(function (data) {
      let v = stanza.unwrapValueFromBinding(data)[0];

      if (!v) {
        return
      }

      let url = params.api.concat("?stat=0&quality=0&start_only&term=" + v.chromosome + ":" + v.position);

      fetch(url, {method: "GET", headers: {"Accept": "application/json"}}).then(function (response) {
        if (response.ok) {
          return response.json();
        }
      }).then(function (json) {
        let data = json.data ? json.data.filter(v => v.id !== params.tgv_id) : [];

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
            data: data
          }
        });
      }).catch(function (e) {
        stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
        throw e;
      });
    }).catch(function (e) {
      stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
      throw e;
    });
  }
});
