const REVIEW_STATUS = {
  "no assertion provided": 0,
  "no assertion criteria provided": 0,
  "no assertion for the individual variant": 0,
  "criteria provided, single submitter": 1,
  "criteria provided, conflicting interpretations": 1,
  "criteria provided, multiple submitters, no conflicts": 2,
  "reviewed by expert panel": 3,
  "practice guideline": 4
};

const CLINICAL_SIGNIFICANCE = {
  "pathogenic": "P",
  "likely pathogenic": "LP",
  "uncertain significance": "US",
  "likely benign": "LB",
  "benign": "B",
  "conflicting interpretations of pathogenicity": "CI",
  "drug response": "DR",
  "association": "A",
  "risk factor": "RF",
  "protective": "PR",
  "affects": "AF",
  "other": "O",
  "not provided": "NP",
  "association_not found": "AN",
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

  let Handlebars = stanza.handlebars;

  Handlebars.registerHelper('link', function (text, url) {
    url = Handlebars.escapeExpression(url);
    text = Handlebars.escapeExpression(text);

    return new Handlebars.SafeString(
      "<a href='" + url + "'>" + text + "</a>"
    );
  });

  Handlebars.registerHelper('significance_class', function (interpretation) {
    return CLINICAL_SIGNIFICANCE[interpretation.toLowerCase()]
  });

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_clinvar?tgv_id=" + params.tgv_id);

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
      binding.stars = REVIEW_STATUS[binding.review_status] || 0;
      binding.condition = {
        label: binding.condition,
        url: "https://identifiers.org/medgen:".concat(binding.medgen)
      }
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        bindings: bindings
      }
    });

    rowspanize(stanza.select("#target"));
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
