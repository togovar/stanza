import Stanza from "togostanza/stanza";

import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import { describeVariantIdentifier } from "@/lib/sparqlist";
import type { ExternalLink, TogoVarApiResponse, VariantData } from "@/lib/types";
import { normalizeChromosome, parseVariantParam } from "@/lib/variant";
import type { ParsedVariant } from "@/lib/variant";

// ============================================================
// 型定義
// ============================================================

/** 1つの外部データベースへのリンク。url が無い場合はテンプレート側で "N/A" と表示する。 */
interface LinkSource {
  /** データベース表示名（例: "ClinVar"） */
  name: string;
  /** variant-frequency と同じ dataset icon を表示する場合に使う dataset ID。 */
  dataset?: string;
  /** 表示値（例: "12-111803962-G-A"）。URLが無い場合はプレーンテキストで表示する。 */
  value?: string;
  url?: string;
  /** リンク先URLが無くてもデータが存在する場合は true。 */
  available: boolean;
}

/** 表の1セル分（Clinical significance, Frequency など1カテゴリ分）。 */
interface LinkCategory {
  label: string;
  /**
   * ページ内アンカーへのリンク(例: "#clinical-significance")。
   * 同じページに埋め込まれた他のstanza(variant-clinvarなど)の表示位置へジャンプする用途。
   * 無い場合はテンプレート側でリンクなしのラベルとして表示する。
   */
  anchor?: string;
  sources: LinkSource[];
}

/** 表の1行。right が無い場合は右側2カラムを空セルにする(例: Splicing variantの行)。 */
interface LinkCategoryRow {
  left: LinkCategory;
  right?: LinkCategory;
}

/** renderTemplate に渡すパラメータ全体。エラー時は result を持たない。 */
interface TemplateRenderParams {
  params: VariantLinksParams;
  result?: LinkCategoryRow[];
  error?: {
    message: string;
  };
}

interface VariantLinksParams {
  tgv_id?: string;
  variant?: string;
  "data-url"?: string;
  sparqlist?: string;
  mogplus_ver?: string;
}

type ExternalLinkKey =
  | "clinvar"
  | "mgend"
  | "dbsnp"
  | "gnomad"
  | "tommo"
  | "jogo"
  | "sscv_db";

type VariantExternalLinks = Partial<Record<ExternalLinkKey, ExternalLink[]>>;

interface MogplusEntry {
  target?: string;
  chr?: string;
  pos?: number;
  ref?: string;
  alt?: string;
  strains?: string[];
}

const DEFAULT_MOGPLUS_VERSION = "mogplus21";
const DEFAULT_MOGPLUS_SOURCE = "GRCh38";
const MOGPLUS_BASE_URL = "https://molossinus.brc.riken.jp";

const CATEGORY_LAYOUT = [
  ["Clinical significance", "Cross species"],
  ["Frequency", "Splicing variant"],
] as const;

const CATEGORY_ANCHORS: Record<string, string> = {
  "Clinical significance": "#clinical-significance-mgend",
  "Cross species": "#cross-species",
  Frequency: "#frequency",
};

const postVariantQuery = async (
  dataUrl: string,
  query: Record<string, unknown>,
): Promise<TogoVarApiResponse> => {
  const response = await fetch(dataUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`${dataUrl} returned status ${response.status}`);
  }

  return response.json() as Promise<TogoVarApiResponse>;
};

const fetchVariantDataById = (
  dataUrl: string,
  tgvId: string,
): Promise<TogoVarApiResponse> => postVariantQuery(dataUrl, { id: [tgvId] });

/**
 * tgv_id を持たないバリアント（TogoVar未登録）を variant(CHROM-POS-REF-ALT) で解決する。
 * TogoVar検索APIは variant 表記そのものでの検索に対応していないため、
 * jogo-haplotype-explorer と同じ location(chromosome/position) クエリで候補を取得し、
 * reference/alternate が一致するものを呼び出し側で絞り込む。
 */
const fetchVariantDataByLocation = (
  dataUrl: string,
  parsedVariant: ParsedVariant,
): Promise<TogoVarApiResponse> =>
  postVariantQuery(dataUrl, {
    location: {
      chromosome: normalizeChromosome(parsedVariant.chromosome),
      position: Number(parsedVariant.position),
    },
  });

