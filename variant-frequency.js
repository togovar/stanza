import { S as Stanza, d as defineStanzaElement } from './stanza-33919c9f.js';
import { D as DATASETS } from './constants-f43484af.js';
import { f as frequency } from './display-8f29f2e3.js';

function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

function node_count() {
  return this.eachAfter(count);
}

function node_each(callback, that) {
  let index = -1;
  for (const node of this) {
    callback.call(that, node, ++index, this);
  }
  return this;
}

function node_eachBefore(callback, that) {
  var node = this, nodes = [node], children, i, index = -1;
  while (node = nodes.pop()) {
    callback.call(that, node, ++index, this);
    if (children = node.children) {
      for (i = children.length - 1; i >= 0; --i) {
        nodes.push(children[i]);
      }
    }
  }
  return this;
}

function node_eachAfter(callback, that) {
  var node = this, nodes = [node], next = [], children, i, n, index = -1;
  while (node = nodes.pop()) {
    next.push(node);
    if (children = node.children) {
      for (i = 0, n = children.length; i < n; ++i) {
        nodes.push(children[i]);
      }
    }
  }
  while (node = next.pop()) {
    callback.call(that, node, ++index, this);
  }
  return this;
}

function node_find(callback, that) {
  let index = -1;
  for (const node of this) {
    if (callback.call(that, node, ++index, this)) {
      return node;
    }
  }
}

function node_sum(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
}

function node_sort(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
}

function node_path(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
  }
  var k = nodes.length;
  while (end !== ancestor) {
    nodes.splice(k, 0, end);
    end = end.parent;
  }
  return nodes;
}

function leastCommonAncestor(a, b) {
  if (a === b) return a;
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}

function node_ancestors() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
}

function node_descendants() {
  return Array.from(this);
}

function node_leaves() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
}

function node_links() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
}

function* node_iterator() {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      yield node;
      if (children = node.children) {
        for (i = 0, n = children.length; i < n; ++i) {
          next.push(children[i]);
        }
      }
    }
  } while (next.length);
}

function hierarchy(data, children) {
  if (data instanceof Map) {
    data = [undefined, data];
    if (children === undefined) children = mapChildren;
  } else if (children === undefined) {
    children = objectChildren;
  }

  var root = new Node(data),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  while (node = nodes.pop()) {
    if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
      node.children = childs;
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = childs[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
}

function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}

function objectChildren(d) {
  return d.children;
}

function mapChildren(d) {
  return Array.isArray(d) ? d[1] : null;
}

function copyData(node) {
  if (node.data.value !== undefined) node.value = node.data.value;
  node.data = node.data.data;
}

function computeHeight(node) {
  var height = 0;
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  find: node_find,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy,
  [Symbol.iterator]: node_iterator
};

class VariantSummary extends Stanza {
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
    });
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
      const frequenciesDatasets = responseDatasets.data[0]?.frequencies;

      /** Searches for and processes data, updating frequency datasets and result objects.
      * @param {Object} datum - The current dataset object being processed. */
      const searchData = (datum) => {
        // 一致するデータを探す
        const frequencyData = frequenciesDatasets?.find(x => x.source === datum.value);
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
            frequencyData.dataset = findTopParent(preparedDatasets, datum.id).label;
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
      ({ error: { message: e.message } });
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
      const data = DATASETS;
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
    }
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
          );
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

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': VariantSummary
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "variant-frequency",
	"stanza:label": "Variant / Frequency",
	"stanza:definition": "Display alternative allele frequencies of the variant",
	"stanza:type": "Stanza",
	"stanza:display": "Table",
	"stanza:provider": "TogoVar",
	"stanza:license": "MIT",
	"stanza:author": "Daisuke Satoh",
	"stanza:address": "daisuke.satoh@lifematics.co.jp",
	"stanza:contributor": [
],
	"stanza:created": "2019-04-22",
	"stanza:updated": "2022-04-15",
	"stanza:parameter": [
	{
		"stanza:key": "tgv_id",
		"stanza:example": "tgv66359566",
		"stanza:description": "TogoVar ID",
		"stanza:required": true
	},
	{
		"stanza:key": "assembly",
		"stanza:example": "GRCh38",
		"stanza:description": "assembly: \"GRCh37\" or \"GRCh38\"",
		"stanza:required": true
	},
	{
		"stanza:key": "data-url",
		"stanza:example": "https://stg-grch38.togovar.org",
		"stanza:description": "URL",
		"stanza:required": true
	},
	{
		"stanza:key": "no_data_message",
		"stanza:example": "No data found.",
		"stanza:description": "Message displayed when there are zero data"
	}
],
	"stanza:about-link-placement": "bottom-right",
	"stanza:style": [
	{
		"stanza:key": "--togostanza-canvas-height",
		"stanza:type": "number",
		"stanza:default": 251,
		"stanza:description": "Canvas height"
	}
]
};

