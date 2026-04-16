import Stanza from "togostanza/stanza";
import { hierarchy } from "d3-hierarchy";
import { DATASETS } from "@/lib/constants";
import { buildFrequencyDisplay } from "@/lib/frequency";
import {
  downloadCSVMenuItem,
  downloadJSONMenuItem,
  downloadTSVMenuItem,
} from "togostanza-utils";

// ============================================================
// 型定義
// ============================================================

/** APIから返されるデータセットごとの頻度情報 */
type FrequencyValue = number | string | null;

interface FrequencyData {
  source: string; // データセットID (例: "gem_j_wga")
  ac?: FrequencyValue; // Alt Allele Count
  an?: FrequencyValue; // Total Allele Count
  af?: FrequencyValue; // Allele Frequency
  aac?: FrequencyValue; // Alt/Alt Homozygote Count
  arc?: FrequencyValue; // Alt/Ref Heterozygote Count
  aoc?: FrequencyValue; // Alt/OtherAlts Count (JGA-WGSのみ)
  rrc?: FrequencyValue; // Ref/Ref Homozygote Count
  roc?: FrequencyValue; // Ref/OtherAlts Count (JGA-WGSのみ)
  ooc?: FrequencyValue; // OtherAlts/OtherAlts Count (JGA-WGSのみ)
  hac?: FrequencyValue; // Hemizygote Alt Count (X染色体など)
  hrc?: FrequencyValue; // Hemizygote Ref Count
  hoc?: FrequencyValue; // Hemizygote OtherAlts Count
  filter?: string | string[];
  quality?: string;
  // searchData() で付与するプロパティ
  id?: string;
  depth?: number;
  parent_id?: string;
  grandparent_id?: string;
  dataset?: string;
  label?: string;
  has_child?: boolean;
  need_loading?: boolean;
  // buildFrequencyDisplay() が返すプロパティ (Object.assign でマージ)
  frequency?: string;
  count?: number;
  level?: string;
  has_homozygote_marker?: boolean;
  has_hemizygote_marker?: boolean;
}

/** DATASETSの各ノード（ツリー構造）に ID・depth を付加したもの */
interface DataNode {
  id: string;
  depth: number;
  value: string;
  label: string;
  children?: DataNode[];
}

const isTruthyParam = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return /^(?:1|true|yes|on)$/iu.test(value.trim());
  }

  return false;
};

const isLocalhostHost = (hostname: string): boolean => {
  return hostname === "localhost" || hostname === "127.0.0.1";
};

// ============================================================
// メインクラス
// ============================================================

export default class VariantFrequency extends Stanza {
  /** ダウンロードボタン用に保持するデータ */
  data: FrequencyData[] = [];

  // ============================================================
  // menu() — 右上のダウンロードメニューを構成
  // ============================================================

  menu() {
    if (!this.data || this.data.length === 0) {
      return [];
    }

    return [
      downloadJSONMenuItem(this, "variant-frequency", this.data),
      downloadCSVMenuItem(this, "variant-frequency", this.data),
      downloadTSVMenuItem(this, "variant-frequency", this.data),
    ];
  }

  // ============================================================
  // render() — メイン処理（APIからデータを取得してHTMLに描画）
  // ============================================================

