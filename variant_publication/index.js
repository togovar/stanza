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

    let url = (params.api ? params.api : "").concat("/variant_publication?rs=" + rs.uri.replace(params.prefix, ""));

    // if (params.ep) {
    //   url = url.concat("&ep=" + encodeURIComponent(params.ep))
    // }

    stanza.render({
      template: "stanza.html"
    });

    $.ajax({
      type: "GET",
      url: url,
      dataType: "json",
      success: function (json) {
        let headers = "";
        $.each(json.columns, function (i, val) {
          headers += "<th data-label = " + val + ">" + val + "</th>";
        });

        $(stanza.select("#target")).html('<table id="displayTable"><thead><tr>' + headers + '</tr></thead></table>');

        json.searching = false;
        json.dom = "ilrtfp";
        json.order = [[2, "desc"]];

        $(stanza.select("#displayTable")).dataTable(json);
      }
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