var templates = [
  ["stanza.html.hbs", {"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class='alert alert-danger'>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":34},"end":{"line":2,"column":45}}}) : helper)))
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"result") : depth0),{"name":"with","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":2},"end":{"line":109,"column":11}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <table class='table frequency-detail'>\n      <thead>\n        <tr>\n          <th rowspan='2'>Dataset</th>\n          <th rowspan='2'>Population</th>\n          <th colspan='4'>Allele count</th>\n          <th colspan='"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depths[1] != null ? lookupProperty(depths[1],"hasHemizygote") : depths[1]),{"name":"if","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.program(7, data, 0, blockParams, depths),"data":data,"loc":{"start":{"line":11,"column":23},"end":{"line":11,"column":64}}})) != null ? stack1 : "")
    + "'>Genotype count</th>\n          <th class='filter_status' rowspan='2'>Filter status</th>\n          <th rowspan='2'>Quality score</th>\n        </tr>\n        <tr>\n          <th class='alt num-th'>Alt</th>\n          <th class='num-th'>Total</th>\n          <th class='frequency num-th'>Frequency</th>\n          <th></th>\n          <th class='num_genotype_alt_homo alt num-th'>Alt / Alt</th>\n          <th class='num_genotype_hetero num-th'>Alt / Ref</th>\n          <th class='num_genotype_alt_otheralts num-th'>Alt/OtherAlts</th>\n          <th class='num_genotype_ref_homo num-th'>Ref / Ref</th>\n          <th class='num_genotype_ref_otheralts num-th'>Ref/OtherAlts</th>\n          <th class='num_genotype_otheralts_otheralts num-th'>Other_Alts/Other_Alts</th>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depths[1] != null ? lookupProperty(depths[1],"hasHemizygote") : depths[1]),{"name":"if","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":26,"column":10},"end":{"line":30,"column":17}}})) != null ? stack1 : "")
    + "        </tr>\n      </thead>\n\n      <tbody>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"resultObject") : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0, blockParams, depths),"inverse":container.program(23, data, 0, blockParams, depths),"data":data,"loc":{"start":{"line":35,"column":8},"end":{"line":106,"column":15}}})) != null ? stack1 : "")
    + "      </tbody>\n    </table>\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "9";
},"7":function(container,depth0,helpers,partials,data) {
    return "6";
},"9":function(container,depth0,helpers,partials,data) {
    return "            <th class='num_genotype_hemi_alt num-th'>Hemi_Alt</th>\n            <th class='num_genotype_hemi_ref num-th'>Hemi_Ref</th>\n            <th class='num_genotype_hemi_otheralts num-th'>Hemi_Other_Alts</th>\n";
},"11":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"resultObject") : depth0),{"name":"each","hash":{},"fn":container.program(12, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":36,"column":10},"end":{"line":103,"column":19}}})) != null ? stack1 : "");
},"12":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <tr data-depth='"
    + alias4(((helper = (helper = lookupProperty(helpers,"depth") || (depth0 != null ? lookupProperty(depth0,"depth") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"depth","hash":{},"data":data,"loc":{"start":{"line":37,"column":28},"end":{"line":37,"column":37}}}) : helper)))
    + "'>\n              <td\n                class='dataset'\n                data-depth='"
    + alias4(((helper = (helper = lookupProperty(helpers,"depth") || (depth0 != null ? lookupProperty(depth0,"depth") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"depth","hash":{},"data":data,"loc":{"start":{"line":40,"column":28},"end":{"line":40,"column":37}}}) : helper)))
    + "'\n                data-has-child='"
    + alias4(((helper = (helper = lookupProperty(helpers,"has_child") || (depth0 != null ? lookupProperty(depth0,"has_child") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"has_child","hash":{},"data":data,"loc":{"start":{"line":41,"column":32},"end":{"line":41,"column":45}}}) : helper)))
    + "'\n              >\n                <div\n                  class='dataset-icon'\n                  data-dataset='"
    + alias4(((helper = (helper = lookupProperty(helpers,"source") || (depth0 != null ? lookupProperty(depth0,"source") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"source","hash":{},"data":data,"loc":{"start":{"line":45,"column":32},"end":{"line":45,"column":42}}}) : helper)))
    + "'\n                >\n                </div>\n                  "
    + alias4(((helper = (helper = lookupProperty(helpers,"dataset") || (depth0 != null ? lookupProperty(depth0,"dataset") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dataset","hash":{},"data":data,"loc":{"start":{"line":48,"column":18},"end":{"line":48,"column":29}}}) : helper)))
    + "\n              </td>\n              <td\n                class='population'\n                data-dataset='"
    + alias4(((helper = (helper = lookupProperty(helpers,"dataset") || (depth0 != null ? lookupProperty(depth0,"dataset") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dataset","hash":{},"data":data,"loc":{"start":{"line":52,"column":30},"end":{"line":52,"column":41}}}) : helper)))
    + "'\n                data-id='"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":53,"column":25},"end":{"line":53,"column":31}}}) : helper)))
    + "'\n                data-parent-id='"
    + alias4(((helper = (helper = lookupProperty(helpers,"parent_id") || (depth0 != null ? lookupProperty(depth0,"parent_id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"parent_id","hash":{},"data":data,"loc":{"start":{"line":54,"column":32},"end":{"line":54,"column":45}}}) : helper)))
    + "'\n                data-grandparent-id='"
    + alias4(((helper = (helper = lookupProperty(helpers,"grandparent_id") || (depth0 != null ? lookupProperty(depth0,"grandparent_id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"grandparent_id","hash":{},"data":data,"loc":{"start":{"line":55,"column":37},"end":{"line":55,"column":55}}}) : helper)))
    + "'\n                data-depth='"
    + alias4(((helper = (helper = lookupProperty(helpers,"depth") || (depth0 != null ? lookupProperty(depth0,"depth") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"depth","hash":{},"data":data,"loc":{"start":{"line":56,"column":28},"end":{"line":56,"column":37}}}) : helper)))
    + "'\n                data-has-child='"
    + alias4(((helper = (helper = lookupProperty(helpers,"has_child") || (depth0 != null ? lookupProperty(depth0,"has_child") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"has_child","hash":{},"data":data,"loc":{"start":{"line":57,"column":32},"end":{"line":57,"column":45}}}) : helper)))
    + "'\n              >\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"need_loading") : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":59,"column":14},"end":{"line":61,"column":21}}})) != null ? stack1 : "")
    + "                "
    + alias4(((helper = (helper = lookupProperty(helpers,"label") || (depth0 != null ? lookupProperty(depth0,"label") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"label","hash":{},"data":data,"loc":{"start":{"line":62,"column":16},"end":{"line":62,"column":25}}}) : helper)))
    + "\n              </td>\n              <td class='num_alt_alleles'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"ac") || (depth0 != null ? lookupProperty(depth0,"ac") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ac","hash":{},"data":data,"loc":{"start":{"line":64,"column":42},"end":{"line":64,"column":48}}}) : helper)))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"ac") : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":65,"column":16},"end":{"line":69,"column":23}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"need_loading") : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":70,"column":16},"end":{"line":74,"column":23}}})) != null ? stack1 : "")
    + "              </td>\n              <td class='num_alleles'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"an") || (depth0 != null ? lookupProperty(depth0,"an") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"an","hash":{},"data":data,"loc":{"start":{"line":76,"column":38},"end":{"line":76,"column":44}}}) : helper)))
    + "</td>\n              <td class='frequency'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"frequency") || (depth0 != null ? lookupProperty(depth0,"frequency") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data,"loc":{"start":{"line":77,"column":36},"end":{"line":77,"column":49}}}) : helper)))
    + "</td>\n              <td class='frequency-graph'>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"level") : depth0),{"name":"if","hash":{},"fn":container.program(19, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":79,"column":16},"end":{"line":87,"column":23}}})) != null ? stack1 : "")
    + "              </td>\n              <td class='num_genotype_alt_homo num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"aac") || (depth0 != null ? lookupProperty(depth0,"aac") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"aac","hash":{},"data":data,"loc":{"start":{"line":89,"column":55},"end":{"line":89,"column":62}}}) : helper)))
    + "</td>\n              <td class='num_genotype_hetero num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"arc") || (depth0 != null ? lookupProperty(depth0,"arc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"arc","hash":{},"data":data,"loc":{"start":{"line":90,"column":53},"end":{"line":90,"column":60}}}) : helper)))
    + "</td>\n              <td class='num_genotype_alt_otheralts num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"aoc") || (depth0 != null ? lookupProperty(depth0,"aoc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"aoc","hash":{},"data":data,"loc":{"start":{"line":91,"column":60},"end":{"line":91,"column":67}}}) : helper)))
    + "</td>\n              <td class='num_genotype_ref_homo num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"rrc") || (depth0 != null ? lookupProperty(depth0,"rrc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"rrc","hash":{},"data":data,"loc":{"start":{"line":92,"column":55},"end":{"line":92,"column":62}}}) : helper)))
    + "</td>\n              <td class='num_genotype_ref_otheralts num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"roc") || (depth0 != null ? lookupProperty(depth0,"roc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"roc","hash":{},"data":data,"loc":{"start":{"line":93,"column":60},"end":{"line":93,"column":67}}}) : helper)))
    + "</td>\n              <td class='num_genotype_otheralts_otheralts num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"ooc") || (depth0 != null ? lookupProperty(depth0,"ooc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"ooc","hash":{},"data":data,"loc":{"start":{"line":94,"column":66},"end":{"line":94,"column":73}}}) : helper)))
    + "</td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depths[2] != null ? lookupProperty(depths[2],"hasHemizygote") : depths[2]),{"name":"if","hash":{},"fn":container.program(21, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":95,"column":14},"end":{"line":99,"column":21}}})) != null ? stack1 : "")
    + "              <td class='filter' data-filter='"
    + alias4(((helper = (helper = lookupProperty(helpers,"filter") || (depth0 != null ? lookupProperty(depth0,"filter") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"filter","hash":{},"data":data,"loc":{"start":{"line":100,"column":46},"end":{"line":100,"column":56}}}) : helper)))
    + "'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"filter") || (depth0 != null ? lookupProperty(depth0,"filter") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"filter","hash":{},"data":data,"loc":{"start":{"line":100,"column":58},"end":{"line":100,"column":68}}}) : helper)))
    + "</td>\n              <td class='quality'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"quality") || (depth0 != null ? lookupProperty(depth0,"quality") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"quality","hash":{},"data":data,"loc":{"start":{"line":101,"column":34},"end":{"line":101,"column":45}}}) : helper)))
    + "</td>\n            </tr>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "                <span class=\"lock\"></span>\n";
},"15":function(container,depth0,helpers,partials,data) {
    return "                  <span class='slash'>\n                    /\n                  </span>\n";
},"17":function(container,depth0,helpers,partials,data) {
    return "                  <span class='comment'>\n                    <a href=\"/auth/login\">Login</a> to view allele and genotype counts\n                  </span>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                  <div class='allele-frequency-graph'>\n                    <span\n                      class='dataset'\n                      data-frequency='"
    + alias4(((helper = (helper = lookupProperty(helpers,"level") || (depth0 != null ? lookupProperty(depth0,"level") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"level","hash":{},"data":data,"loc":{"start":{"line":83,"column":38},"end":{"line":83,"column":47}}}) : helper)))
    + "'\n                      data-dataset='"
    + alias4(((helper = (helper = lookupProperty(helpers,"dataset") || (depth0 != null ? lookupProperty(depth0,"dataset") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dataset","hash":{},"data":data,"loc":{"start":{"line":84,"column":36},"end":{"line":84,"column":47}}}) : helper)))
    + "'\n                    ></span>\n                  </div>\n";
},"21":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <td class='num_genotype_hemi_alt num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hemi_alt") || (depth0 != null ? lookupProperty(depth0,"hemi_alt") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hemi_alt","hash":{},"data":data,"loc":{"start":{"line":96,"column":57},"end":{"line":96,"column":69}}}) : helper)))
    + "</td>\n                <td class='num_genotype_hemi_ref num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hemi_ref") || (depth0 != null ? lookupProperty(depth0,"hemi_ref") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hemi_ref","hash":{},"data":data,"loc":{"start":{"line":97,"column":57},"end":{"line":97,"column":69}}}) : helper)))
    + "</td>\n                <td class='num_genotype_hemi_otheralts num-td'>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hemi_others") || (depth0 != null ? lookupProperty(depth0,"hemi_others") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hemi_others","hash":{},"data":data,"loc":{"start":{"line":98,"column":63},"end":{"line":98,"column":78}}}) : helper)))
    + "</td>\n";
},"23":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          <tr><td colspan=\"11\" class=\"nodata-message\">"
    + container.escapeExpression(container.lambda(((stack1 = (depths[1] != null ? lookupProperty(depths[1],"params") : depths[1])) != null ? lookupProperty(stack1,"no_data_message") : stack1), depth0))
    + "</td></tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"with").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.program(3, data, 0, blockParams, depths),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":110,"column":9}}})) != null ? stack1 : "");
},"useData":true,"useDepths":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=variant-frequency.js.map
