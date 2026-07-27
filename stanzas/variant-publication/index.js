import Stanza from "@/lib/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";

const RS_PREFIX = "http://identifiers.org/dbsnp/";

export default class VariantPublication extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    // tgv_id が無いバリアント（TogoVar未登録）は variant(CHROM-POS-REF-ALT) で解決する。
    // sparqlist側は tgv_id があれば優先し、無ければ variant を使う。
    const queryString = new URLSearchParams({
      tgv_id: this.params.tgv_id ?? "",
      variant: this.params.variant ?? "",
    }).toString();
    const sparqlist = (this.params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);

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
