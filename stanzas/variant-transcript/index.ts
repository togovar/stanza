import Stanza from "togostanza/stanza";

import { alphaMissense, polyphen, sift } from "@/lib/display";
import type { NumericInput } from "@/lib/frequency";

// ============================================================
// 型定義
// ============================================================

/** stanza が受け取る入力パラメータ。sparqlist は省略可能でデフォルトURLにフォールバックする。 */
interface StanzaInputParams {
  sparqlist?: string;
  tgv_id?: string;
}

/** SPARQList JSON レスポンスの各セルが持つ値ラッパー形式。 */
interface SparqlCellValue {
  value?: string;
}

/**
 * SPARQList が返す SPARQL JSON フォーマット全体。
 * 実データは `results.bindings` 配列に入る。
 */
interface SparqlJsonResponse {
  results?: {
    bindings?: Array<Record<string, SparqlCellValue>>;
  };
}

/**
 * SPARQL バインディングをそのまま表すローデータ型。
 * URI形式・カンマ区切り文字列・数値スコアが混在しており、表示前に個別変換が必要。
 */
interface TranscriptSparqlBinding {
  /** EnsemblトランスクリプトのURI（末尾パスセグメントがIDになる） */
  transcript?: string;
  /** EnsemblトランスクリプトID。リンクURL生成に使う。transcript URIとは別フィールド。 */
  enst_id?: string;
  gene_xref?: string;
  gene_symbol?: string;
  /** 複数ある場合はカンマ区切りの単一文字列で返ってくる */
  consequence_label?: string;
  hgvs_c?: string;
  hgvs_p?: string;
  alpha_missense?: NumericInput;
  sift?: NumericInput;
  polyphen?: NumericInput;
}

/** テンプレートが直接描画できるトランスクリプトのリンク情報。 */
interface EnsemblTranscriptLink {
  /** URIから取り出したIDラベル文字列 */
  label: string;
  /** enst_id がない場合はリンクなし（null） */
  url: string | null;
}

/**
 * Handlebars テンプレートへ渡す1行分の表示データ。
 * SPARQL バインディングから型が変わるフィールドは Omit して上書き定義している。
 * スコア系はスコア文字列・CSSクラス・日本語ラベルに展開済み。
 */
interface TranscriptDisplayRow
  extends Omit<
    TranscriptSparqlBinding,
    "transcript" | "consequence_label" | "alpha_missense" | "sift" | "polyphen"
  > {
  /** URIではなくラベルとリンクURLに変換済み */
  transcript: EnsemblTranscriptLink;
  /** カンマ区切り文字列から配列に変換済み（{{#each}} で扱いやすくするため） */
  consequence_label: string[];
  alpha_missense?: string;
  alpha_missense_class?: string;
  alpha_missense_label?: string;
  sift?: string;
  sift_class?: string;
  sift_label?: string;
  polyphen?: string;
  polyphen_class?: string;
  polyphen_label?: string;
}

/** renderTemplate に渡すパラメータ全体。エラー時は result を持たない。 */
interface TemplateRenderParams {
  params: StanzaInputParams;
  result?: TranscriptDisplayRow[];
  error?: {
    message: string;
  };
}

// ============================================================
// 定数
// ============================================================

/** stanza パラメータに sparqlist が指定されていない場合のデフォルトベースURL。 */
const DEFAULT_SPARQLIST_BASE_URL = "/sparqlist";

/**
 * Ensembl Identifiers.org の URI プレフィックス。
 * `enst_id` と連結してトランスクリプトのリンクURLを生成する。
 */
const ENSEMBL_IDENTIFIER_BASE_URL = "http://identifiers.org/ensembl/";

/** TogoVar 標準フォント。stanza 初期化時に一度だけロード開始する。 */
const ROBOTO_CONDENSED_CSS_URL =
  "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900";

// ============================================================
// URL 組み立て / API 取得
// ============================================================

/**
 * SPARQList の variant_transcript エンドポイント URL を組み立てる。
 * URLSearchParams でクエリをエスケープすることで、tgv_id に特殊文字が入っても安全。
 */
