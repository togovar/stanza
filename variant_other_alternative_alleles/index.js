Stanza(function (stanza, params) {
  stanza.handlebars.registerHelper("print_allele", function (v) {
    if (!v) {
      return
    }

    let ref = v.reference || "";
    let alt = v.alternative || "";

    if (ref.length === 0) {
      ref = "-"
    }
    if (alt.length === 0) {
      alt = "-"
    }

    return ref + " / " + alt;
  });

  stanza.handlebars.registerHelper("so_label", function (accession) {
    return {
      "SO_0001483": "SNV",
      "SO_0000667": "insertion",
      "SO_0000159": "deletion",
      "SO_1000032": "indel",
      "SO_1000002": "substitution"
    }[accession] || "Unknown";
  });

  stanza.handlebars.registerHelper("badge", function (count) {
    return parseInt(count) > 1 ? '' + (count - 1) + '+' : '';
  });

  if (params.api && params.ep) {
    stanza.query({
      endpoint: params.ep,
      template: "fetch_position.rq",
      parameters: params
    }).then(function (data) {
      let v = stanza.unwrapValueFromBinding(data)[0];

      if (!v) {
        return
      }

      let url = params.api.concat("?stat=0&quality=0&start_only&term=" + v.chromosome + ":" + v.position);

      fetch(url, {method: "GET", headers: {"Accept": "application/json"}}).then(function (response) {
        if (response.ok) {
          return response.json();
        }
      }).then(function (json) {
        let data = json.data;

        stanza.render({
          template: "stanza.html",
          parameters: {
            data: data ? data.filter(v => v.id !== params.tgv_id) : []
          }
        });
      }).catch(function (e) {
        stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
        throw e;
      });
    }).catch(function (e) {
      stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
      throw e;
    });
  }
});
