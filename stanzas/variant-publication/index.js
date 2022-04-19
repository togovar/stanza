import Stanza from "@/lib/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

const RS_PREFIX = "http://identifiers.org/dbsnp/";

export default class VariantPublication extends Stanza {
  async render() {
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");

    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?tgv_id=${this.params.tgv_id}`);

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
      return unwrapValueFromBinding(json)[0];
    }).then(result => {
      if (!result) {
        return;
      }

      const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/variant_publication?rs=${result.rs.replace(RS_PREFIX, "")}`);

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

    const sources = [
      new URL("./assets/vendor/jquery/3.6.0/jquery.min.js", import.meta.url),
      new URL("./assets/vendor/datatables/1.10.24/jquery.dataTables.js", import.meta.url),
    ];

    this.embedScriptTag(...sources).then(() => {
      $(this.root.querySelector("#dataTable")).DataTable({
        data: r?.result || [],
        searching: false,
        dom: "ilrtfp",
        order: [[2, "desc"]],
        language: {
          emptyTable: "No data",
        },
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
    });

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        params: this.params,
        ...r,
      },
    });
  }
}
