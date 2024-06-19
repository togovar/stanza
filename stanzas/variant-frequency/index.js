import Stanza from "togostanza/stanza";

import { DATASETS } from "@/lib/constants";
import { frequency } from "@/lib/display";

export default class VariantSummary extends Stanza {
  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    // database icon
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    const { "data-url": urlBase, assembly, tgv_id } = this.params;
    const dataURL = `${urlBase}/search?quality=0&term=${tgv_id}&expand_dataset`;
    let resultObject = [];
    let currentLayer1;
    let hasHemizygote = false;

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
      const datasets = Object.values(DATASETS);

      /** Finds the top-level parent of a given node ID in a nested data structure.
      * @param {Array<Object>} data - The nested data structure to search.
      * @param {string} id - The ID of the node to find the top-level parent for.
      * @returns {Object|null} The top-level parent node or null if not found. */
      const findTopParent = (data, id) => {
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
        return recursiveSearch(data, id);
      }

      /** Finds the direct parent of a given node ID in a nested data structure.
      * @param {Array<Object>} data - The nested data structure to search.
      * @param {string} id - The ID of the node to find the parent for.
      * @returns {Object|null} The parent node or null if not found. */
      const findParent = (data, id) => {
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

      /** Counts the number of parents for a given node ID in a nested data structure.
     * @param {Array<Object>} data - The nested data structure to search.
     * @param {string} id - The ID of the node to count the parents for.
     * @returns {number|null} The number of parent nodes or null if not found. */
      const countParents = (data, id) => {
        function recursiveSearch(nodes, targetId, parentCount = 0) {
          for (const node of nodes) {
            if (node.id === targetId) {
              // ターゲットIDが見つかったら、親の数を返す
              return parentCount;
            }
            if (node.children) {
              const found = recursiveSearch(node.children, targetId, parentCount + 1);
              if (found !== null) {
                return found;
              }
            }
          }
          return null;
        }
        return recursiveSearch(data, id);
      }

      /** Searches for and processes data, updating frequency datasets and result objects.
      * @param {Object} datum - The current dataset object being processed. */
      const searchData = (datum) => {
        // 一致するデータを探す
        const frequencyData = frequenciesDatasets?.find(x => x.source === datum.value);
        if (frequencyData) {
          const ac = parseInt(frequencyData.ac);
          const freq = parseFloat(frequencyData.af);

          // 数値をロケール形式の文字列に変換する関数
          const localeString = (v) => v !== undefined ? parseInt(v).toLocaleString() : null;

          // バインディングにデータセット情報を追加
          if (datum.value === 'tommo') {
            switch (assembly) {
              case "GRCh37":
                frequencyData.dataset = "ToMMo 8.3KJPN";
                break;
              case "GRCh38":
                frequencyData.dataset = "ToMMo 54KJPN";
                break;
              default:
                frequencyData.dataset = "ToMMo";
            }
          } else {
            frequencyData.dataset = findTopParent(datasets, datum.id).label
          }

          if (["gem_j_wga", "jga_ngs", "tommo", "hgvd"].includes(datum.value)) {
            frequencyData.label = "Japanese";
          } else if (["jga_snp", "ncbn", "gnomad_genomes", "gnomad_exomes"].includes(datum.value)) {
            frequencyData.label = "Total";
          } else {
            frequencyData.label = datum.label;
          }

          // Alt
          frequencyData.ac = localeString(frequencyData.ac);
          // Total
          frequencyData.an = localeString(frequencyData.an);
          // Alt/Alt
          frequencyData.aac = localeString(frequencyData.aac);
          // Alt/Ref
          frequencyData.arc = localeString(frequencyData.arc);
          // Ref/Ref
          frequencyData.rrc = localeString(frequencyData.rrc);

          if (!hasHemizygote && (frequencyData.hemi_alt || frequencyData.hemi_ref)) {
            hasHemizygote = true;
          }

          // frequencyの情報をバインディングに追加
          Object.assign(frequencyData, frequency(ac, freq));

          // 開閉を行うtoggleを作成するため、クラスを設定
          let className = 'layer-none';
          if (frequencyData.label === 'Total') {
            className = 'layer-total';
          }
          if (
            ![
              'gem_j_wga',
              'jga_ngs',
              'jga_snp',
              'tommo',
              'ncbn',
              'gnomad_genomes',
              'gnomad_exomes'
            ].includes(frequencyData.source)
          ) {
            className = 'layer1-nonchild';

            if (frequencyData.dataset === 'JGA-SNP') {
              if (countParents(datasets, datum.id) === 2) {
                className = 'layer2';
              }
              else {
                className = 'layer3';
              }
            }

            if (frequencyData.dataset === 'NCBN') {
              if (frequencyData.source === 'ncbn.jpn') {
                className = 'layer1-haschild';
              }
              if (countParents(datasets, datum.id) === 2) {
                className = 'layer2-nonchild';
              }
            }
          }
          frequencyData.class_name = className

          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === 'JGA-SNP') {
            if (currentLayer1 !== frequencyData.label) {
              // ノードの親の数を取得
              const parentCount = countParents(datasets, datum.id);
              // 親の数が2である場合に限定して処理を実行
              if (parentCount === 2 && currentLayer1 !== findParent(datasets, datum.id).label) {
                let data = {
                  dataset: frequencyData.dataset,
                  label: findParent(datasets, datum.id).label,
                  class_name: 'sub-layer',
                  source: `${frequencyData.dataset}-title`
                };
                resultObject = [...resultObject, data];
                currentLayer1 = findParent(datasets, datum.id).label;
              }
            }

            if (findParent(datasets, datum.id)?.label) {
              if (countParents(datasets, datum.id) === 2) {
                frequencyData.layer1 = findParent(datasets, datum.id).label;
              } else {
                frequencyData.layer1 = findParent(datasets, findParent(datasets, datum.id).id).label;
                frequencyData.layer2 = findParent(datasets, datum.id).label;
              }
            }
          }

          resultObject = [...resultObject, frequencyData];
        }

        // Recursively search children
        if (datum.children) {
          datum.children.forEach(searchData);
        }
      };

