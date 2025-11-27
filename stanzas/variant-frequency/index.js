import Stanza from "togostanza/stanza";
import { hierarchy } from 'd3-hierarchy';
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
    this.data = null;
  }

  menu() {
    return [
      downloadJSONMenuItem(this, "variant-frequency", this.data),
      downloadCSVMenuItem(this, "variant-frequency", this.data),
      downloadTSVMenuItem(this, "variant-frequency", this.data),
    ];
  }

  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    // database icon
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    const { "data-url": urlBase, assembly, tgv_id } = this.params;
    const dataURL = `${urlBase}/search?quality=0&term=${tgv_id}&expand_dataset`;
    let resultObject = [];
    let jgawgsData = [];
    const hasjgawgsChildren = [false, false, false, false];
    let jgawgsChildren;
    let currentLayer1;
    let hasHemizygote = false;
    let uniqueIdCounter = 0;
    const preparedDatasets = Object.values(prepareData().data.children);
    preparedDatasets.forEach((dataset) => {
      if (dataset.value === "jga_wgs") {
        jgawgsChildren = dataset.children;
      }
    })
    let isLogin = false;

    try {
      if (window.location.origin === 'http://localhost:8080') {
        isLogin = false;
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = fetch(`${window.location.origin}/auth/status`);
      const response = await Promise.race([fetchPromise, timeout]);

      if (response.status === 401 || response.status === 403) {
        isLogin = false;
      } else if (response.status === 200) {
        isLogin = true;
      }
    } catch (error) {
      console.error('Error fetching auth status or timeout occurred:', error);
    }


    try {
      // dataURL に GET リクエストを送信
      const response = await fetch(dataURL, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      // レスポンスのステータスをチェック
      if (!response.ok) {
        throw new Error(`${dataURL} returns status ${response.status}`);
      }

      // レスポンスを JSON 形式でパース
      const responseDatasets = await response.json();
      const frequenciesDatasets = responseDatasets.data[0]?.frequencies

      // Save data to instance property
      this.data = frequenciesDatasets;

      /** Searches for and processes data, updating frequency datasets and result objects.
      * @param {Object} datum - The current dataset object being processed. */
      const searchData = (datum) => {
        // 一致するデータを探す
        const frequencyData = frequenciesDatasets?.find(x => x.source === datum.value);
        if (frequencyData) {
          // ID
          frequencyData.id = datum.id
          // 深さ
          frequencyData.depth = datum.depth;
          // 親ID
          if (datum.depth > 0) {
            frequencyData.parent_id = findParent(preparedDatasets, datum.id).id;
          }
          if (datum.depth > 1) {
            frequencyData.grandparent_id = findParent(preparedDatasets, findParent(preparedDatasets, datum.id).id).id;
          }

          // バインディングにデータセット情報を追加
          if (datum.value === 'tommo') {
            switch (assembly) {
              case "GRCh37":
                frequencyData.dataset = "ToMMo 8.3KJPN";
                break;
              case "GRCh38":
                frequencyData.dataset = "ToMMo 54KJPN";
                break;
            }
          } else {
            frequencyData.dataset = findTopParent(preparedDatasets, datum.id).label
          }

          // Population label
          if (["gem_j_wga", "jga_wes", "tommo", "hgvd"].includes(datum.value)) {
            frequencyData.label = "Japanese";
          } else if (["jga_wgs", "jga_snp", "ncbn", "gnomad_genomes", "gnomad_exomes"].includes(datum.value)) {
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // 数値をロケール形式の文字列に変換する関数
          const localeString = (v) => v !== undefined ? parseInt(v).toLocaleString() : null;
          // Alt
          frequencyData.ac = localeString(frequencyData.ac);
          // Total
          frequencyData.an = localeString(frequencyData.an);
          // Alt/Alt
          frequencyData.aac = localeString(frequencyData.aac);
          // Alt/Ref
          frequencyData.arc = localeString(frequencyData.arc);
          // Alt/OtherAlts(JGA-WGSのみ)
          frequencyData.aoc = localeString(frequencyData.aoc);
          // Ref/Ref
          frequencyData.rrc = localeString(frequencyData.rrc);
          // Ref/OtherAlts(JGA-WGSのみ)
          frequencyData.roc = localeString(frequencyData.roc);
          // Other_Alts/Other_Alts(JGA-WGSのみ)
          frequencyData.ooc = localeString(frequencyData.ooc);

          if (!hasHemizygote && (frequencyData.hemi_alt !== undefined || frequencyData.hemi_ref !== undefined || frequencyData.hemi_others !== undefined)) {
            hasHemizygote = true;
          }

          // frequencyの情報をバインディングに追加
          const ac = parseInt(frequencyData.ac);
          const freq = parseFloat(frequencyData.af);
          Object.assign(frequencyData, frequency(ac, freq));

          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === 'JGA-SNP') {
            if (currentLayer1 !== frequencyData.label) {
              if (frequencyData.depth === 2 && currentLayer1 !== findParent(preparedDatasets, datum.id).label) {
                let data = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: findParent(preparedDatasets, datum.id).label,
                  source: `${frequencyData.dataset}-title`,
                  id: findParent(preparedDatasets, datum.id).id,
                  has_child: true
                };
                resultObject = [...resultObject, data];
                currentLayer1 = findParent(preparedDatasets, datum.id).label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];

          if (!isLogin) {
            if (frequencyData.source === "jga_wgs") {
              jgawgsChildren.forEach(child => {
                let data = {
                  dataset: frequencyData.dataset,
                  depth: 1,
                  label: child.label,
                  source: child.value,
                  id: child.id,
                  need_loading: true
                };
                jgawgsData = [...jgawgsData, data];
              })
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

      // 結果をレンダリング
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: { resultObject },
          hasHemizygote,
        }
      });

    } catch (e) {
      ({ error: { message: e.message } })
    }

    function addIdsToDataNodes(dataNodes, currentDepth = 0) {
      return dataNodes.map((node) => {
        // 各ノードに一意のIDを設定
        const newNode = {
          ...node,
          id: `${uniqueIdCounter++}`,
          depth: currentDepth
        };

        // 子ノードがある場合は再帰的に処理
        if (newNode.children && newNode.children.length > 0) {
          newNode.children = addIdsToDataNodes(newNode.children, currentDepth + 1);
        }
        return newNode;
      });
    }

    function prepareData() {
      const data = DATASETS
      const dataWithIds = addIdsToDataNodes(data);
      const hierarchyData = hierarchy({
        id: '-1',
        label: 'root',
        value: '',
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
            const found = recursiveSearch(node.children, targetId, parent || node);
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
      datasets.forEach(datum => {
        // 現在のノードに対応するデータを取得
        const dataNode = data.find(d => d.source === datum.value);
        if (dataNode) {
          dataNode.has_child = false;
        }

        if (datum.children?.length > 0 && dataNode) {
          // 子供の一致を確認
          const hasMatchingChild = datum.children.some(child =>
            data.some(d => d.source === child.value)
          );
          const hasMatchingChildSub = datum.children.some(child =>
            data.some(d => d.label === child.label)
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
    };

    // 以下トグルの開閉に関するイベント
    const depth0Layer = this.root.querySelectorAll('.population[data-depth="0"]');
    depth0Layer.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        // JGA-WGS
        if (layer.dataset.dataset === 'JGA-WGS') {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="JGA-WGS"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });
        }

        // JGA-SNP
        if (layer.dataset.dataset === 'JGA-SNP') {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="JGA-SNP"].population[data-depth="1"]'
          )
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });

          const depth2Children = this.root.querySelectorAll('[data-dataset="JGA-SNP"].population[data-depth="2"]');
          depth2Children.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show-by-sub')) {
              element.parentElement.classList.add('close-by-total');
            }
          });

          // Male or Female
          const depth3Children = this.root.querySelectorAll('[data-dataset="JGA-SNP"].population[data-depth="3"]');
          depth3Children.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-total');
            }
          });
        }

        // NCBN
        if (layer.dataset.dataset === 'NCBN') {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });

          const depth2Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="2"]'
          );
          depth2Children.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-total');
            }
          });
        }

        // gnomAD Genomes
        if (layer.dataset.dataset === 'gnomAD Genomes') {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="gnomAD Genomes"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });
        }

        // gnomAD Exomes
        if (layer.dataset.dataset === 'gnomAD Exomes') {
          const depth1Children = this.root.querySelectorAll(
            '[data-dataset="gnomAD Exomes"].population[data-depth="1"]'
          );
          depth1Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });
        }
      })
    );

    const depth1Layer = this.root.querySelectorAll('.population[data-depth="1"]');
    depth1Layer.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        // JGA-SNP
        if (layer.dataset.dataset === 'JGA-SNP') {
          const depth2Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-parent-id="${layer.dataset.id}"][data-depth="2"]`
          );
          depth2Children.forEach((element) => {
            element.parentElement.classList.toggle('show-by-sub');
          });

          // Male, Female
          const depth3Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-grandparent-id="${layer.dataset.id}"][data-depth="3"]`
          );
          depth3Children.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-sub')) {
              element.parentElement.classList.remove('close-by-sub');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-sub');
            }
          });
        }

        // NCBN
        if (layer.dataset.dataset === 'NCBN') {
          const depth2Children = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population[data-depth="2"]'
          );
          depth2Children.forEach((element) => {
            element.parentElement.classList.toggle('show');
          });
        }
      })
    );

    const depth2Layer = this.root.querySelectorAll('.population[data-depth="2"]');
    depth2Layer.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        // JGA-SNP
        if (layer.dataset.dataset === 'JGA-SNP') {
          const depth3Children = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"].population[data-parent-id="${layer.dataset.id}"][data-depth="3"]`
          );
          depth3Children.forEach((element) => {
            element.parentElement.classList.toggle('show');
          });
        }
      })
    );
  }
}
