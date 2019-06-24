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

  let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_clinvar?tgv_id=" + params.tgv_id);

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
        bindings: bindings
      }
    });

    rowspanize(stanza.select("#target"));
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
