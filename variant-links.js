import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-4313dcda.js';
import { d as describeVariantIdentifier } from './sparqlist-47ca0758.js';
import { a as fetchVariantDataById, b as fetchVariantDataByLocation, r as requireVariantData } from './togovar-variant-0e8288d9.js';
import { p as parseVariantParam, a as assertValidVariantIdentifier } from './variant-0dd96a22.js';
import './utils-97dc77a0.js';

const DEFAULT_MOGPLUS_VERSION = "mogplus21";
const SUPPORTED_MOGPLUS_SOURCE = "GRCh38";
const MOGPLUS_BASE_URL = "https://molossinus.brc.riken.jp";
const CATEGORY_LAYOUT = [
    ["Clinical significance", "Cross species"],
    ["Frequency", "Splice-site creation variant"],
];
const CATEGORY_ANCHORS = {
    "Clinical significance": "#clinical-significance-mgend",
    "Cross species": "#cross-species",
    Frequency: "#frequency",
};
const buildSourceFromExternalLink = (name, link, dataset) => ({
    name,
    dataset,
    value: link?.title,
    url: link?.xref,
    available: Boolean(link),
});
const firstExternalLink = (externalLinks, key) => {
    return externalLinks[key]?.[0];
};
const inferAssemblyFromUrl = (url) => {
    if (!url) {
        return undefined;
    }
    if (/grch38/i.test(url)) {
        return "GRCh38";
    }
    if (/grch37/i.test(url)) {
        return "GRCh37";
    }
    return undefined;
};
const normalizeAssembly = (assembly) => {
    if (!assembly) {
        return undefined;
    }
    if (/^grch38$/i.test(assembly)) {
        return "GRCh38";
    }
    if (/^grch37$/i.test(assembly)) {
        return "GRCh37";
    }
    return assembly;
};
const resolveAssembly = ({ assembly, "data-url": dataUrl, sparqlist, }) => {
    if (assembly) {
        return normalizeAssembly(assembly);
    }
    return inferAssemblyFromUrl(dataUrl) ?? inferAssemblyFromUrl(sparqlist);
};
const normalizeMogplusEntry = (json) => {
    if (Array.isArray(json)) {
        return json[0];
    }
    if (typeof json !== "object" || json === null) {
        return undefined;
    }
    const response = json;
    if (response.error) {
        return undefined;
    }
    if (Array.isArray(response.data)) {
        return response.data[0];
    }
    if (response.target) {
        return response;
    }
    return undefined;
};
const buildMogplusApiUrl = (sparqlist, variant, sourceAssembly, mogplusVersion) => {
    const params = new URLSearchParams({
        source: sourceAssembly,
        chr: variant.chromosome,
        pos: String(variant.position),
        ref: variant.reference,
        alt: variant.alternate,
        mogplus_ver: mogplusVersion,
    });
    return `${sparqlist.replace(/\/+$/, "")}/api/variant_mogplus?${params.toString()}`;
};
const buildMogplusSourceUrl = (entry, mogplusVersion) => {
    if (!entry.chr || !entry.pos) {
        return undefined;
    }
    const strains = Array.isArray(entry.strains) ? entry.strains : [];
    const strainParams = ["refGenome"].concat(strains.map((strain) => strain.replace(/\//g, "_")));
    const query = [
        strainParams
            .map((strain) => `strainNoSlct=${encodeURIComponent(strain)}`)
            .join("&"),
        `chrName=${encodeURIComponent(entry.chr)}`,
        `chrStart=${Number(entry.pos) - 500}`,
        `chrEnd=${Number(entry.pos) + 500}`,
        "seqType=genome",
        "geneNameSearchText=",
        "index=submit",
        "presentType=disp",
    ].join("&");
    return `${MOGPLUS_BASE_URL}/${mogplusVersion}/variantTable/?${query}`;
};
const buildMogplusSource = (entry, mogplusVersion) => ({
    name: "MoG+ (Mouse)",
    value: entry?.chr && entry.pos && entry.ref && entry.alt
        ? `${entry.chr}-${entry.pos}-${entry.ref}-${entry.alt}`
        : undefined,
    url: entry ? buildMogplusSourceUrl(entry, mogplusVersion) : undefined,
    available: Boolean(entry),
});
const fetchMogplusEntry = async (sparqlist, variant, sourceAssembly, mogplusVersion) => {
    if (!sparqlist || !variant) {
        return undefined;
    }
    if (sourceAssembly !== SUPPORTED_MOGPLUS_SOURCE) {
        return undefined;
    }
    try {
        const apiUrl = buildMogplusApiUrl(sparqlist, variant, sourceAssembly, mogplusVersion);
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(`${apiUrl} returned status ${response.status}`);
        }
        return normalizeMogplusEntry(await response.json());
    }
    catch (error) {
        // MoG+ は補助リンクなので、取得失敗時も他DBリンクの表示は継続する。
        console.warn(error);
        return undefined;
    }
};
const buildLinkCategoryRows = (variantData, mogplusEntry, mogplusVersion, sourceAssembly) => {
    const externalLinks = (variantData.external_links ??
        {});
    const frequencySources = [
        buildSourceFromExternalLink("dbSNP", firstExternalLink(externalLinks, "dbsnp")),
        buildSourceFromExternalLink("ToMMo", firstExternalLink(externalLinks, "tommo"), "tommo"),
        ...(sourceAssembly === "GRCh37"
            ? []
            : [
                buildSourceFromExternalLink("JoGo", firstExternalLink(externalLinks, "jogo"), "jogo"),
            ]),
        buildSourceFromExternalLink("gnomAD", firstExternalLink(externalLinks, "gnomad"), "gnomad"),
    ];
    const categories = new Map([
        [
            "Clinical significance",
            {
                label: "Clinical significance",
                anchor: CATEGORY_ANCHORS["Clinical significance"],
                sources: [
                    buildSourceFromExternalLink("ClinVar", firstExternalLink(externalLinks, "clinvar")),
                    buildSourceFromExternalLink("MGeND", firstExternalLink(externalLinks, "mgend")),
                ],
            },
        ],
        [
            "Cross species",
            {
                label: "Cross species",
                anchor: CATEGORY_ANCHORS["Cross species"],
                sources: [buildMogplusSource(mogplusEntry, mogplusVersion)],
            },
        ],
        [
            "Frequency",
            {
                label: "Frequency",
                anchor: CATEGORY_ANCHORS.Frequency,
                sources: frequencySources,
            },
        ],
        [
            "Splice-site creation variant",
            {
                label: "Splice-site creation variant",
                sources: [
                    buildSourceFromExternalLink("SSCVDB", firstExternalLink(externalLinks, "sscv_db")),
                ],
            },
        ],
    ]);
    return CATEGORY_LAYOUT.map(([leftCategory, rightCategory]) => ({
        left: categories.get(leftCategory),
        right: rightCategory ? categories.get(rightCategory) : undefined,
    }));
};
// ============================================================
// Stanza クラス
// ============================================================
class VariantLinks extends Stanza {
    /** 再描画のたびに張り直すクリックリスナーを、disconnect時にまとめて解除するために保持する。 */
    cleanupAnchorLinks = [];
    disconnectedCallback() {
        this.cleanupAnchorLinks.forEach((cleanup) => cleanup());
        this.cleanupAnchorLinks = [];
    }
    async render() {
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = this.params;
        const dataUrl = params["data-url"];
        const tgvId = params.tgv_id;
        const parsedVariant = parseVariantParam(params.variant);
        const templateParams = {
            params,
        };
        try {
            if (!dataUrl) {
                throw new Error("data-url parameter is required");
            }
            assertValidVariantIdentifier(tgvId, params.variant, parsedVariant);
            const apiResponse = tgvId
                ? await fetchVariantDataById(dataUrl, tgvId)
                : await fetchVariantDataByLocation(dataUrl, parsedVariant);
            const variantData = requireVariantData(apiResponse, tgvId, parsedVariant, describeVariantIdentifier(params));
            const mogplusVersion = params.mogplus_ver ?? DEFAULT_MOGPLUS_VERSION;
            const sourceAssembly = resolveAssembly(params);
            const mogplusEntry = await fetchMogplusEntry(params.sparqlist, variantData, sourceAssembly, mogplusVersion);
            templateParams.result = buildLinkCategoryRows(variantData, mogplusEntry, mogplusVersion, sourceAssembly);
        }
        catch (reason) {
            console.error(reason);
            templateParams.error = {
                message: reason instanceof Error ? reason.message : String(reason),
            };
        }
        this.renderTemplate({
            template: "stanza.html.hbs",
            parameters: templateParams,
        });
        this.setupAnchorScrolling();
    }
    /**
     * category-link はページ内アンカー("#id")へのリンク。
     * このstanza自身はShadow DOM内に描画されるため、ブラウザ標準のアンカー遷移(#idジャンプ)は
     * 対象要素がライトDOM側にあれば動作するはずだが、確実にスクロールさせるため
     * document.getElementById() で明示的に探して scrollIntoView する。
     * 対象が見つからない場合(単体プレビュー時など)はデフォルトのリンク遷移に任せる。
     */
    setupAnchorScrolling() {
        this.cleanupAnchorLinks.forEach((cleanup) => cleanup());
        this.cleanupAnchorLinks = [];
        this.root
            .querySelectorAll(".category-link")
            .forEach((link) => {
            const handleClick = (event) => {
                const targetId = link.getAttribute("href")?.replace(/^#/, "");
                const targetElement = targetId
                    ? document.getElementById(targetId)
                    : null;
                if (!targetElement) {
                    return;
                }
                event.preventDefault();
                targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
            };
            link.addEventListener("click", handleClick);
            this.cleanupAnchorLinks.push(() => link.removeEventListener("click", handleClick));
        });
    }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantLinks
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-links",
	"stanza:label": "Variant / Links",
	"stanza:definition": "Display external database links related to the specified variant by category.",
	"stanza:license": "MIT",
	"stanza:author": "PENQE",
	"stanza:contributor": [
],
	"stanza:created": "2026-07-31",
	"stanza:updated": "2026-08-13",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv167913213",
		"stanza:description": "TogoVar ID (required if variant is not given)",
		"stanza:required": false
	},
	{
		"stanza:key": "variant",
		"stanza:example": "1-12345-A-T",
		"stanza:description": "Variant in VCF notation CHROM-POS-REF-ALT (required if tgv_id is not given)",
		"stanza:required": false
	},
	{
		"stanza:key": "data-url",
		"stanza:example": "https://stg-grch38.togovar.org/api/search/variant",
		"stanza:description": "TogoVar API base URL or variant search API URL",
		"stanza:required": true
	},
	{
		"stanza:key": "assembly",
		"stanza:example": "GRCh38",
		"stanza:description": "Assembly of the TogoVar variant coordinates. MoG+ lookup is enabled only for GRCh38, and JoGo links are hidden for GRCh37.",
		"stanza:required": false
	},
	{
		"stanza:key": "sparqlist",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL for MoG+ cross species links",
		"stanza:required": false
	},
	{
		"stanza:key": "mogplus_ver",
		"stanza:example": "mogplus21",
		"stanza:description": "MoG+ version",
		"stanza:required": false
	}
],
	"stanza:menu-placement": "bottom-right",
	"stanza:style": [
],
	"stanza:incomingEvent": [
],
	"stanza:outgoingEvent": [
]
};

var templates = [
  ["stanza.html.hbs", {"0":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class=\"alert alert-danger\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":45}}}) : helper)))
    + "</div>\n";
},"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(24, data, 0),"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":84,"column":9}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <dl class=\"variant-links-list\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":6},"end":{"line":80,"column":15}}})) != null ? stack1 : "")
    + "    </dl>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class=\"category-row\">\n"
    + ((stack1 = lookupProperty(helpers,"with").call(alias1,(depth0 != null ? lookupProperty(depth0,"left") : depth0),{"name":"with","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":8,"column":10},"end":{"line":41,"column":19}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"right") : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":10},"end":{"line":78,"column":17}}})) != null ? stack1 : "")
    + "        </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <dt class=\"category-label category-label-left\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"anchor") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":10,"column":14},"end":{"line":14,"column":21}}})) != null ? stack1 : "")
    + "            </dt>\n            <dd class=\"category-value category-value-left\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"sources") : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":17,"column":14},"end":{"line":39,"column":23}}})) != null ? stack1 : "")
    + "            </dd>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <a class=\"category-link\" href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"anchor") || (depth0 != null ? lookupProperty(depth0,"anchor") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"anchor","hash":{},"data":data,"loc":{"start":{"line":11,"column":47},"end":{"line":11,"column":57}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data,"loc":{"start":{"line":11,"column":59},"end":{"line":11,"column":68}}}) : helper)))
    + "<span class=\"caret-down\"></span></a>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"label","hash":{},"data":data,"loc":{"start":{"line":13,"column":16},"end":{"line":13,"column":25}}}) : helper)))
    + "\n";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <span class=\"source\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"dataset") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":19,"column":18},"end":{"line":21,"column":25}}})) != null ? stack1 : "")
    + "                  <span class=\"source-name\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":22,"column":44},"end":{"line":22,"column":52}}}) : helper)))
    + "</span>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"url") : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":23,"column":18},"end":{"line":36,"column":25}}})) != null ? stack1 : "")
    + "                  "
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(data && lookupProperty(data,"last")),{"name":"unless","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":18},"end":{"line":37,"column":93}}})) != null ? stack1 : "")
    + "\n                </span>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <span class=\"dataset-icon\" data-dataset=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"dataset") || (depth0 != null ? lookupProperty(depth0,"dataset") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"dataset","hash":{},"data":data,"loc":{"start":{"line":20,"column":61},"end":{"line":20,"column":72}}}) : helper)))
    + "\"></span>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                    <a\n                      class=\"source-link\"\n                      href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data,"loc":{"start":{"line":26,"column":28},"end":{"line":26,"column":35}}}) : helper)))
    + "\"\n                      target=\"_blank\"\n                      rel=\"noopener noreferrer\"\n                    >"
    + alias4(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data,"loc":{"start":{"line":29,"column":21},"end":{"line":29,"column":30}}}) : helper)))
    + "<span class=\"external-link-icon\"></span></a>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"available") : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(12, data, 0),"data":data,"loc":{"start":{"line":31,"column":20},"end":{"line":35,"column":27}}})) != null ? stack1 : "");
},"11":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                      <span class=\"source-value\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"value","hash":{},"data":data,"loc":{"start":{"line":32,"column":49},"end":{"line":32,"column":58}}}) : helper)))
    + "</span>\n";
},"12":function(container,depth0,helpers,partials,data) {
    return "                      <span class=\"not-available\">N/A</span>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "<span class=\"source-separator\">&#8288;, </span>";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"right") : depth0),{"name":"with","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":44,"column":12},"end":{"line":77,"column":21}}})) != null ? stack1 : "");
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <dt class=\"category-label category-label-right\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"anchor") : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.program(17, data, 0),"data":data,"loc":{"start":{"line":46,"column":16},"end":{"line":50,"column":23}}})) != null ? stack1 : "")
    + "              </dt>\n              <dd class=\"category-value category-value-right\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"sources") : depth0),{"name":"each","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":53,"column":16},"end":{"line":75,"column":25}}})) != null ? stack1 : "")
    + "              </dd>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  <a class=\"category-link\" href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"anchor") || (depth0 != null ? lookupProperty(depth0,"anchor") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"anchor","hash":{},"data":data,"loc":{"start":{"line":47,"column":49},"end":{"line":47,"column":59}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data,"loc":{"start":{"line":47,"column":61},"end":{"line":47,"column":70}}}) : helper)))
    + "<span class=\"caret-down\"></span></a>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"label","hash":{},"data":data,"loc":{"start":{"line":49,"column":18},"end":{"line":49,"column":27}}}) : helper)))
    + "\n";
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  <span class=\"source\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"dataset") : depth0),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":55,"column":20},"end":{"line":57,"column":27}}})) != null ? stack1 : "")
    + "                    <span class=\"source-name\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":58,"column":46},"end":{"line":58,"column":54}}}) : helper)))
    + "</span>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"url") : depth0),{"name":"if","hash":{},"fn":container.program(20, data, 0),"inverse":container.program(21, data, 0),"data":data,"loc":{"start":{"line":59,"column":20},"end":{"line":72,"column":27}}})) != null ? stack1 : "")
    + "                    "
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(data && lookupProperty(data,"last")),{"name":"unless","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":73,"column":20},"end":{"line":73,"column":95}}})) != null ? stack1 : "")
    + "\n                  </span>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                      <span class=\"dataset-icon\" data-dataset=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"dataset") || (depth0 != null ? lookupProperty(depth0,"dataset") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"dataset","hash":{},"data":data,"loc":{"start":{"line":56,"column":63},"end":{"line":56,"column":74}}}) : helper)))
    + "\"></span>\n";
},"20":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                      <a\n                        class=\"source-link\"\n                        href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"url") || (depth0 != null ? lookupProperty(depth0,"url") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"url","hash":{},"data":data,"loc":{"start":{"line":62,"column":30},"end":{"line":62,"column":37}}}) : helper)))
    + "\"\n                        target=\"_blank\"\n                        rel=\"noopener noreferrer\"\n                      >"
    + alias4(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data,"loc":{"start":{"line":65,"column":23},"end":{"line":65,"column":32}}}) : helper)))
    + "<span class=\"external-link-icon\"></span></a>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"available") : depth0),{"name":"if","hash":{},"fn":container.program(22, data, 0),"inverse":container.program(23, data, 0),"data":data,"loc":{"start":{"line":67,"column":22},"end":{"line":71,"column":29}}})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <span class=\"source-value\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"value","hash":{},"data":data,"loc":{"start":{"line":68,"column":51},"end":{"line":68,"column":60}}}) : helper)))
    + "</span>\n";
},"23":function(container,depth0,helpers,partials,data) {
    return "                        <span class=\"not-available\">N/A</span>\n";
},"24":function(container,depth0,helpers,partials,data) {
    return "    <p class=\"variant-links-no-data\">No data</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":85,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-links.js.map
