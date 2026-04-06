import fs from "fs";
import path from "path";
import ts from "typescript";

// スタンザ内で拡張子なし import が書かれたときに、
// 補完候補として確認する一般的なスクリプト拡張子。
const scriptExtensions = [".ts", ".tsx", ".js", ".mjs"];

// transpileModule は出力コード末尾にインライン source map コメントを
// 付けることがある。Rollup には map を別で返すため、このフッターは削除する。
const stripSourceMapComment = (code) => {
  return code.replace(
    /\n\/\/# sourceMappingURL=data:application\/json[^]*$/u,
    "",
  );
};

// "./foo" のような拡張子なしパスを "./foo.ts" / "./foo.tsx" / "./foo.js" /
// "./foo.mjs" や "./foo/index.*" に解決し、TS と JS が混在していても
// 相対 import がそのまま動くようにする。
const resolveWithExtension = (targetPath) => {
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }

  for (const extension of scriptExtensions) {
    const candidate = `${targetPath}${extension}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  for (const extension of scriptExtensions) {
    const candidate = path.join(targetPath, `index${extension}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
};

// このリポジトリでは Togostanza 標準の TypeScript 処理だけでは
// .ts が安定して変換されないため、Rollup プラグインとして補完する。
// 役割は次の2つ:
// - 相対 import を TS/JS ファイルへ解決する
// - .ts / .tsx を TypeScript の transpileModule で ESM に変換する
// なお型チェックはここでは行わず、`tsc --noEmit` に任せる。
const tsFallbackPlugin = () => {
  return {
    name: "ts-fallback-transpile",

    resolveId(source, importer) {
      // 相対パス・絶対パスのローカル import のみを補完対象にする。
      // "d3" のような bare import は通常の Rollup 解決に任せる。
      if (!importer || !/^(?:\.{1,2}\/|\/)/.test(source)) {
        return null;
      }

      const resolved = resolveWithExtension(
        path.resolve(path.dirname(importer), source),
      );
      return resolved;
    },

    transform(code, id) {
      // JS ファイルと node_modules 配下はこのプラグインでは触らない。
      if (!/\.tsx?$/u.test(id) || id.includes("/node_modules/")) {
        return null;
      }

      // ここで必要なのは「Rollup が読める JS を返すこと」なので、
      // 型解決を伴う完全コンパイルではなく単一ファイル変換で十分。
      const result = ts.transpileModule(code, {
        fileName: id,
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          jsx: ts.JsxEmit.Preserve,
          sourceMap: true,
          inlineSources: true,
          esModuleInterop: true,
        },
      });

      return {
        code: stripSourceMapComment(result.outputText),
        map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  };
};

export default function initConfig() {
  // Togostanza はこのファイルを自動で読み込み、
  // 返された plugins をスタンザビルド時の Rollup パイプラインに追加する。
  return {
    rollup: {
      plugins: [tsFallbackPlugin()],
    },
  };
}
