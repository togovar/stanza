const rowSpanize = (table) => {
  if (!table) {
    return;
  }

  let lastSeenCells = [];
  processCellsForRowspan(table, lastSeenCells);
  applyRowspanAttributes(table);
  markCellsExtendingToLastRow(table);
  removeExtraCells(table);
};

function processCellsForRowspan(table, lastSeenCells) {
  table.querySelectorAll("tr").forEach((tr) => {
    tr.querySelectorAll("td").forEach((td, columnIndex) => {
      const currentHtml = td.innerHTML;
      if (shouldCombine(lastSeenCells, columnIndex, currentHtml, td)) {
        const newRowspan =
          getCurrentRowspan(lastSeenCells[columnIndex].elem) + 1;
        lastSeenCells[columnIndex].elem.setAttribute(
          "data-rowspan",
          newRowspan
        );
        lastSeenCells[columnIndex].elem.classList.add("rowspan-combine");
        td.classList.add("rowspan-remove");
      } else {
        lastSeenCells[columnIndex] = { html: currentHtml, elem: td };
      }
    });
  });
}

function shouldCombine(lastSeenCells, index, html, td) {
  return (
    typeof lastSeenCells[index] !== "undefined" &&
    lastSeenCells[index].html === html &&
    !td.classList.contains("clinical-significance-col") &&
    !td.classList.contains("rowspan-ignore")
  );
}

function getCurrentRowspan(element) {
  return parseInt(element.getAttribute("data-rowspan")) || 1;
}

function applyRowspanAttributes(table) {
  table.querySelectorAll(".rowspan-combine").forEach((tr) => {
    tr.setAttribute("rowspan", tr.getAttribute("data-rowspan"));
    tr.removeAttribute("data-rowspan");
  });
}

// 最後の行まで達しているrowspanセルにクラスを追加
function markCellsExtendingToLastRow(table) {
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const lastRowIndex = rows.length - 1;

  rows.forEach((row, rowIndex) => {
    row.querySelectorAll("td[rowspan]").forEach((td) => {
      const rowspan = parseInt(td.getAttribute("rowspan") || "1", 10);
      const lastCoveredRowIndex = rowIndex + rowspan - 1;

      // このセルが最後の行まで達している場合
      if (lastCoveredRowIndex >= lastRowIndex) {
        td.classList.add("extends-to-last-row");
      }
    });
  });
}

function removeExtraCells(table) {
  table.querySelectorAll(".rowspan-remove").forEach((td) => {
    td.parentNode.removeChild(td);
  });
}

export { rowSpanize as r };
//# sourceMappingURL=table-1f1dea97.js.map
