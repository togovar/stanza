import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { c as caddPhred, b as alphaMissense, s as sift, p as polyphen } from './display-3a18fc32.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-c005a6eb.js';
import { b as buildSparqlistApiUrl, f as fetchSparqlBindings } from './sparqlist-0870b0c9.js';
import './frequency-9d3406e7.js';
import './utils-97dc77a0.js';

// ============================================================
// 定数
// ============================================================
/**
 * Ensembl Identifiers.org の URI プレフィックス。
 * `enst_id` と連結してトランスクリプトのリンクURLを生成する。
 */
const ENSEMBL_IDENTIFIER_BASE_URL = "https://identifiers.org/ensembl/";
const MANE_URL = "https://www.ncbi.nlm.nih.gov/refseq/MANE/";
/**
 * NCBI Nucleotide(Nuccore) の URI プレフィックス。
 * RefSeq transcript ID(NM_...)と連結してリンクURLを生成する。
 * identifiers.org の `refseq` 名前空間は NM_... を誤って protein DB へ解決するため使わない。
 */
const NCBI_NUCCORE_BASE_URL = "https://www.ncbi.nlm.nih.gov/nuccore/";
/** `enst_id` がEnsembl transcript ID(ENST...)かどうかの判定に使う。 */
const ENSEMBL_TRANSCRIPT_ID_PATTERN = /^ENST\d/i;
// ============================================================
// データ変換（バインディング → 表示行）
// ============================================================
/**
 * URI形式の transcript フィールドと enst_id から、テンプレートが使えるリンク情報を組み立てる。
 * enst_id と、transcript の末尾パスセグメントは同じトランスクリプトを指す想定だが、
 * どちらか一方しか束縛されない行があるため、束縛されている方を優先してIDとして採用する
 * （enst_id を優先。無ければ transcript 由来のラベルを使う）。
 * ラベルとリンク先の判定は、常にこの単一のIDを基準に行うことで、
 * 「transcript側だけENST形式なのにNCBIへ誤ってリンクする」「enst_idはあるがラベルが空になる」
 * といった不整合を防ぐ。
 * sparqlist側はリンクを返さない方針のため、リンクURLは常にstanza側で組み立てる。
 *
 * - IDがEnsembl transcript ID(ENST...)の場合: identifiers.org 経由でEnsembl公式ページへ。
 * - それ以外（NM_...など）: NCBI Nuccoreへ直接リンクする。
 */
const createTranscriptLink = (binding) => {
    // 例: "http://rdf.ebi.ac.uk/resource/ensembl.transcript/ENST00000123456" → "ENST00000123456"
    //     "https://www.ncbi.nlm.nih.gov/nuccore/NM_000690.4" → "NM_000690.4"
    const transcriptLabel = binding.transcript
        ? binding.transcript.split("/").pop() || ""
        : "";
    const id = binding.enst_id || transcriptLabel;
    if (!id) {
        return { label: "", url: null };
    }
    const url = ENSEMBL_TRANSCRIPT_ID_PATTERN.test(id)
        ? `${ENSEMBL_IDENTIFIER_BASE_URL}${id}`
        : `${NCBI_NUCCORE_BASE_URL}${id}`;
    return { label: id, url };
};
const isGrch38 = ({ assembly, sparqlist }) => /^grch38$/i.test(String(assembly ?? "")) || /grch38/i.test(sparqlist ?? "");
const includesManeSelect = (mane) => Array.isArray(mane)
    ? mane.some((value) => /MANE_Select/i.test(value))
    : /MANE_Select/i.test(mane ?? "");
/**
 * MANE Select transcript かどうかを判定する。
 * 表示には SPARQList 側から `mane` が返る必要がある。
 * `mane_select` は RefSeq ID(NM_...)のため、Ensembl transcript ID(ENST...)との比較には使わない。
 *
 * `mane` と `transcript`/`enst_id` はSPARQL上で別々のOPTIONAL節から取得されるため、
 * transcriptへのリンクを持たない（RefSeq側のみに紐づくなど）consequenceリソースにも
 * `mane` が付くことがある。これは正当なMANE Select情報のため、Transcript IDの有無に
 * かかわらずバッジを表示する。
 */
const isManeSelectTranscript = (binding, params) => {
    if (!isGrch38(params)) {
        return false;
    }
    return includesManeSelect(binding.mane);
};
/**
 * SPARQL バインディング1行をテンプレート表示行へ変換する。
 *
 * 変換内容:
 * - transcript URI → TranscriptLink（ラベル + URL）
 * - consequence_label カンマ区切り文字列 → string 配列
 * - CADD (PHRED score) / AlphaMissense / SIFT / PolyPhen 生スコア
 *   → 表示文字列 + CSS クラス + ラベル
 *
 * スコアの変換ロジックは lib/display に集約されているため、ここでは変換の順番と
 * Object.assign によるフィールド合成だけを担う。
 */
