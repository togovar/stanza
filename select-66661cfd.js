import { S as Selection, r as root } from './transform-64d6d8bf.js';

function select(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
}

export { select as s };
//# sourceMappingURL=select-66661cfd.js.map
