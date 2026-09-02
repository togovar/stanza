import Stanza from "togostanza/stanza";

import { alphaMissense, caddPhred, polyphen, sift } from "@/lib/display";
import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import { buildSparqlistApiUrl, fetchSparqlBindings } from "@/lib/sparqlist";
import type { NumericInput } from "@/lib/frequency";
import type {
  SparqlistStanzaParams,
  SparqlistTemplateRenderParams,
} from "@/lib/types";

// ============================================================
// 型定義
// ============================================================

/**
 * SPARQL バインディングをそのまま表すローデータ型。
 * URI形式・カンマ区切り文字列・数値スコアが混在しており、表示前に個別変換が必要。
 */
interface TranscriptSparqlBinding {
  /** EnsemblトランスクリプトのURI（末尾パスセグメントがIDになる） */
  transcript?: string;
  /** EnsemblトランスクリプトID。リンクURL生成に使う。transcript URIとは別フィールド。 */
  enst_id?: string;
  /** VEP由来の MANE 情報。例: "MANE_Select" または ["MANE_Select"] */
  mane?: string | string[];
  /** MANE Select のRefSeq transcript ID。例: "NM_001005484.2" */
  mane_select?: string;
  gene_xref?: string;
  gene_symbol?: string;
  /** 複数ある場合はカンマ区切りの単一文字列で返ってくる */
  consequence_label?: string;
  hgvs_c?: string;
  hgvs_p?: string;
  cadd_phred?: NumericInput;
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
    | "transcript"
    | "consequence_label"
    | "cadd_phred"
    | "alpha_missense"
    | "sift"
    | "polyphen"
  > {
  /** URIではなくラベルとリンクURLに変換済み */
  transcript: EnsemblTranscriptLink;
  /** MANE Select transcript の場合にバッジを表示する */
  is_mane_select: boolean;
  mane_url: string;
  /** カンマ区切り文字列から配列に変換済み（{{#each}} で扱いやすくするため） */
  consequence_label: string[];
  cadd_phred?: string;
  cadd_phred_class?: string;
  cadd_phred_label?: string;
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
type TemplateRenderParams = SparqlistTemplateRenderParams<
  TranscriptDisplayRow[]
>;

interface VariantTranscriptParams extends SparqlistStanzaParams {
  assembly?: string;
}

// ============================================================
// 定数
// ============================================================

/**
 * Ensembl Identifiers.org の URI プレフィックス。
 * `enst_id` と連結してトランスクリプトのリンクURLを生成する。
 */
const ENSEMBL_IDENTIFIER_BASE_URL = "http://identifiers.org/ensembl/";
const MANE_URL = "https://www.ncbi.nlm.nih.gov/refseq/MANE/";

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

const isGrch38 = ({ assembly, sparqlist }: VariantTranscriptParams): boolean =>
  /^grch38$/i.test(String(assembly ?? "")) || /grch38/i.test(sparqlist ?? "");

const includesManeSelect = (mane: string | string[] | undefined): boolean =>
  Array.isArray(mane)
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
const isManeSelectTranscript = (
  binding: TranscriptSparqlBinding,
  params: VariantTranscriptParams,
): boolean => {
  if (!isGrch38(params)) {
    return false;
  }

  return includesManeSelect(binding.mane);
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
const convertBindingToDisplayRow = (
  binding: TranscriptSparqlBinding,
  params: VariantTranscriptParams,
): TranscriptDisplayRow => {
  // テンプレート向けに型が変わるフィールドを分離し、残りはそのまま引き継ぐ
  const {
    transcript: _transcriptUri,
    consequence_label: rawConsequenceLabel,
    cadd_phred: caddPhredScore,
    alpha_missense: alphaMissenseScore,
    sift: siftScore,
    polyphen: polyphenScore,
    ...sharedFields
  } = binding;

  const transcript = createEnsemblTranscriptLink(binding);
  const displayRow: TranscriptDisplayRow = {
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

export default class VariantTranscript extends Stanza {
  /**
   * Togostanza フレームワークが描画ごとに呼び出すエントリーポイント。
   * 「URL組み立て → データ取得 → 変換 → テンプレート描画」の流れだけが見えるよう保ち、
   * 各処理の詳細は上位の関数へ委譲する。エラーはここで一括補足してテンプレートへ渡す。
   */
  async render(): Promise<void> {
    // フォントは描画前に非同期ロード開始しておく（ロード完了を待たず続行する）
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as VariantTranscriptParams;

    // 初期状態は params のみ。取得成功時に result、失敗時に error を追加する
    const templateParams: TemplateRenderParams = { params };

    try {
      const apiUrl = buildSparqlistApiUrl("variant_transcript", params);
      const sparqlBindings =
        await fetchSparqlBindings<TranscriptSparqlBinding>(apiUrl);
      templateParams.result = sparqlBindings.map((binding) =>
        convertBindingToDisplayRow(binding, params),
      );
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
