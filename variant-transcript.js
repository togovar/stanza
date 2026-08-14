import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { c as caddPhred, b as alphaMissense, s as sift, p as polyphen } from './display-a7e019c1.js';
import { R as ROBOTO_CONDENSED_CSS_URL } from './constants-4313dcda.js';
import { b as buildSparqlistApiUrl, f as fetchSparqlBindings } from './sparqlist-47ca0758.js';
import './frequency-9d3406e7.js';
import './utils-97dc77a0.js';

// ============================================================
// 定数
// ============================================================
/**
 * Ensembl Identifiers.org の URI プレフィックス。
 * `enst_id` と連結してトランスクリプトのリンクURLを生成する。
 */
const ENSEMBL_IDENTIFIER_BASE_URL = "http://identifiers.org/ensembl/";
// ============================================================
// データ変換（バインディング → 表示行）
// ============================================================
/**
 * URI形式の transcript フィールドと enst_id から、テンプレートが使えるリンク情報を組み立てる。
 * URI の末尾パスセグメントをラベルとして使い、enst_id がない場合は url を null にする。
 */
const createEnsemblTranscriptLink = (binding) => {
    // "http://identifiers.org/ensembl/ENST00000123456" → "ENST00000123456"
    const label = binding.transcript
        ? binding.transcript.split("/").pop() || ""
        : "";
    // enst_id が欠落しているバインディングではリンクを表示しない
    const url = binding.enst_id
        ? `${ENSEMBL_IDENTIFIER_BASE_URL}${binding.enst_id}`
        : null;
    return { label, url };
};
/**
 * SPARQL バインディング1行をテンプレート表示行へ変換する。
 *
 * 変換内容:
 * - transcript URI → EnsemblTranscriptLink（ラベル + URL）
 * - consequence_label カンマ区切り文字列 → string 配列
 * - CADD (PHRED score) / AlphaMissense / SIFT / PolyPhen 生スコア
 *   → 表示文字列 + CSS クラス + ラベル
 *
 * スコアの変換ロジックは lib/display に集約されているため、ここでは変換の順番と
 * Object.assign によるフィールド合成だけを担う。
 */
const convertBindingToDisplayRow = (binding) => {
    // テンプレート向けに型が変わるフィールドを分離し、残りはそのまま引き継ぐ
    const { transcript: _transcriptUri, consequence_label: rawConsequenceLabel, cadd_phred: caddPhredScore, alpha_missense: alphaMissenseScore, sift: siftScore, polyphen: polyphenScore, ...sharedFields } = binding;
    const displayRow = {
        ...sharedFields,
        transcript: createEnsemblTranscriptLink(binding),
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
            templateParams.result = sparqlBindings.map(convertBindingToDisplayRow);
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
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(6, data, 0),"data":data,"loc":{"start":{"line":20,"column":6},"end":{"line":71,"column":15}}})) != null ? stack1 : "")
    + "    </tbody>\n  </table>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <tr>\n          <td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"url") : stack1),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":23,"column":12},"end":{"line":27,"column":19}}})) != null ? stack1 : "")
    + "          </td>\n          <td><a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"gene_xref") || (depth0 != null ? lookupProperty(depth0,"gene_xref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gene_xref","hash":{},"data":data,"loc":{"start":{"line":29,"column":23},"end":{"line":29,"column":36}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"gene_symbol") || (depth0 != null ? lookupProperty(depth0,"gene_symbol") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gene_symbol","hash":{},"data":data,"loc":{"start":{"line":29,"column":38},"end":{"line":29,"column":53}}}) : helper)))
    + "</a></td>\n          <td>\n            <ul class=\"no-bullet\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"consequence_label") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":32,"column":14},"end":{"line":34,"column":23}}})) != null ? stack1 : "")
    + "            </ul>\n          </td>\n          <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hgvs_c") || (depth0 != null ? lookupProperty(depth0,"hgvs_c") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hgvs_c","hash":{},"data":data,"loc":{"start":{"line":37,"column":14},"end":{"line":37,"column":24}}}) : helper)))
    + "</td>\n          <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hgvs_p") || (depth0 != null ? lookupProperty(depth0,"hgvs_p") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hgvs_p","hash":{},"data":data,"loc":{"start":{"line":38,"column":14},"end":{"line":38,"column":24}}}) : helper)))
    + "</td>\n          <td class=\"cadd\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"cadd_phred_class") || (depth0 != null ? lookupProperty(depth0,"cadd_phred_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"cadd_phred_class","hash":{},"data":data,"loc":{"start":{"line":42,"column":29},"end":{"line":42,"column":49}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"cadd_phred") || (depth0 != null ? lookupProperty(depth0,"cadd_phred") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"cadd_phred","hash":{},"data":data,"loc":{"start":{"line":43,"column":13},"end":{"line":43,"column":27}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"alphamissense\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense_class") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense_class","hash":{},"data":data,"loc":{"start":{"line":48,"column":29},"end":{"line":48,"column":53}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense") || (depth0 != null ? lookupProperty(depth0,"alpha_missense") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense","hash":{},"data":data,"loc":{"start":{"line":49,"column":13},"end":{"line":49,"column":31}}}) : helper)))
    + "</span>\n            <span class=\"alphamissense-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"alpha_missense_label") || (depth0 != null ? lookupProperty(depth0,"alpha_missense_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"alpha_missense_label","hash":{},"data":data,"loc":{"start":{"line":50,"column":46},"end":{"line":50,"column":70}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"sift\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"sift_class") || (depth0 != null ? lookupProperty(depth0,"sift_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift_class","hash":{},"data":data,"loc":{"start":{"line":55,"column":29},"end":{"line":55,"column":43}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"sift") || (depth0 != null ? lookupProperty(depth0,"sift") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift","hash":{},"data":data,"loc":{"start":{"line":56,"column":13},"end":{"line":56,"column":21}}}) : helper)))
    + "</span>\n            <span class=\"sift-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"sift_label") || (depth0 != null ? lookupProperty(depth0,"sift_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sift_label","hash":{},"data":data,"loc":{"start":{"line":57,"column":37},"end":{"line":57,"column":51}}}) : helper)))
    + "</span>\n          </td>\n          <td class=\"polyphen\">\n            <span\n              class=\"variant-function\"\n              data-function=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen_class") || (depth0 != null ? lookupProperty(depth0,"polyphen_class") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen_class","hash":{},"data":data,"loc":{"start":{"line":62,"column":29},"end":{"line":62,"column":47}}}) : helper)))
    + "\"\n            >"
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen") || (depth0 != null ? lookupProperty(depth0,"polyphen") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen","hash":{},"data":data,"loc":{"start":{"line":63,"column":13},"end":{"line":63,"column":25}}}) : helper)))
    + "</span>\n            <span class=\"polyphen-label\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"polyphen_label") || (depth0 != null ? lookupProperty(depth0,"polyphen_label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"polyphen_label","hash":{},"data":data,"loc":{"start":{"line":64,"column":41},"end":{"line":64,"column":59}}}) : helper)))
    + "</span>\n          </td>\n        </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <a href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"url") : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? lookupProperty(depth0,"transcript") : depth0)) != null ? lookupProperty(stack1,"label") : stack1), depth0))
    + "</a>\n";
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
    return "                <li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>\n";
},"6":function(container,depth0,helpers,partials,data) {
    return "        <tr>\n          <td colspan=\"9\" class=\"text-center\">No data</td>\n        </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":74,"column":9}}})) != null ? stack1 : "");
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-transcript.js.map
