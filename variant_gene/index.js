Stanza(function (stanza, params) {
  if (params.api) {
    let url = params.api.concat("/variant_gene?tgv_id=" + params.tgv_id);

    if (params.assembly) {
      url = url.concat("&assembly=" + encodeURIComponent(params.assembly))
    }

    if (params.ep) {
      url = url.concat("&ep=" + encodeURIComponent(params.ep))
    }

    fetch(url, {method: "GET", headers: {"Accept": "application/json"}}).then(function (response) {
      if (response.ok) {
        return response.json();
      }
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
      stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
      throw e;
    });
  }
});
