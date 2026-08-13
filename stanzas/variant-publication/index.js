import Stanza from "@/lib/stanza";
import {unwrapValueFromBinding} from "togostanza/utils";

import {ROBOTO_CONDENSED_CSS_URL} from "@/lib/constants";
import {buildIdentifierQueryString, describeVariantIdentifier} from "@/lib/sparqlist";
import {fetchVariantDataByIdentifier} from "@/lib/togovar-variant";
import {assertValidVariantIdentifier, parseVariantParam} from "@/lib/variant";

const RS_PREFIX = "http://identifiers.org/dbsnp/";

export default class VariantPublication extends Stanza {
  async render() {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params ?? {};
    const parsedVariant = parseVariantParam(params.variant);

    const r = await Promise.resolve().then(async () => {
      assertValidVariantIdentifier(params.tgv_id, params.variant, parsedVariant);

      let tgvId = params.tgv_id;
      if (!tgvId) {
        if (!params["data-url"]) {
          throw new Error("data-url parameter is required when variant is given without tgv_id");
        }

        const variantData = await fetchVariantDataByIdentifier(
          params["data-url"],
          tgvId,
          parsedVariant,
          describeVariantIdentifier(params),
        );
        tgvId = variantData.id;
      }

      // tgv2rs は variant を解釈しないため、必ず解決済みの tgv_id だけを渡す。
      const queryString = buildIdentifierQueryString({ tgv_id: tgvId });
      const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/tgv2rs?${queryString}`);

      return fetch(sparqlist, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
    }).then(res => {
      if (res.ok) {
        return res.json();
      }
      throw new Error("tgv2rs returns status " + res.status);
    }).then(json => {
      return unwrapValueFromBinding(json)[0];
    }).then(result => {
      if (!result) {
        return;
      }

      const sparqlist = (params.sparqlist || "/sparqlist").concat(`/api/variant_publication?rs=${result.rs.replace(RS_PREFIX, "")}`);

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
