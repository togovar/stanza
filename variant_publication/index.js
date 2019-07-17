Stanza(function (stanza, params) {
  // set default value
  if (!params.base_url) {
    params.base_url = "/stanza";
  }

  if (!params.tgv_id) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: "Parameter missing: tgv_id",
      }
    });
  }

  params.prefix = "http://identifiers.org/dbsnp/";

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_rs.rq",
    parameters: params
  }).then(function (data) {
    let rs = stanza.unwrapValueFromBinding(data)[0];

    if (!rs) {
      return stanza.render({
        template: "error.html",
        parameters: {
          params: params,
          message: "No data",
        }
      });
    }

    let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_publication?rs=" + rs.uri.replace(params.prefix, ""));

    // if (params.ep) {
    //   sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep))
    // }

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
      if (!(json.data && json.data.length > 0)) {
        return stanza.render({
          template: "error.html",
          parameters: {
            params: params,
            message: "No data",
          }
        });
      }

      stanza.render({
        template: "stanza.html",
        parameters: {
          params: params
        }
      });

      $(stanza.select("#container")).html('<table id="dataTable"><thead><tr>' + json.columns.map(x => "<th>" + x + "</th>").join("") + '</tr></thead></table>');

      $(stanza.select("#dataTable")).dataTable({
        columns: json.columns,
        data: json.data,
        searching: false,
        dom: "ilrtfp",
        order: [[2, "desc"]],
        columnDefs: [
          {
            targets: 4,
            orderable: false,
            render: function (data, type, row) {
              if (type === "display" && Array.isArray(data)) {
                return "<ul>" + data.map(x => "<li>" + x + "</li>").join("") + "</ul>";
              } else {
                return data;
              }
            }
          }
        ]
      });
    }).catch(function (e) {
      return stanza.render({
        template: "error.html",
        parameters: {
          params: params,
          message: e.message,
        }
      });
    });
  }).catch(function (e) {
    return stanza.render({
      template: "error.html",
      parameters: {
        params: params,
        message: e.message,
      }
    });
  });
});
