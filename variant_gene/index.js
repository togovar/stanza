Stanza(function (stanza, params) {
  if (!params.tgv_id) {
    return stanza.render({
      template: "error.html",
      parameters: {
        message: "Parameter missing: tgv_id",
      }
    });
  }

  let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_gene?tgv_id=" + params.tgv_id);

  if (params.assembly) {
    sparqlist = sparqlist.concat("&assembly=" + encodeURIComponent(params.assembly))
  }

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
    let binding = bindings[0];

    if (binding) {
      binding.symbol = Array.from(new Set(stanza.grouping(bindings, "symbol").filter(v => v)));
      binding.synonym = Array.from(new Set(stanza.grouping(bindings, "synonym").filter(v => v)));
    }

    stanza.render({
      template: "stanza.html",
      parameters: {
        binding: binding
      }
    });
  }).catch(function (e) {
    stanza.render({
      template: "error.html",
      parameters: {
        message: e.message,
      }
    });
  });
});
