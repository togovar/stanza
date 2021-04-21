import uniq from "../../lib/uniq.js";

export default async function variantHeader(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  const r = await stanza.query({
    template: "fetch_xrefs.rq",
    parameters: params,
    endpoint: params?.ep || "/sparql",
  }).then(data => {
    const results = stanza.unwrapValueFromBinding(data);

    if (!results || results.length === 0) {
      return {result: {xrefs: {}}};
    }

    return {
      result: {
        xrefs: [
          {
            name: "dbSNP",
            refs: uniq(results.map(x => x.xref)).map(x => ({label: x.split("/").slice(-1)[0], url: x})),
          },
        ],
      },
    };
  }).catch(e => ({error: {message: e.message}}));

  // adhoc background for help page
  if (window.location.pathname === `/${stanza.metadata["@id"]}.html`) {
    stanza.root.querySelector("main").style.background = "linear-gradient(90deg,#249eb3,#46b9cc)";
  }

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });
}
