const POPULATION_LABEL = {
  "GEM-J WGA": "Japanese",
  "ToMMo 8.3KJPN": "Japanese",
  "JGA-NGS": "Japanese",
  "JGA-SNP": "Japanese",
  "HGVD": "Japanese",
  "gnomAD Genomes": "Total",
  "gnomAD Exomes": "Total"
};

const ORDER_WEIGHT = {
  "GEMJ 10K": 0,
  "JGA-NGS": 10,
  "JGA-SNP": 20,
  "ToMMo 8.3KJPN": 30,
  "HGVD": 40,
  "gnomAD Genomes": 50,
  "gnomAD Exomes": 60,
  "African-American/African": 1,
  "Latino": 2,
  "South Asian": 3,
  "Other": 4,
  "Non-Finnish European": 5,
  "Ashkenazi Jewish": 6,
  "East Asian": 7,
  "Finnish": 8,
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

  stanza.handlebars.registerHelper("locale_string", (str) => {
    return str ? parseInt(str).toLocaleString() : "";
  });

  stanza.handlebars.registerHelper("format_float", (str) => {
    const v = parseFloat(str);
    let frequency_val = 0;

    if (v === 0) {
      frequency_val = "0.0";
    } else if (v === 1) {
      frequency_val = "1.0";
    } else if (v < 0.001) {
      frequency_val = v.toExponential(3);
    } else {
      frequency_val = Math.round(v * Math.pow(10, 3)) / Math.pow(10, 3);
    }

    frequency_val = String(frequency_val)

    if (frequency_val === '0') {
      frequency_val = '0.000'
    } else {
      frequency_val = frequency_val.padEnd(5, '0')
    }

    return frequency_val
  });

  stanza.handlebars.registerHelper("format_filter", (str) => {
    if (!str || str === "") {
      return "-"
    }

    let status = str.split(",")[0];

    if (status === "") {
      return "-"
    } else if (status === "PASS") {
      return "<span class=\"green\">PASS</span>";
    } else {
      return "<span class=\"red\">" + status + "</span>";
    }
  });

  // let counter_get_toggle_state = 0;
  // stanza.handlebars.registerHelper("getToggleState", (text) => {
  //   let state = "";
  //   if (text === "gnomAD Genomes") {
  //     if (counter_get_toggle_state === 0) {
  //       state = 'gnomad_genomes_first_tr close'
  //     } else {
  //       state = 'gnomad_genomes_without_first none'
  //     }
  //     counter_get_toggle_state++
  //   }
  //   if (text === "gnomAD Exomes") {
  //     if (counter_get_toggle_state === 0) {
  //       state = 'gnomad_exomes_first_tr close'
  //     } else {
  //       state = 'gnomad_exomes_without_first none'
  //     }
  //     counter_get_toggle_state++
  //   }
  //
  //   return state
  // });

  // let counter_get_class_name = 0;
  stanza.handlebars.registerHelper("getClassName", (text) => {
    return text.toLowerCase().replace(/[ -]/g, '_');
  });

  stanza.handlebars.registerHelper("getDatasetName", (text) => {
    return text
  });

  stanza.handlebars.registerHelper("get_frequency_stage", (frequency, alt) => {
    frequency = parseFloat(frequency);
    alt = parseInt(alt);

    let stage = '';

    if (frequency < 0.0001) {
      stage = '<0.0001'
    } else if (0.0001 <= frequency && frequency < 0.001) {
      stage = '<0.001'
    } else if (0.001 <= frequency && frequency < 0.01) {
      stage = '<0.01'
    } else if (0.01 <= frequency && frequency < 0.05) {
      stage = '<0.05'
    } else if (0.05 <= frequency && frequency < 0.5) {
      stage = '<0.5'
    } else if (0.5 <= frequency && frequency) {
      stage = '≥0.5'
    }

    if (alt === null) {
      stage = 'na'
    } else if (alt === 0) {
      stage = 'monomorphic'
    } else if (alt === 1) {
      stage = 'singleton'
    }

    return stage
  });

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_frequency?tgv_id=" + params.tgv_id);

  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep))
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
    json.forEach(function (binding) {
      const x = binding.source.split(':');
      binding.dataset = x[0];
      binding.population = x[1] || POPULATION_LABEL[x[0]] || "-";
      binding.order = (ORDER_WEIGHT[x[0]] || 0) + (ORDER_WEIGHT[x[1]] || 0);
    });

    json.sort(function (a, b) {
      return a.order - b.order;
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        bindings: json
      }
    });

    ['gnomad_genomes', 'gnomad_exomes'].forEach(dataset =>{
      const rows = stanza.selectAll(`tr[data-dataset="${dataset}"]`);

      rows.forEach((row, i) => {
        if (i === 0) {
          row.className += "parent";

          row.addEventListener('click', function () {
            $(row).toggleClass('open');
            const children = stanza.selectAll(`tr.child[data-dataset="${dataset}"]`);
            children.forEach((child) => {
              $(child).toggleClass('hidden');
            });
          });
          return;
        }

        row.className += "child hidden";
      });

      // total_row.addEventListener('click', function () {
      //   console.log($(total_row));
      //   // $(this).parent().next("tr").toggleClass("active");
      // });

      // if (first) {
      //   const without_first = stanza.selectAll(`.${x}_without_first`);
      //   const first_tr = stanza.selectAll(`.${x}_first_tr`);
      //
      //   first.addEventListener('click', function () {
      //     $(without_first).toggleClass('none');
      //     $(first).toggleClass('open');
      //     $(first_tr).toggleClass('close');
      //   });
      // }
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
