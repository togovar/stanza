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

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_gene?tgv_id=" + params.tgv_id);

  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep))
  }

  fetch(sparqlist, {method: "GET", headers: {"Accept": "application/json"}}).then(function (response) {
    if (response.ok) {
      return response.json();
    }
    throw new Error(sparqlist + " returns status " + response.status);
  }).then(function (json) {
    let bindings = stanza.unwrapValueFromBinding(json);
    let binding = bindings[0] || {};

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        binding: {
          ...binding,
          symbol: Object.values(bindings.map(x => ({hgnc: x.hgnc, symbol: x.symbol}))
            .reduce((accumulator, currentValue) => {
              accumulator[currentValue.hgnc] = currentValue;
              return accumulator;
            }, {})),
          synonym: Array.from(new Set(stanza.grouping(bindings, "synonym").filter(v => v)))
        }
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
