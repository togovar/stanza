export default async function diseaseHeader(stanza, params) {

  const r = await stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch.rq",
    parameters: {
      ...params,
    }
  }).then(data => {
    const results = stanza.unwrapValueFromBinding(data);

    let xrefs;
    if (results && results.length >0){
      xrefs = [{
        name: "Disease Report",
        refs: Array.from(new Set(stanza.grouping(results, "xref").filter(v => v))).map(x => ({label: x})),
        approved_name: Array.from(new Set(stanza.grouping(results, "approved_name").filter(v => v))).map(x => ({label: x})),
      }];
    }
    return {result: {xrefs:xrefs}};

  }).catch(e => ({error: {message: e.message}}));

  stanza.render({
    template: 'stanza.html.hbs',
    parameters: {
      params: params,
      ...r,
    },
  });
}