      // 各データセットに対して再帰的に探索を開始
      datasets.forEach(searchData);

      const updateParentClass = (datasets, data) => {
        datasets.forEach(datum => {
          const dataNode = data.find(d => d.source === datum.value);

          if (datum.children?.length > 0 && dataNode) {
            let hasMatchingChildSub = false;
            let hasMatchingChild = false;

            // 子供のラベルと一致するものがdataのlabelにあるかチェック
            datum.children.forEach(child => {
              if (data.some(d => d.source === child.value)) {
                hasMatchingChild = true;
              }
              if (data.some(d => d.label === child.label)) {
                hasMatchingChildSub = true;
              }
            });

            // 一致するものがない場合、クラス名を変更
            if (!hasMatchingChild) {
              const changeClass = data.find(d => d.source === datum.value);
              if (changeClass) {
                if (changeClass.source !== "jga_snp" && changeClass.class_name === "layer-total") {
                  changeClass.class_name = "total-no-children";
                }
                if (changeClass.class_name === "layer1-haschild") {
                  changeClass.class_name = "layer1-nonchild";
                }
                if (changeClass.class_name === "layer2") {
                  changeClass.class_name = "layer2-nonchild";
                }
              }
            }

            if (!hasMatchingChildSub) {
              const changeClass = data.find(d => d.source === datum.value);
              if (changeClass) {
                if (changeClass.class_name === "layer-total") {
                  changeClass.class_name = "total-no-children";
                }
              }
            }
          }

          // 子供を持つノードに対して再帰的に同じ処理を行う
          if (datum.children && datum.children.length > 0) {
            updateParentClass(datum.children, data);
          }
        });
      };

