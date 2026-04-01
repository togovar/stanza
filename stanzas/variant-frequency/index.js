import Stanza from "togostanza/stanza";
import { hierarchy } from "d3-hierarchy";
import { DATASETS } from "@/lib/constants";
import { frequency } from "@/lib/display";
import {
  downloadCSVMenuItem,
  downloadJSONMenuItem,
  downloadTSVMenuItem,
} from "togostanza-utils";

export default class VariantFrequency extends Stanza {
  constructor() {
    super(...arguments);
    // ダウンロード用データを保持する配列
    this.data = [];
  }

  // 右上のメニューボタンに表示するダウンロード項目を返す
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

  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS(
      "https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900"
    );
    // database icon
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    // stanzaのパラメータを取得
    // data-url: APIのベースURL、assembly: GRCh37/GRCh38、tgv_id: バリアントID
    const { "data-url": urlBase, assembly, tgv_id } = this.params;
    // APIのリクエストURL（バリアントIDでデータセット情報を展開して取得）
    const dataURL = `${urlBase}/search?quality=0&term=${tgv_id}&expand_dataset`;
    // テーブルに表示するデータを格納する配列
    let resultObject = [];
    // JGA-WGSの未ログイン時に表示するダミーデータ
    let jgawgsData = [];
    // JGA-WGSの子要素（4集団）が既に存在するかを管理するフラグ
    const hasjgawgsChildren = [false, false, false, false];
    let jgawgsChildren;
    // JGA-SNPの depth=1 レイヤーを追跡（見出し行の重複を防ぐため）
    let currentLayer1;
    // X染色体などでヘミ接合体(Hemizygote)が存在するかのフラグ
    let hasHemizygote = false;
    // ノードに振るID（連番）
    let uniqueIdCounter = 0;
    // DATASETS定数をツリー構造に変換し、各ノードにIDと深さを付与
    const preparedDatasets = Object.values(prepareData().data.children);
    preparedDatasets.forEach((dataset) => {
      if (dataset.value === "jga_wgs") {
        // JGA-WGSの子要素リスト（未ログイン時のダミー表示に使う）
        jgawgsChildren = dataset.children;
      }
    });
    // ログイン状態フラグ（JGA-WGSの詳細データ表示に使用）
    let isLogin = false;

