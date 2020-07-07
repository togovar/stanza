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

    let sparqlist = (params.sparqlist ? params.sparqlist : "/sparqlist").concat("/api/variant_publication?rs=" + rs.xref.replace(params.prefix, ""));

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
      $(stanza.select("#dataTable")).append('<caption>Note: The link to LitVar leads to a list of all PubMed articles related to this variant. ' +
        'Please find a PMID of your choice in the list.</caption>');

      $(stanza.select("#dataTable")).dataTable({
        columns: json.columns,
        data: json.data,
        searching: false,
        dom: "ilrtfp",
        order: [[2, "desc"]],
        columnDefs: [
          {
            targets: 3,
            className: 'dt-head-right dt-body-right',
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
