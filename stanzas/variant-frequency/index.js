import Stanza from "togostanza/stanza";

import { DATASETS } from "@/lib/constants";
import { frequency } from "@/lib/display";

export default class VariantSummary extends Stanza {
  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    // database icon
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    const assembly = this.params.assembly;
    const { "data-url": urlBase, tgv_id } = this.params;
    const dataURL = `${urlBase}search?term=${tgv_id}&expand_dataset`;
    let resultObject = [];
    let currentLayer1;

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

      // バインディングを処理
      datasets.forEach(datum => {
        const frequencyData = frequenciesDatasets?.find(x => x.source === datum.source);

        if (frequencyData) {
          const ac = parseInt(frequencyData.ac);
          const freq = parseFloat(frequencyData.af);

          // 数値をロケール形式の文字列に変換する関数
          const localeString = (v) => v ? parseInt(v).toLocaleString() : null;

          // バインディングにデータセット情報を追加
          frequencyData.dataset = datum.dataset(assembly);
          frequencyData.layer1 = datum.layer1;
          frequencyData.layer2 = datum.layer2;
          frequencyData.layer3 = datum.layer3;
          frequencyData.ac = localeString(frequencyData?.ac);
          frequencyData.an = localeString(frequencyData?.an);
          frequencyData.aac = localeString(frequencyData?.aac);
          frequencyData.arc = localeString(frequencyData?.arc);
          frequencyData.rrc = localeString(frequencyData?.rrc);

          // frequencyの情報をバインディングに追加
          Object.assign(frequencyData, frequency(ac, freq));

          // 開閉を行うtoggleを作成するため、クラスを設定
          let className = 'layer-none';
          if (frequencyData.layer1 === 'Total') {
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
            if (!frequencyData.layer2) {
              className = 'layer1-nonchild';
            } else {
              className = 'layer2';

              if (frequencyData.dataset !== 'JGA-SNP') {
                className = 'layer2-nonchild';
              }
              if (frequencyData.layer3) {
                className = 'layer3';
              }
            }
            if (frequencyData.source === 'ncbn.jpn') {
              className = 'layer1-haschild';
            }
          }
          frequencyData.class_name = className

          // クラス名によって表示するlayerの変更
          let label = ""
          switch (className) {
            case "layer-none":
            case "layer-total":
            case "sub-layer":
            case "layer1-haschild":
            case "layer1-nonchild":
              label = frequencyData.layer1
              break;
            case 'layer2':
            case 'layer2-nonchild':
              label = frequencyData.layer2
              break;
            case 'layer3':
              label = frequencyData.layer3
              break;
            default:
              break;
          }
          frequencyData.label = label


          // JGA-SNPの場合 見出しのdataがないため追加
          if (frequencyData.dataset === 'JGA-SNP') {
            if (currentLayer1 !== frequencyData.layer1) {
              if (frequencyData.layer1 !== 'Total') {
                let data = {
                  dataset: frequencyData.dataset,
                  label: frequencyData.layer1,
                  layer1: frequencyData.layer1,
                  class_name: 'sub-layer',
                  source: `${frequencyData.dataset}-title `
                };
                resultObject = [...resultObject, data];
              }
            }
            currentLayer1 = frequencyData.layer1;
          }

          resultObject = [...resultObject, frequencyData];
        }
      })

      // 結果をレンダリング
      this.renderTemplate({
        template: "stanza.html.hbs",
        parameters: {
          params: this.params,
          result: { resultObject }
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

          const layer2 = this.root.querySelectorAll('[data-dataset="JGA-SNP"].population.layer2');
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
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.layer1}"].population.layer2`
          );
          layer2.forEach((element) => {
            element.parentElement.classList.toggle('show-by-sub');
          });

          // Male, Female
          const layer3 = this.root.querySelectorAll(
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.layer1}"].population.layer3`
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
            `[data-dataset="JGA-SNP"][data-layer1="${layer.dataset.layer1}"][data-layer2="${layer.dataset.layer2}"].population.layer3`
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
