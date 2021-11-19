import "../../lib/stanza";

export default async function genePublication(stanza, params) {

  stanza.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

  const sources = [
    new URL("./assets/vendor/jquery/3.6.0/jquery.min.js", import.meta.url),
    new URL("./assets/vendor/datatables/1.10.24/jquery.dataTables.js", import.meta.url),
  ];

  const scripts = stanza.embedScriptTag(...sources)
 
  let sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/gene_publication?hgnc_id=${params.hgnc_id}`);

  if (params.ep) {
    sparqlist = sparqlist.concat("&ep=" + encodeURIComponent(params.ep));
  }
 
  const r = await fetch(sparqlist, {
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

  stanza.render({
    template: 'stanza.html.hbs',
    parameters: {
      params: params,
      ...r,
    }
  });

  scripts.then(() => {
    $(stanza.select("#dataTable")).DataTable({
      data: r?.result || [],
      searching: false,
      dom: "ilrtfp",
      order: [[2, "desc"]],
      language: {
        emptyTable: "No data",
      },
      lengthMenu: [ [5, 20, 50, -1], [5, 20, 50, "All"] ],
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
