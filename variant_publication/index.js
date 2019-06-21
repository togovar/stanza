Stanza(function (stanza, params) {
  params.prefix = "http://identifiers.org/dbsnp/";

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_rs.rq",
    parameters: params
  }).then(function (data) {
    let rs = stanza.unwrapValueFromBinding(data)[0];

    if (!rs) {
      stanza.render({
        template: "stanza.html",
        parameters: {
          message: "No data"
        }
      });

      return
    }

    let sparqlist = (params.api ? params.api : "/sparqlist/api").concat("/variant_publication?rs=" + rs.uri.replace(params.prefix, ""));

    // if (params.ep) {
    //   sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep))
    // }

    stanza.render({
      template: "stanza.html"
    });

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
      if (!json) {
        return ''
      }

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
      stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
      throw e;
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
