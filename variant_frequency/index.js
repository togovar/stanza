const POPULATION_LABEL = {
  "JGA-NGS": "Japanese",
  "JGA-SNP": "Japanese",
  "3.5k JPN": "Japanese",
  "HGVD": "Japanese",
  "ExAC": "Total"
};

const ORDER_WEIGHT = {
  "JGA-NGS": 10,
  "JGA-SNP": 20,
  "3.5k JPN": 30,
  "HGVD": 40,
  "ExAC": 50,
  "African/African American": 1,
  "American": 2,
  "East Asian": 3,
  "Finnish": 4,
  "Non-Finnish European": 5,
  "Other": 6,
  "South Asian": 7
};

Stanza(function (stanza, params) {
  // set default value
  if (!params.base_url) {
    params.base_url = "/stanza";
  }

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
    let v = parseFloat(str);
    let frequency_val = 0

    if (v === 0)
      frequency_val = "0.0";
    else if (v === 1)
      frequency_val = "1.0";
    else if (v < 0.001)
      frequency_val = v.toExponential(3);
    else
      frequency_val = Math.round(v * Math.pow(10, 3)) / Math.pow(10, 3);

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

  let counter_get_toggle_state = 0;
  stanza.handlebars.registerHelper("getToggleState", (text, a, b, c, d, e) => {
    let state = "";
    if (text === "ExAC") {
      if (counter_get_toggle_state === 0) {
        state = 'exac_first_tr close'
      } else {
        state = 'exac_without_first none'
      }
      counter_get_toggle_state++
    }

    return state
  });

  let counter_get_class_name = 0;
  stanza.handlebars.registerHelper("getClassName", (text) => {
    text = text.toLowerCase();

    if (text === 'exac') {
      counter_get_class_name++
    } else if (text === "3.5k jpn") {
      text = "tommo";
    }
    if (text === 'exac' && counter_get_class_name === 1 || text === 'exac' && counter_get_class_name === 2 || text === 'exac' && counter_get_class_name === 3) {
      text = 'exac_first'
    }

    return text
  });

  stanza.handlebars.registerHelper("get_frequency_stage", (frequency, alt) => {
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
    } else if (frequency === 0) {
      stage = 'monomorphic'
    } else if (frequency === 1) {
      stage = 'singleton'
    }

    return stage
  });

  let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_frequency?tgv_id=" + params.tgv_id);

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
    let bindings = stanza.unwrapValueFromBinding(json);

    bindings.forEach(function (binding) {
      let x = binding.source.split(':');
      binding.dataset = x[0];
      binding.population = x[1] || POPULATION_LABEL[x[0]] || "-";
      binding.order = (ORDER_WEIGHT[x[0]] || 0) + (ORDER_WEIGHT[x[1]] || 0);
    });

    bindings.sort(function (a, b) {
      return a.order - b.order;
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        bindings: bindings
      }
    });

    const exac_first = stanza.select('#exac_first');

    if (exac_first) {
      let exac_without_first = stanza.selectAll('.exac_without_first');
      let exac_first_tr = stanza.selectAll('.exac_first_tr');

      exac_first.addEventListener('click', function () {
        $(exac_without_first).toggleClass('none');
        $(exac_first).toggleClass('open');
        $(exac_first_tr).toggleClass('close');
      });
    }
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
