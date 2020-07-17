Stanza(function (stanza, params) {
  const Handlebars = stanza.handlebars;

  Handlebars.registerHelper('link', function (text, url) {
    return new Handlebars.SafeString(
      "<a href='" + Handlebars.escapeExpression(url) + "'>" + Handlebars.escapeExpression(text) + "</a>"
    );
  });

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_xrefs.rq",
    parameters: params
  }).then(function (data) {
    const results = stanza.unwrapValueFromBinding(data);

    let xrefs;
    if (results && results.length > 0) {
      xrefs = [
        {
          name: 'dbSNP',
          refs: Array.from(new Set(results.map(x => x.xref)))
            .map(x => ({label: x.split('/').slice(-1)[0], url: x}))
        }
      ];
    }

    stanza.render({
      template: "stanza.html",
      parameters: {
        params: params,
        xrefs: xrefs
      }
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
