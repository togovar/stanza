export const rowSpanize = table => {
  if (!table) {
    return;
  }

  let arr = [];

  table.querySelectorAll("tr").forEach((tr) => {
    tr.querySelectorAll("td").forEach((td, i) => {
      let td_html = td.innerHTML;
      if (typeof arr[i] != "undefined" && "html" in arr[i] && arr[i].html === td_html) {
        let rs = parseInt(arr[i].elem.getAttribute("data-rowspan")) || 1;
        arr[i].elem.setAttribute("data-rowspan", rs + 1);
        arr[i].elem.classList.add("rowspan-combine");
        td.classList.add("rowspan-remove");
      } else {
        arr[i] = {html: td_html, elem: td};
      }
    });
  });

  table.querySelectorAll(".rowspan-combine").forEach((tr) => {
    tr.setAttribute("rowspan", tr.getAttribute("data-rowspan"));
    tr.removeAttribute("data-rowspan");
  });

  table.querySelectorAll(".rowspan-remove").forEach((td) => {
    td.parentNode.removeChild(td);
  });
};