      // クラス名を更新
      updateParentClass(datasets, resultObject);

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
      // エラーハンドリング
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          error: { message: e.message }
        }
      });
    }

    // 以下トグルの開閉に関するイベント
    const layerTotal = this.root.querySelectorAll('.population.layer-total');
    layerTotal.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        // JGA-SNP
        if (layer.dataset.dataset === 'JGA-SNP') {
          const subLayer = this.root.querySelectorAll(
            '[data-dataset="JGA-SNP"].population.sub-layer'
          )
          subLayer.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });

          const layer2 = this.root.querySelectorAll('[data-dataset="JGA-SNP"].population.layer2, [data-dataset="JGA-SNP"].population.layer2-nonchild');
          layer2.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show-by-sub')) {
              element.parentElement.classList.add('close-by-total');
            }
          });

          // Male or Female
          const layer3 = this.root.querySelectorAll('[data-dataset="JGA-SNP"].population.layer3');
          layer3.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-total');
            }
          });
        }

        // NCBN
        if (layer.dataset.dataset === 'NCBN') {
          const layer1NonChild = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population.layer1-nonchild'
          );
          layer1NonChild.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });

          const layer1HasChild = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population.layer1-haschild'
          );
          layer1HasChild.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });

          const layer2 = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population.layer2-nonchild'
          );
          layer2.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-total')) {
              element.parentElement.classList.remove('close-by-total');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-total');
            }
          });
        }

        // gnomAD Genomes
        if (layer.dataset.dataset === 'gnomAD Genomes') {
          const layer1NonChild = this.root.querySelectorAll(
            '[data-dataset="gnomAD Genomes"].population.layer1-nonchild'
          );
          layer1NonChild.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });
        }

        // gnomAD Exomes
        if (layer.dataset.dataset === 'gnomAD Exomes') {
          const layer1NonChild = this.root.querySelectorAll(
            '[data-dataset="gnomAD Exomes"].population.layer1-nonchild'
          );
          layer1NonChild.forEach((element) => {
            element.parentElement.classList.toggle('show-by-total');
          });
        }
      })
    );

    const subLayer = this.root.querySelectorAll('.population.sub-layer');
    subLayer.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        if (layer.dataset.dataset === 'JGA-SNP') {
          const layer2 = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.label}"].population.layer2,
            [data-dataset="JGA-SNP"][data-layer1="${layer.dataset.label}"].population.layer2-nonchild`
          );

          layer2.forEach((element) => {
            element.parentElement.classList.toggle('show-by-sub');
          });

          // Male, Female
          const layer3 = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.label}"].population.layer3`
          );
          layer3.forEach((element) => {
            if (element.parentElement.classList.contains('close-by-sub')) {
              element.parentElement.classList.remove('close-by-sub');
            } else if (element.parentElement.classList.contains('show')) {
              element.parentElement.classList.add('close-by-sub');
            }
          });
        }
      })
    );

    const layer2 = this.root.querySelectorAll('.population.layer2');
    layer2.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        if (layer.dataset.dataset === 'JGA-SNP') {
          const layer3 = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.layer1}"][data-layer2="${layer.dataset.label}"].population.layer3`
          );
          layer3.forEach((element) => {
            element.parentElement.classList.toggle('show');
          });
        }
      })
    );

    const layer1HasChild = this.root.querySelectorAll('.population.layer1-haschild');
    layer1HasChild.forEach((layer) =>
      layer.addEventListener('click', (e) => {
        e.target.classList.toggle('open');

        if (layer.dataset.dataset === 'NCBN') {
          const layer2 = this.root.querySelectorAll(
            '[data-dataset="NCBN"].population.layer2-nonchild'
          );
          layer2.forEach((element) => {
            element.parentElement.classList.toggle('show');
          });
        }
      })
    );
  }
}
