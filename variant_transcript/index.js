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

  let url = (params.api ? params.api : "").concat("/variant_transcript?tgv_id=" + params.tgv_id);

  if (params.assembly) {
    url = url.concat("&assembly=" + encodeURIComponent(params.assembly))
  }

  if (params.ep) {
    url = url.concat("&ep=" + encodeURIComponent(params.ep))
  }

  fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  }).then(function (response) {
    if (response.ok) {
      return response.json();
    }
  }).then(function (json) {
    let bindings = stanza.unwrapValueFromBinding(json);

    bindings.forEach(function (binding) {
      binding.transcript = {
        label: binding.transcript.split("/").reverse()[0],
        url: binding.enst_id ? "http://identifiers.org/ensembl/".concat(binding.enst_id) : null
      };
      binding.consequence_label = binding.consequence_label.split(",");
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        bindings: bindings
      }
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
