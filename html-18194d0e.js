const HTML_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
/**
 * HTML特殊文字をエスケープする。
 * APIレスポンスの文字列をテンプレートへ生HTML（`{{{...}}}`）として渡す前に使う。
 * gene-mgend / variant-mgend など、疾患名を含むHTML文字列を組み立てるstanzaで共有する。
 */
const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);

export { escapeHtml as e };
//# sourceMappingURL=html-18194d0e.js.map