  async render() {
    // フォントの読み込み
    this.importWebFontCSS(
      "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900",
    );
    // データセットアイコン用フォント
    this.importWebFontCSS(
      new URL("./assets/fontello.css", import.meta.url).href,
    );

    // ---- stanzaパラメータの取得 ----
    // data-url: APIのベースURL, assembly: GRCh37/GRCh38, tgv_id: バリアントID
    const {
      "data-url": urlBase,
      assembly,
      tgv_id,
      check_local_auth_status,
    } = this.params;

    // バリアントIDでデータセット情報を展開して取得するAPIエンドポイント
    const searchParams = new URLSearchParams({
      quality: "0",
      term: String(tgv_id),
    });
    searchParams.append("expand_dataset", "");
    const dataURL = `${urlBase}/search?${searchParams.toString()}`;

    // ---- 変数の初期化 ----

    // テーブルに表示する行データを格納する配列
    let resultObject: FrequencyData[] = [];

    // JGA-WGSの未ログイン時に表示するダミー行データ
    let jgawgsData: FrequencyData[] = [];
    let jgawgsChildren: DataNode[] = [];

    // JGA-SNP で見出し行の重複挿入を防ぐための追跡変数
    let currentLayer1: string | undefined;

    // X染色体などでヘミ接合体(Hemizygote) 列を表示するかどうかのフラグ
    let hasHemizygote = false;

    // ノードに振る連番ID
    let uniqueIdCounter = 0;

    // ---- ツリーデータの準備 ----

    // DATASETS定数にID・depthを付与し、d3-hierarchyのツリー構造に変換
    const preparedDatasets = Object.values(
      prepareData().data.children,
    ) as DataNode[];

    // JGA-WGSの子ノード一覧を事前に取得（未ログイン時のダミー表示に使用）
    preparedDatasets.forEach((dataset) => {
      if (dataset.value === "jga_wgs") {
        jgawgsChildren = dataset.children ?? [];
      }
    });

    // ---- ログイン状態の確認 ----
    // JGA-WGSの詳細データ（個別集団）はログイン時のみ表示される
    let isLogin = false;
    const shouldCheckLocalAuth = isTruthyParam(check_local_auth_status);
    const shouldFetchAuthStatus =
      !isLocalhostHost(window.location.hostname) || shouldCheckLocalAuth;

    try {
      if (shouldFetchAuthStatus) {
        // 10秒タイムアウト付きでログイン状態を確認
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 10000),
        );
        const fetchPromise = fetch(`${window.location.origin}/auth/status`);
        const response = await Promise.race([fetchPromise, timeout]);

        if (response.status === 401 || response.status === 403) {
          isLogin = false;
        } else if (response.status === 200) {
          isLogin = true;
        }
      }
    } catch (error) {
      console.error("Error fetching auth status or timeout occurred:", error);
    }

    // ---- 頻度データの取得と処理 ----

    try {
      const response = await fetch(dataURL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`${dataURL} returns status ${response.status}`);
      }

      const responseDatasets = await response.json();
      // APIレスポンスからバリアントの頻度データ配列を取り出す
      const frequenciesDatasets: FrequencyData[] | undefined =
        responseDatasets.data[0]?.frequencies;

      // ----------------------------------------------------------
      // searchData() — ツリー構造を再帰的に走査して行データを構築
      // ----------------------------------------------------------
      const searchData = (datum: DataNode) => {
        // APIレスポンスから現在のノードに対応する頻度データを探す
        const frequencyData = frequenciesDatasets?.find(
          (x) => x.source === datum.value,
        );

        if (frequencyData) {
          // ツリー上の位置情報を付与
          frequencyData.id = datum.id;
          frequencyData.depth = datum.depth;
          if (datum.depth > 0) {
            frequencyData.parent_id = findParent(
              preparedDatasets,
              datum.id,
            )?.id;
          }
          if (datum.depth > 1) {
            frequencyData.grandparent_id = findParent(
              preparedDatasets,
              findParent(preparedDatasets, datum.id)!.id,
            )?.id;
          }

          // ---- データセット名の設定 ----
          // ToMMoはアセンブリに応じて表示名が変わる
          if (datum.value === "tommo") {
            switch (assembly) {
              case "GRCh37":
                frequencyData.dataset = "ToMMo 8.3KJPN";
                break;
              case "GRCh38":
                frequencyData.dataset = "ToMMo 54KJPN";
                break;
            }
          } else {
            // その他はトップレベルの親ノードのラベルをデータセット名にする
            frequencyData.dataset = findTopParent(
              preparedDatasets,
              datum.id,
            )?.label;
          }

          // ---- 集団ラベルの設定 ----
          if (["gem_j_wga", "jga_wes", "tommo", "hgvd"].includes(datum.value)) {
            // 日本人単一集団データセット
            frequencyData.label = "Japanese";
          } else if (
            [
              "jga_wgs",
              "jga_snp",
              "ncbn",
              "gnomad_genomes",
              "gnomad_exomes",
            ].includes(datum.value)
          ) {
            // 複数集団を合計したデータ
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // ============================================================
          // アレル頻度メーターの目盛り計算
          // ============================================================

          // ★ まず数値のまま buildFrequencyDisplay() を呼び出してメーターレベルを計算する
          const ac = parseInt(String(frequencyData.ac), 10); // アルテルアレル数（例: 1538）
          const freq = parseFloat(String(frequencyData.af)); // アレル頻度（例: 0.101）
          // buildFrequencyDisplay() が返す { frequency, count, level } を frequencyData にマージ
          // level はCSSの data-frequency 属性値として使われ、メーターの目盛り数を決定する

          Object.assign(frequencyData, buildFrequencyDisplay(ac, freq));

          // ★ buildFrequencyDisplay() の計算が終わった後で、表示用にカンマ区切りの文字列に変換する
          // 例: 1538 → "1,538"
          const hasNumericValue = (
            v: number | string | null | undefined,
          ): boolean =>
            v !== undefined &&
            v !== null &&
            v !== "" &&
            !Number.isNaN(Number(v));
          const localeString = (
            v: number | string | null | undefined,
          ): string | undefined =>
            hasNumericValue(v)
              ? parseInt(String(v), 10).toLocaleString()
              : undefined;

          // ホモ接合マーカーは aac が 1 以上のときだけ表示する
          frequencyData.has_homozygote_marker = Number(frequencyData.aac) >= 1;
          // ヘミ接合マーカーは hac が 1 以上のときだけ表示する
          frequencyData.has_hemizygote_marker = Number(frequencyData.hac) >= 1;

          // ヘミ接合体カラムは 0 を含め、数値があれば表示する
          const hasHemizygoteValue =
            hasNumericValue(frequencyData.hac) ||
            hasNumericValue(frequencyData.hrc) ||
            hasNumericValue(frequencyData.hoc);

          frequencyData.ac = localeString(frequencyData.ac); // Alt Allele Count
          frequencyData.an = localeString(frequencyData.an); // Total Allele Count
          frequencyData.aac = localeString(frequencyData.aac); // Alt/Alt Homozygote Count
          frequencyData.arc = localeString(frequencyData.arc); // Alt/Ref Heterozygote Count
          frequencyData.aoc = localeString(frequencyData.aoc); // Alt/OtherAlts Count
          frequencyData.rrc = localeString(frequencyData.rrc); // Ref/Ref Homozygote Count
          frequencyData.roc = localeString(frequencyData.roc); // Ref/OtherAlts Count
          frequencyData.ooc = localeString(frequencyData.ooc); // OtherAlts/OtherAlts Count

          // ヘミ接合体カラムが必要かを判定（0を含め、数値があれば列を表示する）
          if (!hasHemizygote && hasHemizygoteValue) {
            hasHemizygote = true;
          }
          frequencyData.hac = localeString(frequencyData.hac); // Hemizygote Alt
          frequencyData.hrc = localeString(frequencyData.hrc); // Hemizygote Ref
          frequencyData.hoc = localeString(frequencyData.hoc); // Hemizygote OtherAlts

          // ---- JGA-SNP専用: 見出し行の挿入 ----
          // JGA-SNPはAPIレスポンスに depth=1 の見出しデータが存在しないため、
          // 集団が切り替わるタイミングで手動で見出し行を挿入する
          if (frequencyData.dataset === "JGA-SNP") {
            if (currentLayer1 !== frequencyData.label) {
              if (
                frequencyData.depth === 2 &&
                currentLayer1 !== findParent(preparedDatasets, datum.id)?.label
              ) {
                const parent = findParent(preparedDatasets, datum.id)!;
                const titleRow: FrequencyData = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: parent.label,
                  source: `${frequencyData.dataset}-title`,
                  id: parent.id,
                  has_child: true,
                };
                resultObject = [...resultObject, titleRow];
                currentLayer1 = parent.label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];

          // ---- 未ログイン時: JGA-WGSのダミー行を準備 ----
          // 未ログインだとJGA-WGSの個別集団データがAPIから返ってこないため、
          // ログインを促すプレースホルダー行を表示する
          if (!isLogin && frequencyData.source === "jga_wgs") {
            jgawgsChildren.forEach((child) => {
              const dummyRow: FrequencyData = {
                dataset: frequencyData.dataset,
                depth: 1,
                label: child.label,
                source: child.value,
                id: child.id,
                need_loading: true,
              };
              jgawgsData = [...jgawgsData, dummyRow];
            });
          }
        }

        // 子ノードを再帰的に処理
        if (datum.children) {
          datum.children.forEach(searchData);
        }
      };

      // DATASETSツリー全体を再帰的に走査
      preparedDatasets.forEach(searchData);

      // 未ログイン時: JGA-WGSのダミー行を適切な位置に挿入
      if (!isLogin) {
        insertObject(resultObject, jgawgsChildren, jgawgsData);
      }

      // has_child フラグを更新（開閉トグルの制御に使用）
      updateHasChild(preparedDatasets, resultObject);

      // ダウンロード用データを保存
      this.data = this.createDownloadData(
        resultObject,
        responseDatasets.data[0],
        hasHemizygote,
      );

      // HTMLテンプレートに渡してレンダリング
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: { resultObject },
          hasHemizygote,
        },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      this.data = [];
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          error: { message },
        },
      });
      return;
    }

    // ============================================================
    // ヘルパー関数群（render() 内で定義）
    // ============================================================

    /**
     * DATASETS の各ノードに一意のID(連番)と階層の深さ(depth)を付与する。
     * d3-hierarchy でツリー化する前の前処理として使用。
     */
    function addIdsToDataNodes(dataNodes: any[], currentDepth = 0): DataNode[] {
      return dataNodes.map((node) => {
        const newNode: DataNode = {
          ...node,
          id: `${uniqueIdCounter++}`,
          depth: currentDepth,
        };
        if (newNode.children && newNode.children.length > 0) {
          newNode.children = addIdsToDataNodes(
            newNode.children,
            currentDepth + 1,
          );
        }
        return newNode;
      });
    }

    /**
     * DATASETS定数をID付きノードのツリーに変換し、d3-hierarchyで管理する。
     */
    function prepareData() {
      const dataWithIds = addIdsToDataNodes(DATASETS);
      return hierarchy({
        id: "-1",
        label: "root",
        value: "",
        children: dataWithIds,
      });
    }

    /**
     * 指定IDのノードが属するトップレベル（depth=0）のノードを返す。
     * データセット名の特定に使用。
     */
    function findTopParent(
      data: DataNode[],
      targetId: string,
    ): DataNode | null {
      function recursiveSearch(
        nodes: DataNode[],
        targetId: string,
        topParent: DataNode | null = null,
      ): DataNode | null {
        for (const node of nodes) {
          if (node.id === targetId) {
            // topParent が null の場合、自分自身がトップレベルなのでそのまま返す
            return topParent ?? node;
          }
          if (node.children) {
            const found = recursiveSearch(
              node.children,
              targetId,
              topParent ?? node,
            );
            if (found) return found;
          }
        }
        return null;
      }
      return recursiveSearch(data, targetId);
    }

    /**
     * 指定IDのノードの直接の親ノードを返す。
     * parent_id / grandparent_id の特定に使用。
     */
    function findParent(data: DataNode[], targetId: string): DataNode | null {
      function recursiveSearch(
        nodes: DataNode[],
        targetId: string,
        parent: DataNode | null = null,
      ): DataNode | null {
        for (const node of nodes) {
          if (node.id === targetId) {
            return parent;
          }
          if (node.children) {
            const found = recursiveSearch(node.children, targetId, node);
            if (found) return found;
          }
        }
        return null;
      }
      return recursiveSearch(data, targetId);
    }

    /**
     * JGA-WGSの個別集団データが存在しない場合、
     * 親の JGA-WGS 行の直後から、子ノード定義順を保ったままダミー行を挿入する。
     */
    function insertObject(
      resultObject: FrequencyData[],
      jgawgsChildren: DataNode[],
      jgawgsData: FrequencyData[],
    ) {
      const parentIndex = resultObject.findIndex(
        (data) => data.source === "jga_wgs",
      );

      if (parentIndex === -1) {
        return;
      }

      let insertIndex = parentIndex + 1;

      jgawgsChildren.forEach((child, index) => {
        const existingChildIndex = resultObject.findIndex(
          (data) => data.source === child.value,
        );

        if (existingChildIndex !== -1) {
          insertIndex = existingChildIndex + 1;
          return;
        }

        const dummyRow = jgawgsData[index];
        if (dummyRow) {
          resultObject.splice(insertIndex, 0, dummyRow);
          insertIndex += 1;
        }
      });
    }

    /**
     * 各データセットノードの has_child フラグを更新する。
     * 子データが存在するノードには has_child=true を設定し、
     * テンプレート側でトグルアイコンの表示を制御する。
     */
    function updateHasChild(datasets: DataNode[], data: FrequencyData[]) {
      datasets.forEach((datum) => {
        const dataNode = data.find((d) => d.source === datum.value);
        if (dataNode) {
          dataNode.has_child = false;
        }

        if (datum.children?.length > 0 && dataNode) {
          const hasMatchingChild = datum.children.some((child) =>
            data.some((d) => d.source === child.value),
          );
          const hasMatchingChildSub = datum.children.some((child) =>
            data.some((d) => d.label === child.label),
          );

          if (hasMatchingChild || hasMatchingChildSub) {
            dataNode.has_child = true;
          }
        }

        if (datum.children && datum.children.length > 0) {
          updateHasChild(datum.children, data);
        }
      });
    }

    // ============================================================
    // トグル（開閉）イベントの設定
    // ============================================================

    /**
     * セレクタに一致する要素の parentElement に対してクラスをトグルする。
     * querySelectorAll → forEach → parentElement.classList.toggle の繰り返しを共通化。
     */
    const toggleChildren = (selector: string, cls: string) => {
      this.root
        .querySelectorAll<HTMLElement>(selector)
        .forEach((el) => el.parentElement?.classList.toggle(cls));
    };

    /**
     * セレクタに一致する要素の parentElement に対して条件付きでクラスを付け外しする。
     * - closeClass を既に持つ場合 → closeClass を削除（元に戻す）
     * - showClass を持つ場合    → closeClass を追加（展開中を閉じる）
     * このパターンは depth=0 のトグル時に下位レイヤーの状態を同期するために使う。
     */
    const conditionalClose = (
      selector: string,
      closeClass: string,
      showClass: string,
    ) => {
      this.root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const parent = el.parentElement!;
        if (parent.classList.contains(closeClass)) {
          parent.classList.remove(closeClass);
        } else if (parent.classList.contains(showClass)) {
          parent.classList.add(closeClass);
        }
      });
    };

    // ---- depth=0（データセット行）のクリックイベント ----
    this.root
      .querySelectorAll<HTMLElement>('.population[data-depth="0"]')
      .forEach((layer) =>
        layer.addEventListener("click", (_e) => {
          layer.classList.toggle("open");
          const ds = layer.dataset.dataset;

          // JGA-WGS / gnomAD Genomes / gnomAD Exomes:
          // depth=1 の子行をトグルするだけ
          if (
            ds === "JGA-WGS" ||
            ds === "gnomAD Genomes" ||
            ds === "gnomAD Exomes"
          ) {
            toggleChildren(
              `[data-dataset="${ds}"].population[data-depth="1"]`,
              "show-by-total",
            );
          }

          // JGA-SNP: depth=1 をトグルしつつ、下位レイヤーの展開状態も同期
          if (ds === "JGA-SNP") {
            toggleChildren(
              '[data-dataset="JGA-SNP"].population[data-depth="1"]',
              "show-by-total",
            );
            // depth=2: show-by-sub で展開中のものを閉じる（または元に戻す）
            conditionalClose(
              '[data-dataset="JGA-SNP"].population[data-depth="2"]',
              "close-by-total",
              "show-by-sub",
            );
            // depth=3 (Male/Female): show で展開中のものを閉じる（または元に戻す）
            conditionalClose(
              '[data-dataset="JGA-SNP"].population[data-depth="3"]',
              "close-by-total",
              "show",
            );
          }

          // NCBN: depth=1 をトグルしつつ、depth=2 の展開状態も同期
          if (ds === "NCBN") {
            toggleChildren(
              '[data-dataset="NCBN"].population[data-depth="1"]',
              "show-by-total",
            );
            conditionalClose(
              '[data-dataset="NCBN"].population[data-depth="2"]',
              "close-by-total",
              "show",
            );
          }
        }),
      );

    // ---- depth=1（集団行）のクリックイベント ----
    this.root
      .querySelectorAll<HTMLElement>('.population[data-depth="1"]')
      .forEach((layer) =>
        layer.addEventListener("click", (_e) => {
          layer.classList.toggle("open");
          const ds = layer.dataset.dataset;
          const id = layer.dataset.id;

          // JGA-SNP: depth=2 をトグルしつつ、depth=3 (Male/Female) の状態も同期
          if (ds === "JGA-SNP") {
            toggleChildren(
              `[data-dataset="JGA-SNP"].population[data-parent-id="${id}"][data-depth="2"]`,
              "show-by-sub",
            );
            conditionalClose(
              `[data-dataset="JGA-SNP"].population[data-grandparent-id="${id}"][data-depth="3"]`,
              "close-by-sub",
              "show",
            );
          }

          // NCBN: depth=2 をトグル
          if (ds === "NCBN") {
            toggleChildren(
              '[data-dataset="NCBN"].population[data-depth="2"]',
              "show",
            );
          }
        }),
      );

    // ---- depth=2（サブ集団行）のクリックイベント ----
    this.root
      .querySelectorAll<HTMLElement>('.population[data-depth="2"]')
      .forEach((layer) =>
        layer.addEventListener("click", (_e) => {
          layer.classList.toggle("open");
          const ds = layer.dataset.dataset;
          const id = layer.dataset.id;

          // JGA-SNP: depth=3 (Male/Female) をトグル
          if (ds === "JGA-SNP") {
            toggleChildren(
              `[data-dataset="JGA-SNP"].population[data-parent-id="${id}"][data-depth="3"]`,
              "show",
            );
          }
        }),
      );
  }

  // ============================================================
  // createDownloadData() — ダウンロード用データの整形
  // ============================================================

  createDownloadData(
    resultObject: FrequencyData[],
    variantData: any,
    hasHemizygote: boolean,
  ) {
    return resultObject
      .filter((freq) => {
        return (
          !freq.source?.includes("-title") && // JGA-SNPの見出し行を除外
          !freq.need_loading && // 未ログイン時のダミー行を除外
          freq.af !== undefined // 頻度データが存在する行のみ
        );
      })
      .map((freq) => {
        return {
          id: freq.id,
          depth: freq.depth,
          tgvid: variantData.id,
          rsid: variantData.existing_variations?.join(",") || "",
          chrom: variantData.chromosome,
          pos: variantData.position,
          ref: variantData.reference,
          alt: variantData.alternate,
          dataset: freq.dataset,
          population: freq.label,
          source: freq.source,
          ac: freq.ac,
          an: freq.an,
          // ダウンロードは表示用フォーマットではなく、生のAF値を出力する
          af: freq.af,
          "alt/alt": freq.aac,
          "alt/ref": freq.arc,
          "ref/otheralts": freq.aoc,
          "ref/ref": freq.rrc,
          "ref/otheralt": freq.roc,
          "otheralt/otheralt": freq.ooc,
          ...(hasHemizygote && {
            hemi_alt: freq.hac,
            hemi_ref: freq.hrc,
            hemi_other_alts: freq.hoc,
          }),
          filter: Array.isArray(freq.filter)
            ? freq.filter.join(",")
            : freq.filter,
          quality: freq.quality,
        };
      });
  }
}