const buildSourceFromExternalLink = (
  name: string,
  link: ExternalLink | undefined,
  dataset?: string,
): LinkSource => ({
  name,
  dataset,
  value: link?.title,
  url: link?.xref,
  available: Boolean(link),
});

const firstExternalLink = (
  externalLinks: VariantExternalLinks,
  key: ExternalLinkKey,
): ExternalLink | undefined => {
  return externalLinks[key]?.[0];
};

/**
 * tgv_id 指定時は検索結果の先頭を採用する(id指定なので1件のはず)。
 * variant 指定時は location クエリで同一位置の候補が複数返り得るため、
 * reference/alternate が入力と一致するものを探す(multi-allelicサイト対策)。
 */
const requireVariantData = (
  apiResponse: TogoVarApiResponse,
  tgvId: string | undefined,
  parsedVariant: ParsedVariant | undefined,
  identifier: string,
): VariantData => {
  const variantData = tgvId
    ? apiResponse.data[0]
    : apiResponse.data.find(
        (data) =>
          parsedVariant !== undefined &&
          normalizeChromosome(data.chromosome) ===
            normalizeChromosome(parsedVariant.chromosome) &&
          String(data.position) === parsedVariant.position &&
          data.reference === parsedVariant.reference &&
          data.alternate === parsedVariant.alternate,
      );

  if (!variantData) {
    throw new Error(`Variant not found for ${identifier}`);
  }

  return variantData;
};

const normalizeMogplusEntry = (json: unknown): MogplusEntry | undefined => {
  if (Array.isArray(json)) {
    return json[0] as MogplusEntry | undefined;
  }
  if (typeof json !== "object" || json === null) {
    return undefined;
  }

  const response = json as { data?: unknown[]; error?: unknown; target?: string };
  if (response.error) {
    return undefined;
  }
  if (Array.isArray(response.data)) {
    return response.data[0] as MogplusEntry | undefined;
  }
  if (response.target) {
    return response as MogplusEntry;
  }

  return undefined;
};

const buildMogplusApiUrl = (
  sparqlist: string,
  variant: VariantData,
  mogplusVersion: string,
): string => {
  const params = new URLSearchParams({
    source: DEFAULT_MOGPLUS_SOURCE,
    chr: variant.chromosome,
    pos: String(variant.position),
    ref: variant.reference,
    alt: variant.alternate,
    mogplus_ver: mogplusVersion,
  });

  return `${sparqlist.replace(/\/+$/, "")}/api/variant_mogplus?${params.toString()}`;
};

