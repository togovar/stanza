// ============================================================
// TogoVar API 共通型定義
// variant-mgend / disease-mgend / gene-mgend 等で共有する
// ============================================================

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
}

/** バリアントごとのデータ（有意性情報と外部リンクを含む） */
export interface VariantData {
  id: string;
  significance: SignificanceEntry[];
  external_links: ExternalLinks;
}

/** TogoVar API レスポンスのトップレベル構造 */
export interface TogoVarApiResponse {
  data: VariantData[];
}