    try {
      if (window.location.origin === "http://localhost:8080") {
        isLogin = false;
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const fetchPromise = fetch(`${window.location.origin}/auth/status`);
      const response = await Promise.race([fetchPromise, timeout]);

      if (response.status === 401 || response.status === 403) {
        isLogin = false;
      } else if (response.status === 200) {
        isLogin = true;
      }
    } catch (error) {
      console.error("Error fetching auth status or timeout occurred:", error);
    }

    try {
      // dataURL に GET リクエストを送信
      const response = await fetch(dataURL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      // レスポンスのステータスをチェック
      if (!response.ok) {
        throw new Error(`${dataURL} returns status ${response.status}`);
      }

      // レスポンスを JSON 形式でパース
      const responseDatasets = await response.json();
      const frequenciesDatasets = responseDatasets.data[0]?.frequencies;

      /** Searches for and processes data, updating frequency datasets and result objects.
       * @param {Object} datum - The current dataset object being processed. */
      const searchData = (datum) => {
        // 一致するデータを探す
        const frequencyData = frequenciesDatasets?.find(
          (x) => x.source === datum.value
        );
        if (frequencyData) {
          // ID
          frequencyData.id = datum.id;
          // 深さ
          frequencyData.depth = datum.depth;
          // 親ID
          if (datum.depth > 0) {
            frequencyData.parent_id = findParent(preparedDatasets, datum.id).id;
          }
          if (datum.depth > 1) {
            frequencyData.grandparent_id = findParent(
              preparedDatasets,
              findParent(preparedDatasets, datum.id).id
            ).id;
          }

          // バインディングにデータセット情報を追加
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
            frequencyData.dataset = findTopParent(
              preparedDatasets,
              datum.id
            ).label;
          }

          // Population label
          if (["gem_j_wga", "jga_wes", "tommo", "hgvd"].includes(datum.value)) {
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
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // =========================================================
          // 【バグ修正箇所】アレル頻度メーターの目盛り計算
          //
          // 修正前の問題:
          //   先に localeString() を呼ぶと、例えば ac=1538 が
          //   "1,538" という文字列に変換されてしまう。
          //   その後 parseInt("1,538") を呼ぶと、カンマで処理が
          //   止まるため結果が 1 になってしまう。
          //   → frequency(1, 0.101) は "singleton" と判定され、
          //     メーターが1目盛りしか表示されなかった。
          //
          // 修正後:
          //   localeString() による文字列変換を行う前に、
          //   元の数値のまま frequency() を呼んで正しいレベルを計算する。
          //   → frequency(1538, 0.101) は "<0.5" と判定され、
          //     メーターが6目盛り表示される（0.101 に対応した正しい値）。
          // =========================================================

          // ★ まず数値のまま ac と af を取得してメーターレベルを計算する
          const ac = parseInt(frequencyData.ac);  // アルテルアレル数（例: 1538）
          const freq = parseFloat(frequencyData.af); // アレル頻度（例: 0.101）
          // frequency() が返す { frequency, count, level } を frequencyData にマージ
          // level はCSSクラス名として使われ、メーターの目盛り数を決定する
          Object.assign(frequencyData, frequency(ac, freq));

          // ★ frequency() の計算が終わった後で、表示用に数値をカンマ区切りの文字列に変換する
          // parseInt().toLocaleString() により 1538 → "1,538" のような形式にする
          const localeString = (v) =>
            v !== undefined ? parseInt(v).toLocaleString() : null;
          // Alt（アルテルアレル数）
          frequencyData.ac = localeString(frequencyData.ac);
          // Total（総アレル数）
          frequencyData.an = localeString(frequencyData.an);
          // Alt/Alt（アルテル/アルテルのホモ接合体数）
          frequencyData.aac = localeString(frequencyData.aac);
          // Alt/Ref（アルテル/リファレンスのヘテロ接合体数）
          frequencyData.arc = localeString(frequencyData.arc);
          // Alt/OtherAlts（JGA-WGSのみ）
          frequencyData.aoc = localeString(frequencyData.aoc);
          // Ref/Ref（リファレンス/リファレンスのホモ接合体数）
          frequencyData.rrc = localeString(frequencyData.rrc);
          // Ref/OtherAlts（JGA-WGSのみ）
          frequencyData.roc = localeString(frequencyData.roc);
          // Other_Alts/Other_Alts（JGA-WGSのみ）
          frequencyData.ooc = localeString(frequencyData.ooc);

          if (
            !hasHemizygote &&
            (Number(frequencyData.hac) > 0 ||
              Number(frequencyData.hrc) > 0 ||
              Number(frequencyData.hoc) > 0)
          ) {
            hasHemizygote = true;
          }
          frequencyData.hac = localeString(frequencyData.hac);
          frequencyData.hrc = localeString(frequencyData.hrc);
          frequencyData.hoc = localeString(frequencyData.hoc);

          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === "JGA-SNP") {
            if (currentLayer1 !== frequencyData.label) {
              if (
                frequencyData.depth === 2 &&
                currentLayer1 !== findParent(preparedDatasets, datum.id).label
              ) {
                let data = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: findParent(preparedDatasets, datum.id).label,
                  source: `${frequencyData.dataset}-title`,
                  id: findParent(preparedDatasets, datum.id).id,
                  has_child: true,
                };
                resultObject = [...resultObject, data];
                currentLayer1 = findParent(preparedDatasets, datum.id).label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];

          if (!isLogin) {
            if (frequencyData.source === "jga_wgs") {
              jgawgsChildren.forEach((child) => {
                let data = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: child.label,
                  source: child.value,
                  id: child.id,
                  need_loading: true,
                };
                jgawgsData = [...jgawgsData, data];
              });
            }
          }
        }

        // Recursively search children
        if (datum.children) {
          datum.children.forEach(searchData);
        }
      };

      // 各データセットに対して再帰的に探索を開始
      preparedDatasets.forEach(searchData);

      // JGA-WGSのデータを挿入
      if (!isLogin) {
        checkExistence(resultObject, jgawgsChildren);
        insertObject(resultObject, hasjgawgsChildren, jgawgsData);
      }

      // クラス名を更新
      updateHasChild(preparedDatasets, resultObject);

      // Prepare download data
      this.data = this.createDownloadData(
        resultObject,
        responseDatasets.data[0],
        hasHemizygote
      );

      // 結果をレンダリング
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: { resultObject },
          hasHemizygote,
        },
      });
    } catch (e) {
      ({ error: { message: e.message } });
    }

    function addIdsToDataNodes(dataNodes, currentDepth = 0) {
      return dataNodes.map((node) => {
        // 各ノードに一意のIDを設定
        const newNode = {
          ...node,
          id: `${uniqueIdCounter++}`,
          depth: currentDepth,
        };

        // 子ノードがある場合は再帰的に処理
        if (newNode.children && newNode.children.length > 0) {
          newNode.children = addIdsToDataNodes(
            newNode.children,
            currentDepth + 1
          );
        }
        return newNode;
      });
    }

    function prepareData() {
      const data = DATASETS;
      const dataWithIds = addIdsToDataNodes(data);
      const hierarchyData = hierarchy({
        id: "-1",
        label: "root",
        value: "",
        children: dataWithIds,
      });
      return hierarchyData;
    }

    /** Finds the top-level parent of a given node ID in a nested data structure.
     * @param {Array<Object>} data - The nested data structure to search.
     * @param {string} id - The ID of the node to find the top-level parent for.
     * @returns {Object|null} The top-level parent node or null if not found. */
    function findTopParent(data, targetId) {
      // 内部で再帰的に探索する関数
      function recursiveSearch(nodes, targetId, parent = null) {
        for (const node of nodes) {
          if (node.id === targetId) {
            // ターゲットIDが見つかったら、トップレベルの親を返す
            return parent || node;
          }
          if (node.children) {
            const found = recursiveSearch(
              node.children,
              targetId,
              parent || node
            );
            if (found) {
              return found;
            }
          }
        }
        return null;
      }
      return recursiveSearch(data, targetId);
    }

    /** Finds the direct parent of a given node ID in a nested data structure.
     * @param {Array<Object>} data - The nested data structure to search.
     * @param {string} id - The ID of the node to find the parent for.
     * @returns {Object|null} The parent node or null if not found. */
    function findParent(data, id) {
      function recursiveSearch(nodes, targetId, parent = null) {
        for (const node of nodes) {
          if (node.id === targetId) {
            // ターゲットIDが見つかったら、そのノードの親を返す
            return parent;
          }
          if (node.children) {
            const found = recursiveSearch(node.children, targetId, node);
            if (found) {
              return found;
            }
          }
        }
        return null;
      }
      return recursiveSearch(data, id);
    }

    // 存在確認を関数化
    function checkExistence(resultObject, jgawgsChildren) {
      resultObject.forEach((data) => {
        jgawgsChildren.forEach((child, index) => {
          if (data.source === child.value) {
            hasjgawgsChildren[index] = true;
          }
        });
      });
    }

    // オブジェクト挿入を関数化
    function insertObject(resultObject, hasChildren, jgawgsData) {
      hasChildren.forEach((exists, index) => {
        if (!exists) {
          resultObject.forEach((data, i) => {
            if (data.id === (index + 1).toString()) {
              resultObject.splice(i + 1, 0, jgawgsData[index]);
            }
          });
        }
      });
    }

    function updateHasChild(datasets, data) {
      datasets.forEach((datum) => {
        // 現在のノードに対応するデータを取得
        const dataNode = data.find((d) => d.source === datum.value);
        if (dataNode) {
          dataNode.has_child = false;
        }

        if (datum.children?.length > 0 && dataNode) {
          // 子供の一致を確認
          const hasMatchingChild = datum.children.some((child) =>
            data.some((d) => d.source === child.value)
          );
          const hasMatchingChildSub = datum.children.some((child) =>
            data.some((d) => d.label === child.label)
          );

          if (hasMatchingChild || hasMatchingChildSub) {
            dataNode.has_child = true;
          }
        }

        // 子供を持つノードに対して再帰的に同じ処理を行う
        if (datum.children && datum.children.length > 0) {
          updateHasChild(datum.children, data);
        }
      });
    }

    // 以下トグルの開閉に関するイベント
    const depth0Layer = this.root.querySelectorAll(
      '.population[data-depth="0"]'
    );
    depth0Layer.forEach((layer) =>
      layer.addEventListener("click", (e) => {
        e.target.classList.toggle("open");

        // JGA-WGS
        if (layer.dataset.dataset === "JGA-WGS") {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="JGA-WGS"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-total");
          });
        }

        // JGA-SNP
        if (layer.dataset.dataset === "JGA-SNP") {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="JGA-SNP"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-total");
          });

          const depth2Children = this.root.querySelectorAll(
            '[data-dataset="JGA-SNP"].population[data-depth="2"]'
          );
          depth2Children.forEach((element) => {
            if (element.parentElement.classList.contains("close-by-total")) {
              element.parentElement.classList.remove("close-by-total");
            } else if (
              element.parentElement.classList.contains("show-by-sub")
            ) {
              element.parentElement.classList.add("close-by-total");
            }
          });

          // Male or Female
          const depth3Children = this.root.querySelectorAll(
            '[data-dataset="JGA-SNP"].population[data-depth="3"]'
          );
          depth3Children.forEach((element) => {
            if (element.parentElement.classList.contains("close-by-total")) {
              element.parentElement.classList.remove("close-by-total");
            } else if (element.parentElement.classList.contains("show")) {
              element.parentElement.classList.add("close-by-total");
            }
          });
        }

        // NCBN
        if (layer.dataset.dataset === "NCBN") {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-total");
          });

          const depth2Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="2"]'
          );
          depth2Children.forEach((element) => {
            if (element.parentElement.classList.contains("close-by-total")) {
              element.parentElement.classList.remove("close-by-total");
            } else if (element.parentElement.classList.contains("show")) {
              element.parentElement.classList.add("close-by-total");
            }
          });
        }

        // gnomAD Genomes
        if (layer.dataset.dataset === "gnomAD Genomes") {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="gnomAD Genomes"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-total");
          });
        }

        // gnomAD Exomes
        if (layer.dataset.dataset === "gnomAD Exomes") {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="gnomAD Exomes"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-total");
          });
        }
      })
    );

    const depth1Layer = this.root.querySelectorAll(
      '.population[data-depth="1"]'
    );
    depth1Layer.forEach((layer) =>
      layer.addEventListener("click", (e) => {
        e.target.classList.toggle("open");

        // JGA-SNP
        if (layer.dataset.dataset === "JGA-SNP") {
          const depth2Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-parent-id="${layer.dataset.id}"][data-depth="2"]`
          );
          depth2Children.forEach((element) => {
            element.parentElement.classList.toggle("show-by-sub");
          });

          // Male, Female
          const depth3Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-grandparent-id="${layer.dataset.id}"][data-depth="3"]`
          );
          depth3Children.forEach((element) => {
            if (element.parentElement.classList.contains("close-by-sub")) {
              element.parentElement.classList.remove("close-by-sub");
            } else if (element.parentElement.classList.contains("show")) {
              element.parentElement.classList.add("close-by-sub");
            }
          });
        }

        // NCBN
        if (layer.dataset.dataset === "NCBN") {
          const depth2Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="2"]'
          );
          depth2Children.forEach((element) => {
            element.parentElement.classList.toggle("show");
          });
        }
      })
    );

    const depth2Layer = this.root.querySelectorAll(
      '.population[data-depth="2"]'
    );
    depth2Layer.forEach((layer) =>
      layer.addEventListener("click", (e) => {
        e.target.classList.toggle("open");

        // JGA-SNP
        if (layer.dataset.dataset === "JGA-SNP") {
          const depth3Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-parent-id="${layer.dataset.id}"][data-depth="3"]`
          );
          depth3Children.forEach((element) => {
            element.parentElement.classList.toggle("show");
          });
        }
      })
    );
  }

  createDownloadData(resultObject, variantData, hasHemizygote) {
    return resultObject
      .filter((freq) => {
        return (
          !freq.source?.includes("-title") && // タイトル行でない
          !freq.need_loading && // ダミーデータでない
          freq.af !== undefined // 頻度データが存在する
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
          af: freq.frequency,
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