const buildSparqlistApiUrl = ({
  sparqlist,
  tgv_id,
}: StanzaInputParams): string => {
  const baseUrl = sparqlist || DEFAULT_SPARQLIST_BASE_URL;
  const queryString = new URLSearchParams({
    tgv_id: String(tgv_id ?? ""),
  }).toString();

  return `${baseUrl}/api/variant_transcript?${queryString}`;
};

/**
 * SPARQL JSON の `{ value: "..." }` ラッパーを剥がし、
 * フィールド名→値の単純なオブジェクト配列へ正規化する。
 * アプリコードとテンプレートがラッパー構造を意識しなくて済むようにここで吸収する。
 */
const normalizeSparqlBindings = (
  response: SparqlJsonResponse,
): TranscriptSparqlBinding[] => {
  const bindings = response.results?.bindings ?? [];

  return bindings.map((binding) => {
    const unwrapped = Object.fromEntries(
      Object.entries(binding).map(([key, cell]) => [key, cell.value]),
    );

    return unwrapped as TranscriptSparqlBinding;
  });
};

/**
 * SPARQList からトランスクリプトデータを取得してバインディング配列を返す。
 * HTTP エラーは Error を throw し、呼び出し元の render() でまとめてハンドリングする。
 * fetch をここに分離することで、render() 本体にエラー分岐を持ち込まずに済む。
 */
const fetchTranscriptDataFromApi = async (
  apiUrl: string,
): Promise<TranscriptSparqlBinding[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const sparqlResponse = (await response.json()) as SparqlJsonResponse;
  return normalizeSparqlBindings(sparqlResponse);
};

// ============================================================
// データ変換（バインディング → 表示行）
// ============================================================

/**
 * URI形式の transcript フィールドと enst_id から、テンプレートが使えるリンク情報を組み立てる。
 * URI の末尾パスセグメントをラベルとして使い、enst_id がない場合は url を null にする。
 */
const createEnsemblTranscriptLink = (
  binding: TranscriptSparqlBinding,
): EnsemblTranscriptLink => {
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
 * - AlphaMissense / SIFT / PolyPhen 生スコア → 表示文字列 + CSS クラス + ラベル
 *
 * スコアの分類ロジックは lib/display に集約されているため、ここでは変換の順番と
 * Object.assign によるフィールド合成だけを担う。
 */
const convertBindingToDisplayRow = (
  binding: TranscriptSparqlBinding,
): TranscriptDisplayRow => {
  // テンプレート向けに型が変わるフィールドを分離し、残りはそのまま引き継ぐ
  const {
    transcript: _transcriptUri,
    consequence_label: rawConsequenceLabel,
    alpha_missense: alphaMissenseScore,
    sift: siftScore,
    polyphen: polyphenScore,
    ...sharedFields
  } = binding;

  const displayRow: TranscriptDisplayRow = {
    ...sharedFields,
    transcript: createEnsemblTranscriptLink(binding),
    consequence_label: rawConsequenceLabel
      ? rawConsequenceLabel.split(",")
      : [],
  };

  // lib/display の共通関数でスコアを「表示値・CSS クラス・ラベル」の3フィールドへ展開する
  Object.assign(displayRow, alphaMissense(alphaMissenseScore));
  Object.assign(displayRow, sift(siftScore));
  Object.assign(displayRow, polyphen(polyphenScore));

  return displayRow;
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantTranscript extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   * 「URL組み立て → データ取得 → 変換 → テンプレート描画」の流れだけが見えるよう保ち、
   * 各処理の詳細は上位の関数へ委譲する。エラーはここで一括補足してテンプレートへ渡す。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as StanzaInputParams;
    const apiUrl = buildSparqlistApiUrl(params);

    // 初期状態は params のみ。取得成功時に result、失敗時に error を追加する
    const templateParams: TemplateRenderParams = { params };

    try {
      const sparqlBindings = await fetchTranscriptDataFromApi(apiUrl);
      templateParams.result = sparqlBindings.map(convertBindingToDisplayRow);
    } catch (error) {
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
