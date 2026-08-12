// ============================================================
// TogoVar API 共通型定義
// variant-mgend / disease-mgend / gene-mgend 等で共有する
// ============================================================

/**
 * SPARQList を叩く stanza が共通して受け取る入力パラメータ。
 * tgv_id を持たないバリアント（TogoVar未登録のバリアント）を表示するため、
 * tgv_id の代わりに VCF表記(CHROM-POS-REF-ALT)の variant でも解決できる。
 * どちらかが必須で、両方指定された場合は tgv_id を優先する（sparqlist側の解決ロジックと合わせる）。
 */
export interface SparqlistStanzaParams {
  sparqlist?: string;
  tgv_id?: string;
  variant?: string;
}

/** SPARQList を叩く stanza が renderTemplate へ渡す共通パラメータ形。エラー時は result を持たない。 */
export interface SparqlistTemplateRenderParams<TResult> {
  params: SparqlistStanzaParams;
  result?: TResult;
  error?: {
    message: string;
  };
}

/** 疾患条件（MedGenコードと疾患名） */
export interface DiseaseCondition {
  name?: string;
  medgen?: string;
}

/** 臨床有意性エントリ（ソース・疾患条件・解釈を含む） */
export interface SignificanceEntry {
  source: string;
  conditions: DiseaseCondition[];
  interpretations: string[];
  submission_count?: number;
}

/** 外部リンク情報（タイトルとURL） */
export interface ExternalLink {
  title: string;
  xref: string;
}

/** バリアントの外部リンク一覧 */
export interface ExternalLinks {
  mgend?: ExternalLink[];
  clinvar?: ExternalLink[];
  dbsnp?: ExternalLink[];
  gnomad?: ExternalLink[];
  tommo?: ExternalLink[];
  jogo?: ExternalLink[];
  sscv_db?: ExternalLink[];
}

/** バリアントごとのデータ（有意性情報と外部リンクを含む） */
export interface VariantData {
  id: string;
  chromosome: string;
  position: number;
  reference: string;
  alternate: string;
  significance: SignificanceEntry[];
  // 実際のTogoVar variant APIレスポンス（variant-mgendが叩くエンドポイント）で
  // 動作確認済みのフィールド名。gene-mgend/disease-mgend側のJS実装は
  // external_link（単数形）を参照しているが、別エンドポイントのレスポンス形状であり、
  // ここを単数形に変更するとvariant-mgendでリンクが取得できなくなる。
  external_links?: ExternalLinks;
}

/** TogoVar API レスポンスのトップレベル構造 */
export interface TogoVarApiResponse {
  data: VariantData[];
}
