import "../../lib/stanza";

const RS_PREFIX = "http://identifiers.org/dbsnp/";

export default async function variantPublication(stanza, params) {
  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  const scripts = stanza.embbedScriptTag("./assets/vendor/jquery/3.6.0/jquery.min.js", "./assets/vendor/datatables/1.10.24/jquery.dataTables.js")

  const r = await stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_rs.rq",
    parameters: {
      prefix: RS_PREFIX,
      ...params,
    }
  }).then(data => {
    return stanza.unwrapValueFromBinding(data)[0];
  }).then(rs => {
    if (!rs) {
      return;
    }

    let sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_publication?rs=${rs.xref.replace(RS_PREFIX, "")}`);

    if (params.ep) {
      sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep));
    }

    return fetch(sparqlist, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    }).then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error(sparqlist + " returns status " + res.status);
    }).then(json => {
      return {
        result: json.data.map(x => x.reduce((previousValue, currentValue, currentIndex) => {
          previousValue[json.columns[currentIndex]] = currentValue;
          return previousValue;
        }, {}))
      }
    }).catch(e => ({ error: { message: e.message } }));
  });

  stanza.render({
    template: "stanza.html.hbs",
    parameters: {
      params: params,
      ...r,
    },
  });

  scripts.then(() => {
    $(stanza.select("#dataTable")).DataTable({
      data: r.result || [],
      searching: false,
      dom: "ilrtfp",
      order: [[2, "desc"]],
      columns: [
        {
          data: 'PMID',
          title: 'PMID',
        },
        {
          data: 'Reference',
          title: 'Reference',
        },
        {
          data: 'Year',
          title: 'Year',
        },
        {
          data: 'Cited by',
          title: 'Cited by',
          className: 'dt-head-right dt-body-right',
          render: (data, type, _row) => {
            if (type === "display" && Array.isArray(data)) {
              data = `<ul>${data.map(x => `<li>${x}</li>`).join("")}</ul>`;
            }
            return data;
          }
        },
      ]
    });
  })
}
