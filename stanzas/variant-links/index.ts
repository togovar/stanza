import Stanza from "togostanza/stanza";

import { ROBOTO_CONDENSED_CSS_URL } from "@/lib/constants";
import { buildSparqlistApiUrl } from "@/lib/sparqlist";
import type { SparqlistStanzaParams } from "@/lib/types";

// ============================================================
// 型定義
// ============================================================

/** 1つの外部データベースへのリンク。url が無い場合はテンプレート側で "N/A" と表示する。 */
interface LinkSource {
  /** データベース表示名（例: "ClinVar"） */
  name: string;
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

interface VariantLinksParams extends SparqlistStanzaParams {
  /** chr-pos-ref-alt形式のバリアント表記。variant_links API が対応している場合に渡す。 */
  variant?: string;
}

interface VariantLinkRawEntry {
  category?: string;
  source?: string;
  title?: string | null;
  id?: string | null;
  url?: string | null;
  available?: boolean;
}

const CATEGORY_LAYOUT = [
  ["Clinical significance", "Cross species"],
  ["Frequency", "Haplotype"],
  ["Splicing variant"],
];

const CATEGORY_ANCHORS: Record<string, string> = {
  "Clinical significance": "#clinical-significance-mgend",
  Frequency: "#frequency",
};

const buildVariantLinksApiUrl = (params: VariantLinksParams): string => {
  if (!params.tgv_id && !params.variant) {
    throw new Error("Either tgv_id or variant parameter is required");
  }

  return buildSparqlistApiUrl("variant_links", params, {
    variant: params.variant,
  });
};

const fetchVariantLinks = async (
  apiUrl: string,
): Promise<VariantLinkRawEntry[]> => {
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${apiUrl} returns status ${response.status}`);
  }

  const json: unknown = await response.json();
  if (!Array.isArray(json)) {
    throw new Error("variant_links response must be an array");
  }

  return json as VariantLinkRawEntry[];
};

const buildLinkSource = (entry: VariantLinkRawEntry): LinkSource => ({
  name: entry.source ?? "",
  value: entry.title ?? entry.id ?? undefined,
  url: entry.url ?? undefined,
  available: entry.available === true,
});

const buildLinkCategory = (
  category: string,
  entriesByCategory: Map<string, VariantLinkRawEntry[]>,
): LinkCategory | undefined => {
  const entries = entriesByCategory.get(category);
  if (!entries) return undefined;

  return {
    label: category,
    anchor: CATEGORY_ANCHORS[category],
    sources: entries.map(buildLinkSource),
  };
};

const buildLinkCategoryRows = (
  entries: VariantLinkRawEntry[],
): LinkCategoryRow[] => {
  const entriesByCategory = entries.reduce<Map<string, VariantLinkRawEntry[]>>(
    (accumulator, entry) => {
      if (!entry.category) return accumulator;
      const categoryEntries = accumulator.get(entry.category) ?? [];
      categoryEntries.push(entry);
      accumulator.set(entry.category, categoryEntries);
      return accumulator;
    },
    new Map(),
  );

  return CATEGORY_LAYOUT.flatMap(([leftCategory, rightCategory]) => {
    const left = buildLinkCategory(leftCategory, entriesByCategory);
    if (!left) return [];

    const right = rightCategory
      ? buildLinkCategory(rightCategory, entriesByCategory)
      : undefined;

    return [{ left, right }];
  });
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

    const templateParams: TemplateRenderParams = {
      params,
    };

    try {
      const apiUrl = buildVariantLinksApiUrl(params);
      const rawEntries = await fetchVariantLinks(apiUrl);
      templateParams.result = buildLinkCategoryRows(rawEntries);
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