const convertBindingToDisplayRow = (binding, params) => {
    // テンプレート向けに型が変わるフィールドを分離し、残りはそのまま引き継ぐ
    const { transcript: _transcriptUri, consequence_label: rawConsequenceLabel, cadd_phred: caddPhredScore, alpha_missense: alphaMissenseScore, sift: siftScore, polyphen: polyphenScore, ...sharedFields } = binding;
    const transcript = createTranscriptLink(binding);
    const displayRow = {
        ...sharedFields,
        transcript,
        is_mane_select: isManeSelectTranscript(binding, params),
        mane_url: MANE_URL,
        consequence_label: rawConsequenceLabel
            ? rawConsequenceLabel.split(",")
            : [],
    };
    // lib/display の共通関数でスコアを表示用フィールドへ展開する
    Object.assign(displayRow, caddPhred(caddPhredScore));
    Object.assign(displayRow, alphaMissense(alphaMissenseScore));
    Object.assign(displayRow, sift(siftScore));
    Object.assign(displayRow, polyphen(polyphenScore));
    return displayRow;
};
// ============================================================
// Stanza クラス
// ============================================================
class VariantTranscript extends Stanza {
    /**
     * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
     * 「URL組み立て → データ取得 → 変換 → テンプレート描画」の流れだけが見えるよう保ち、
     * 各処理の詳細は上位の関数へ委譲する。エラーはここで一括補足してテンプレートへ渡す。
     */
    async render() {
        // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
        this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);
        const params = this.params;
        // 初期状態は params のみ。取得成功時に result、失敗時に error を追加する
        const templateParams = { params };
        try {
            const apiUrl = buildSparqlistApiUrl("variant_transcript", params);
            const sparqlBindings = await fetchSparqlBindings(apiUrl);
            templateParams.result = sparqlBindings.map((binding) => convertBindingToDisplayRow(binding, params));
        }
        catch (error) {
            templateParams.error = {
                message: error instanceof Error ? error.message : String(error),
            };
        }
        this.renderTemplate({
            template: "stanza.html.hbs",
            parameters: templateParams,
        });
    }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantTranscript
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-transcript",
	"stanza:label": "Variant / Transcript",
	"stanza:definition": "Display gene and transcript consequences",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-04-22",
	"stanza:updated": "2026-07-27",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv219804",
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
		"stanza:key": "assembly",
		"stanza:example": "GRCh38",
		"stanza:description": "Reference genome assembly",
		"stanza:required": false
	},
	{
		"stanza:key": "sparqlist",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "SPARQList URL (required)",
		"stanza:required": true
	}
],
	"stanza:about-link-placement": "bottom-right",
	"stanza:style": [
	{
		"stanza:key": "--togostanza-canvas-height",
		"stanza:type": "number",
		"stanza:default": 280,
		"stanza:description": "Canvas height"
	}
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

  return "  <table class=\"table\">\n    <thead>\n      <tr>\n        <th>Transcript ID</th>\n        <th>Gene symbol</th>\n        <th>Consequence type</th>\n        <th>HGVS(cDNA)</th>\n        <th>HGVS(Amino acid seq.)</th>\n        <th>CADD (PHRED score)</th>\n        <th>AlphaMissense</th>\n        <th>SIFT</th>\n        <th>PolyPhen</th>\n      </tr>\n    </thead>\n\n    <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(10, data, 0),"data":data,"loc":{"start":{"line":20,"column":6},"end":{"line":99,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"url") : stack1),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":23,"column":12},"end":{"line":34,"column":19}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"is_mane_select") : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":12},"end":{"line":42,"column":19}}})) != null ? stack1 : "")
    + "          </td>\n          <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"gene_xref") : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(8, data, 0),"data":data,"loc":{"start":{"line":45,"column":12},"end":{"line":56,"column":19}}})) != null ? stack1 : "")
    + "          </td>\n          <td>\n            <ul class=\"no-bullet\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"consequence_label") : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":60,"column":14},"end":{"line":62,"column":23}}})) != null ? stack1 : "")
    + "            </ul>\n          </td>\n          <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hgvs_c") || (depth0 != null ? lookupProperty(depth0,"hgvs_c") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hgvs_c","hash":{},"data":data,"loc":{"start":{"line":65,"column":14},"end":{"line":65,"column":24}}}) : helper)))
    + "</td>\n          <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hgvs_p") || (depth0 != null ? lookupProperty(depth0,"hgvs_p") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hgvs_p","hash":{},"data":data,"loc":{"start":{"line":66,"column":14},"end":{"line":66,"column":24}}}) : helper)))
    + "</td>\n          <td class=\"cadd\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"cadd_phred_class") || (depth0 != null ? lookupProperty(depth0,"cadd_phred_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"cadd_phred_class","hash":{},"data":data,"loc":{"start":{"line":70,"column":29},"end":{"line":70,"column":49}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"cadd_phred") || (depth0 != null ? lookupProperty(depth0,"cadd_phred") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"cadd_phred","hash":{},"data":data,"loc":{"start":{"line":71,"column":13},"end":{"line":71,"column":27}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"alphamissense\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense_class") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense_class","hash":{},"data":data,"loc":{"start":{"line":76,"column":29},"end":{"line":76,"column":53}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense") || (depth0 != null ? lookupProperty(depth0,"alpha_missense") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense","hash":{},"data":data,"loc":{"start":{"line":77,"column":13},"end":{"line":77,"column":31}}}) : helper)))
    + "</span>\n            <span class=\"alphamissense-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense_label") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense_label","hash":{},"data":data,"loc":{"start":{"line":78,"column":46},"end":{"line":78,"column":70}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"sift\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"sift_class") || (depth0 != null ? lookupProperty(depth0,"sift_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift_class","hash":{},"data":data,"loc":{"start":{"line":83,"column":29},"end":{"line":83,"column":43}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"sift") || (depth0 != null ? lookupProperty(depth0,"sift") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift","hash":{},"data":data,"loc":{"start":{"line":84,"column":13},"end":{"line":84,"column":21}}}) : helper)))
    + "</span>\n            <span class=\"sift-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"sift_label") || (depth0 != null ? lookupProperty(depth0,"sift_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift_label","hash":{},"data":data,"loc":{"start":{"line":85,"column":37},"end":{"line":85,"column":51}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"polyphen\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen_class") || (depth0 != null ? lookupProperty(depth0,"polyphen_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen_class","hash":{},"data":data,"loc":{"start":{"line":90,"column":29},"end":{"line":90,"column":47}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen") || (depth0 != null ? lookupProperty(depth0,"polyphen") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen","hash":{},"data":data,"loc":{"start":{"line":91,"column":13},"end":{"line":91,"column":25}}}) : helper)))
    + "</span>\n            <span class=\"polyphen-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen_label") || (depth0 != null ? lookupProperty(depth0,"polyphen_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen_label","hash":{},"data":data,"loc":{"start":{"line":92,"column":41},"end":{"line":92,"column":59}}}) : helper)))
    + "</span>\n          </td>\n        </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a\n                href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\"\n                target=\"_blank\"\n                rel=\"noopener noreferrer\"\n              >"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "<span\n                  class=\"external-link-icon\"\n                  aria-hidden=\"true\"\n                ></span></a>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              "
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a\n                class=\"mane-badge"
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"label") : stack1),{"name":"unless","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":33},"end":{"line":37,"column":90}}})) != null ? stack1 : "")
    + "\"\n                href=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"mane_url") || (depth0 != null ? lookupProperty(depth0,"mane_url") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"mane_url","hash":{},"data":data,"loc":{"start":{"line":38,"column":22},"end":{"line":38,"column":34}}}) : helper)))
    + "\"\n                target=\"_blank\"\n                rel=\"noopener noreferrer\"\n              >MANE</a>\n";
},"6":function(container,depth0,helpers,partials,data) {
    return " -no-transcript-id";
},"7":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a\n                href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"gene_xref") || (depth0 != null ? lookupProperty(depth0,"gene_xref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gene_xref","hash":{},"data":data,"loc":{"start":{"line":47,"column":22},"end":{"line":47,"column":35}}}) : helper)))
    + "\"\n                target=\"_blank\"\n                rel=\"noopener noreferrer\"\n              >"
    + alias4(((helper = (helper = lookupProperty(helpers,"gene_symbol") || (depth0 != null ? lookupProperty(depth0,"gene_symbol") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gene_symbol","hash":{},"data":data,"loc":{"start":{"line":50,"column":15},"end":{"line":50,"column":30}}}) : helper)))
    + "<span\n                  class=\"external-link-icon\"\n                  aria-hidden=\"true\"\n                ></span></a>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"gene_symbol") || (depth0 != null ? lookupProperty(depth0,"gene_symbol") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"gene_symbol","hash":{},"data":data,"loc":{"start":{"line":55,"column":14},"end":{"line":55,"column":29}}}) : helper)))
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "                <li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"10":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td colspan=\"9\" class=\"text-center\">No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":102,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-transcript.js.map
