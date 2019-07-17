const SIFT_DISPLAY_LABEL = {
  D: "Deleterious",
  T: "Tolerated"
};

const POLYPHEN_DISPLAY_LABEL = {
  PROBD: "Probably Damaging",
  POSSD: "Possibly Damaging",
  B: "Benign",
  U: "Unknown"
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
  if (!params.assembly) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Parameter missing: assembly",
      }
    });
  } else if (!(params.assembly === "GRCh37" || params.assembly === "GRCh38")) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Invalid parameter: assembly=" + params.assembly,
      }
    });
  }

  let Handlebars = stanza.handlebars;

  Handlebars.registerHelper("link", function (text, url) {
    if (!url) {
      return text;
    }

    url = Handlebars.escapeExpression(url);
    text = Handlebars.escapeExpression(text);

    return new Handlebars.SafeString(
      "<a href='" + url + "'>" + text + "</a>"
    );
  });

  Handlebars.registerHelper("print_sift", function (value) {
    let v = parseFloat(value);
    if (!v) {
      return value;
    }

    let klass;
    if (v < 0.05) {
      klass = "D"
    } else {
      klass = "T"
    }

    let sift_val = Math.round(value * Math.pow(10, 3)) / Math.pow(10, 3)
    sift_val = String(sift_val)

    if (sift_val === "0") {
      sift_val = "0.000"
    } else {
      sift_val = sift_val.padEnd(5, "0")
    }

    return new Handlebars.SafeString(
      "<span class='variant-function' data-function='" + klass + "'>" + sift_val + "</span>" +
      "<span class='sift-label'>" + SIFT_DISPLAY_LABEL[klass] + "</span>"
    );
  });

  Handlebars.registerHelper("print_polyphen", function (value) {
    let v = parseFloat(value);
    if (!v) {
      return value;
    }

    let klass;
    if (v > 0.908) {
      klass = "PROBD"
    } else if (v > 0.446 && v <= 0.908) {
      klass = "POSSD"
    } else {
      klass = "B"
    }

    let polyphen_val = Math.round(value * Math.pow(10, 3)) / Math.pow(10, 3)
    polyphen_val = String(polyphen_val)

    if (polyphen_val === "0") {
      polyphen_val = "0.000"
    } else {
      polyphen_val = polyphen_val.padEnd(5, "0")
    }

    return new Handlebars.SafeString(
      "<span class='variant-function' data-function='" + klass + "'>" + polyphen_val + "</span>" +
      "<span class='polyphen-label'>" + POLYPHEN_DISPLAY_LABEL[klass] + "</span>"
    );
  });

  let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_transcript?tgv_id=" + params.tgv_id);

  if (params.assembly) {
    sparqlist = sparqlist.concat("&assembly=" + encodeURIComponent(params.assembly))
  }

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
      binding.transcript = {
        label: binding.transcript ? binding.transcript.split("/").reverse()[0] : "",
        url: binding.enst_id ? "http://identifiers.org/ensembl/".concat(binding.enst_id) : null
      };
      binding.consequence_label = binding.consequence_label.split(",");
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        bindings: bindings
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