const buildMogplusSourceUrl = (
  entry: MogplusEntry,
  mogplusVersion: string,
): string | undefined => {
  if (!entry.chr || !entry.pos) {
    return undefined;
  }

  const strains = Array.isArray(entry.strains) ? entry.strains : [];
  const strainParams = ["refGenome"].concat(
    strains.map((strain) => strain.replace(/\//g, "_")),
  );
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

const buildMogplusSource = (
  entry: MogplusEntry | undefined,
  mogplusVersion: string,
): LinkSource => ({
  name: "MoG+ (Mouse)",
  value:
    entry?.chr && entry.pos && entry.ref && entry.alt
      ? `${entry.chr}-${entry.pos}-${entry.ref}-${entry.alt}`
      : undefined,
  url: entry ? buildMogplusSourceUrl(entry, mogplusVersion) : undefined,
  available: Boolean(entry),
});

const fetchMogplusEntry = async (
  sparqlist: string | undefined,
  variant: VariantData | undefined,
  mogplusVersion: string,
): Promise<MogplusEntry | undefined> => {
  if (!sparqlist || !variant) {
    return undefined;
  }

  try {
    const apiUrl = buildMogplusApiUrl(sparqlist, variant, mogplusVersion);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`${apiUrl} returned status ${response.status}`);
    }

    return normalizeMogplusEntry(await response.json());
  } catch (error) {
    // MoG+ は補助リンクなので、取得失敗時も他DBリンクの表示は継続する。
    console.warn(error);
    return undefined;
  }
};

const buildLinkCategoryRows = (
  variantData: VariantData,
  mogplusEntry: MogplusEntry | undefined,
  mogplusVersion: string,
): LinkCategoryRow[] => {
  const externalLinks = (variantData.external_links ??
    {}) as VariantExternalLinks;

  const categories = new Map<string, LinkCategory>([
    [
      "Clinical significance",
      {
        label: "Clinical significance",
        anchor: CATEGORY_ANCHORS["Clinical significance"],
        sources: [
          buildSourceFromExternalLink(
            "ClinVar",
            firstExternalLink(externalLinks, "clinvar"),
          ),
          buildSourceFromExternalLink(
            "MGeND",
            firstExternalLink(externalLinks, "mgend"),
          ),
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
        sources: [
          buildSourceFromExternalLink(
            "dbSNP",
            firstExternalLink(externalLinks, "dbsnp"),
          ),
          buildSourceFromExternalLink(
            "ToMMo",
            firstExternalLink(externalLinks, "tommo"),
            "tommo",
          ),
          buildSourceFromExternalLink(
            "JoGo",
            firstExternalLink(externalLinks, "jogo"),
            "jogo",
          ),
          buildSourceFromExternalLink(
            "gnomAD",
            firstExternalLink(externalLinks, "gnomad"),
            "gnomad",
          ),
        ],
      },
    ],
    [
      "Splicing variant",
      {
        label: "Splicing variant",
        sources: [
          buildSourceFromExternalLink(
            "SSCVDB",
            firstExternalLink(externalLinks, "sscv_db"),
          ),
        ],
      },
    ],
  ]);

  return CATEGORY_LAYOUT.map(([leftCategory, rightCategory]) => ({
    left: categories.get(leftCategory) as LinkCategory,
    right: rightCategory ? categories.get(rightCategory) : undefined,
  }));
};

// ============================================================
// Stanza クラス
// ============================================================

export default class VariantLinks extends Stanza {
  /** 再描画のたびに張り直すクリックリスナーを、disconnect時にまとめて解除するために保持する。 */
  private cleanupAnchorLinks: (() => void)[] = [];

  disconnectedCallback() {
    this.cleanupAnchorLinks.forEach((cleanup) => cleanup());
    this.cleanupAnchorLinks = [];
  }

  async render(): Promise<void> {
    this.importWebFontCSS(ROBOTO_CONDENSED_CSS_URL);

    const params = this.params as VariantLinksParams;
    const dataUrl = params["data-url"];
    const tgvId = params.tgv_id;
    const parsedVariant = parseVariantParam(params.variant);

    const templateParams: TemplateRenderParams = {
      params,
    };

    try {
      if (!dataUrl) {
        throw new Error("data-url parameter is required");
      }
      if (!tgvId && !parsedVariant) {
        throw new Error("tgv_id or variant parameter is required");
      }

      const apiResponse = tgvId
        ? await fetchVariantDataById(dataUrl, tgvId)
        : await fetchVariantDataByLocation(
            dataUrl,
            parsedVariant as ParsedVariant,
          );
      const variantData = requireVariantData(
        apiResponse,
        tgvId,
        parsedVariant,
        describeVariantIdentifier(params),
      );
      const mogplusVersion = params.mogplus_ver ?? DEFAULT_MOGPLUS_VERSION;
      const mogplusEntry = await fetchMogplusEntry(
        params.sparqlist,
        variantData,
        mogplusVersion,
      );
      templateParams.result = buildLinkCategoryRows(
        variantData,
        mogplusEntry,
        mogplusVersion,
      );
    } catch (reason) {
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
  private setupAnchorScrolling() {
    this.cleanupAnchorLinks.forEach((cleanup) => cleanup());
    this.cleanupAnchorLinks = [];

    this.root
      .querySelectorAll<HTMLAnchorElement>(".category-link")
      .forEach((link) => {
        const handleClick = (event: MouseEvent) => {
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
        this.cleanupAnchorLinks.push(() =>
          link.removeEventListener("click", handleClick),
        );
      });
  }
}
