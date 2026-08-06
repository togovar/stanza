import Stanza from "togostanza/stanza";

import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import type { ExternalLink, TogoVarApiResponse } from "@/lib/types";

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
  "data-url"?: string;
}

type ExternalLinkKey =
  | "clinvar"
  | "mgend"
  | "dbsnp"
  | "gnomad"
  | "tommo"
  | "jogo"
  | "sscv_db"
  | "mog";

type VariantExternalLinks = Partial<Record<ExternalLinkKey, ExternalLink[]>>;

const CATEGORY_LAYOUT = [
  ["Clinical significance", "Cross species"],
  ["Frequency", "Splicing variant"],
] as const;

const CATEGORY_ANCHORS: Record<string, string> = {
  "Clinical significance": "#clinical-significance-mgend",
  Frequency: "#frequency",
};

const fetchVariantLinks = async (
  dataUrl: string,
  tgvId: string,
): Promise<TogoVarApiResponse> => {
  const response = await fetch(dataUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { id: [tgvId] } }),
  });

  if (!response.ok) {
    throw new Error(`${dataUrl} returned status ${response.status}`);
  }

  return response.json() as Promise<TogoVarApiResponse>;
};

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

const buildLinkCategoryRows = (
  apiResponse: TogoVarApiResponse,
): LinkCategoryRow[] => {
  const externalLinks = (apiResponse.data[0]?.external_links ??
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
        sources: [
          buildSourceFromExternalLink(
            "MoG+ (Mouse)",
            firstExternalLink(externalLinks, "mog"),
          ),
        ],
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

    const templateParams: TemplateRenderParams = {
      params,
    };

    try {
      if (!dataUrl) {
        throw new Error("data-url parameter is required");
      }
      if (!tgvId) {
        throw new Error("tgv_id parameter is required");
      }

      const apiResponse = await fetchVariantLinks(dataUrl, tgvId);
      templateParams.result = buildLinkCategoryRows(apiResponse);
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
