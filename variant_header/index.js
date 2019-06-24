Stanza(function (stanza, params) {
  let Handlebars = stanza.handlebars;

  Handlebars.registerHelper('link', function (text, url) {
    url = Handlebars.escapeExpression(url);
    text = Handlebars.escapeExpression(text);

    return new Handlebars.SafeString(
      "<a href='" + url + "'>" + text + "</a>"
    );
  });

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_xrefs.rq",
    parameters: params
  }).then(function (data) {
    let results = stanza.unwrapValueFromBinding(data);

    let xrefs;
    if (results && results.length > 0) {
      xrefs = [
        {
          name: 'dbSNP',
          refs: Array.from(new Set(results.map(x => x.dbsnp)))
            .map(x => ({label: x.replace('http://identifiers.org/dbsnp/', ''), url: x}))
        }
      ];
    }

    stanza.render({
      template: "stanza.html",
      parameters: {
        xrefs: xrefs
      }
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
