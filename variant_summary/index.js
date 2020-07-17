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

  stanza.handlebars.registerHelper("print_position", function (v) {
    if (!v) {
      return
    }

    let [chr, assembly] = v.reference.split("/").slice(-2);
    let position = v.stop ? v.start + ":" + v.stop : v.start;

    return "<span class='chromosome'>" + chr + "</span>"
      .concat(":<span class='position'>" + position + "</span>")
      .concat(" <span class='assembly'>(" + assembly + ")</span>");
  });

  stanza.handlebars.registerHelper("print_allele", function (v) {
    if (!v) {
      return
    }

    let ref = v.ref || "", alt = v.alt || "";

    if (ref.length === 0) {
      ref = "-"
    }
    if (alt.length === 0) {
      alt = "-"
    }

    let ref_length = ref.length;
    let alt_length = alt.length;

    if (ref.length > 4) {
      ref = ref.slice(0, 4) + "..."
    }
    if (alt.length > 4) {
      alt = alt.slice(0, 4) + "..."
    }

    return `<div class="ref-alt"><span class='ref' data-sum='${ref_length}'>${ref}</span><span class='arrow'></span><span class='alt' data-sum='${alt_length}'>${alt}</span></div>`;
  });

  let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_summary?tgv_id=" + params.tgv_id);

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
    let binding = bindings[0];

    if (binding) {
      binding.hgvs = Array.from(new Set(stanza.grouping(bindings, "hgvs").filter(v => v)));
    }

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        binding: binding
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
