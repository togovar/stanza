import Stanza from "togostanza/stanza";

// import {DATASETS} from "@/lib/constants";
import { DATASETS } from "@/lib/constantsTest";
import { frequency } from "@/lib/display";
// import { sortBy } from "@/lib/sort";
import sparqlistTest from "@/stanzas/variant-frequency/assets/sparqlist.json";

export default class VariantSummary extends Stanza {
  async render() {
    // font: Roboto Condensed
    this.importWebFontCSS("https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,700,900");
    // database icon
    this.importWebFontCSS(new URL("./assets/fontello.css", import.meta.url));

    // const assembly = this.params.assembly;
    const { sparqlist: sparqlistBase = "/sparqlist", tgv_id } = this.params;
    const sparqlist = `${sparqlistBase}/api/variant_frequency?tgv_id=${tgv_id}`;
    let resultObject = [];
    let currentLayer1;

    try {
      // sparqlist URL に GET リクエストを送信
      const response = await fetch(sparqlist, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      // レスポンスのステータスをチェック
      if (!response.ok) {
        throw new Error(`${sparqlist} returns status ${response.status}`);
      }

      // レスポンスを JSON 形式でパース
      // const sparqlistDatasets = await response.json();
      const sparqlistDatasets = sparqlistTest;
      const datasets = Object.values(DATASETS);

      // バインディングを処理
      sparqlistDatasets.forEach(sparqlistData => {
        const dataset = datasets.find(x => x.id === sparqlistData.source);

        const ac = parseInt(sparqlistData.ac);
        const freq = parseFloat(sparqlistData.af);

        // 数値をロケール形式の文字列に変換する関数
        const localeString = (v) => v ? parseInt(v).toLocaleString() : null;

        // バインディングにデータセット情報を追加
        sparqlistData.dataset = dataset.source;
        // sparqlistData.dataset = dataset?.dataset(assembly);
        sparqlistData.layer1 = dataset.layer1;
        sparqlistData.layer2 = dataset.layer2;
        sparqlistData.layer3 = dataset.layer3;
        sparqlistData.ac = localeString(sparqlistData.ac);
        sparqlistData.an = localeString(sparqlistData.an);
        sparqlistData.aac = localeString(sparqlistData.aac);
        sparqlistData.arc = localeString(sparqlistData.arc);
        sparqlistData.rrc = localeString(sparqlistData.rrc);

        // frequencyの情報をバインディングに追加
        Object.assign(sparqlistData, frequency(ac, freq));

        // 開閉を行うtoggleを作成するため、クラスを設定
        let className = 'layer-none';
        if (sparqlistData.layer1 === 'Total') {
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
          ].includes(sparqlistData.source)
        ) {
          if (!sparqlistData.layer2) {
            className = 'layer1-nonchild';
          } else {
            className = 'layer2';

            if (sparqlistData.dataset !== 'JGA-SNP') {
              className = 'layer2-nonchild';
            }
            if (sparqlistData.layer3) {
              className = 'layer3';
            }
          }
          if (sparqlistData.source === 'ncbn.jpn') {
            className = 'layer1-haschild';
          }
        }
        sparqlistData.class_name = className

        // クラス名によって表示するlayerの変更
        let label = ""
        switch (className) {
          case "layer-none":
          case "layer-total":
          case "sub-layer":
          case "layer1-haschild":
          case "layer1-nonchild":
            label = sparqlistData.layer1
            break;
          case 'layer2':
          case 'layer2-nonchild':
            label = sparqlistData.layer2
            break;
          case 'layer3':
            label = sparqlistData.layer3
            break;
          default:
            break;
        }
        sparqlistData.label = label


        // JGA-SNPの場合 見出しのdataがないため追加
        if (sparqlistData.dataset === 'JGA-SNP') {
          if (currentLayer1 !== sparqlistData.layer1) {
            if (sparqlistData.layer1 !== 'Total') {
              let data = {
                dataset: sparqlistData.dataset,
                label: sparqlistData.layer1,
                layer1: sparqlistData.layer1,
                class_name: 'sub-layer',
                source: `${sparqlistData.dataset}-title `
              };
              resultObject = [...resultObject, data];
            }
          }
          currentLayer1 = sparqlistData.layer1;
        }

        resultObject = [...resultObject, sparqlistData];
      })

      // バインディングをソースのインデックス順にソート
      // sortBy(sparqlistDatasets, x => datasets.find(y => y.source === x.source)?.idx);

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
