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

  const fraction3 = new Intl.NumberFormat('en', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  Handlebars.registerHelper("print_sift", function (value) {
    let v = parseFloat(value);
    if (isNaN(v)) {
      return value;
    }

    let klass = "T";
    if (v < 0.05) {
      klass = "D"
    }

    return new Handlebars.SafeString(
      "<span class='variant-function' data-function='" + klass + "'>" + fraction3.format(v) + "</span>" +
      "<span class='sift-label'>" + SIFT_DISPLAY_LABEL[klass] + "</span>"
    );
  });

  Handlebars.registerHelper("print_polyphen", function (value) {
    let v = parseFloat(value);
    if (isNaN(v)) {
      return value;
    }

    let klass = "B";
    if (v > 0.908) {
      klass = "PROBD"
    } else if (v > 0.446 && v <= 0.908) {
      klass = "POSSD"
    }

    return new Handlebars.SafeString(
      "<span class='variant-function' data-function='" + klass + "'>" + fraction3.format(v) + "</span>" +
      "<span class='polyphen-label'>" + POLYPHEN_DISPLAY_LABEL[klass] + "</span>"
    );
  });

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_transcript?tgv_id=" + params.tgv_id);

  if (params.assembly) {
    sparqlist = sparqlist.concat("&assembly=" + encodeURIComponent(params.assembly));
  }
  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep));
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
