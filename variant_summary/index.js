Stanza(function (stanza, params) {
  stanza.handlebars.registerHelper("print_position", function (v) {
    if (!v) {
      return
    }

    let [chr, assembly] = v.reference.replace(/.*\//, "").split("#");
    let position = v.stop ? v.start + ":" + v.stop : v.start;

    return "<span class='chromosome'>" + chr + "</span>"
      .concat(":<span class='position'>" + position + "</span>")
      .concat(" <span class='assembly'>(" + assembly + ")</span>");
  });

  stanza.handlebars.registerHelper("print_allele", function (v) {
    if (!v) {
      return
    }

    let ref = v.ref || "";
    let alt = v.alt || "";

    if (ref.length === 0) {
      ref = "-"
    }
    if (alt.length === 0) {
      alt = "-"
    }

    return ref + " / " + alt;
  });

  let url = (params.api ? params.api : "").concat("/variant_summary?tgv_id=" + params.tgv_id);

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
      binding.hgvs = Array.from(new Set(stanza.grouping(bindings, "hgvs").filter(v => v)));
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
});
