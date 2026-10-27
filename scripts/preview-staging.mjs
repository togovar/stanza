// ステージング向けビルドをローカルで再現して配信する。
// metadata.json の stanza:example などは本番URLのまま書く運用のため、
// .github/workflows/publish.yml と同じく dist 内の本番URLをステージングURLへ置換してから配信する。
// ステージングのホスト名は公開しない方針なので、リポジトリには書かず環境変数か .env.local から読む。
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, realpathSync } from "node:fs";
import { readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const PRODUCTION_ORIGIN = "https://grch38.togovar.org";
const ORIGIN_ENV_KEY = "TOGOVAR_STAGING_ORIGIN";
const DIST_DIR = path.resolve("dist");
// publish.yml の置換対象と同じ拡張子に限定する
const REWRITE_EXTENSIONS = new Set([".html", ".js", ".json"]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

// 依存を増やさないため、KEY=VALUE 形式だけを読む最小限のパーサーにしている
const readEnvLocal = (key) => {
  if (!existsSync(".env.local")) {
    return undefined;
  }
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
};

// 置換後に "<origin>/api/..." の形になるため、パス・クエリ・フラグメント・認証情報を含まない http/https のオリジンだけを受け付ける
const parseOrigin = (value) => {
  try {
    const url = new URL(value);
    const isOriginOnly =
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash;
    return isOriginOnly ? url.origin : undefined;
  } catch {
    return undefined;
  }
};

const resolveStagingOrigin = () => {
  const value = (process.env[ORIGIN_ENV_KEY] || readEnvLocal(ORIGIN_ENV_KEY) || "").replace(/\/+$/, "");
  const origin = parseOrigin(value);
  if (!origin) {
    console.error(
      `${ORIGIN_ENV_KEY} にステージングのオリジン(例: https://<staging-host>)を指定してください。\n` +
        "パス・クエリ(?)・フラグメント(#)・ユーザー名/パスワードは含めないでください。\n" +
        "環境変数で渡すか、.env.local に記述します(.env.local はGit管理外)。",
    );
    process.exit(1);
  }
  return origin;
};

const listFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      // シンボリックリンクは対象外にし、置換で dist の外のファイルを読み書きしないようにする
      return entry.isFile() ? [fullPath] : [];
    }),
  );
  return nested.flat();
};

const rewriteDist = async (stagingOrigin) => {
  const files = (await listFiles(DIST_DIR)).filter((file) =>
    REWRITE_EXTENSIONS.has(path.extname(file)),
  );
  let rewrittenCount = 0;
  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf8");
      if (content.includes(PRODUCTION_ORIGIN)) {
        await writeFile(file, content.split(PRODUCTION_ORIGIN).join(stagingOrigin));
        rewrittenCount += 1;
      }
    }),
  );
  return rewrittenCount;
};

const isInside = (filePath, dir) => filePath === dir || filePath.startsWith(dir + path.sep);

const serveDist = (port) => {
  const realDistDir = realpathSync(DIST_DIR);
  createServer(async (req, res) => {
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      // 不正なリクエストURL(例: http://[bad)やパーセントエンコーディング(例: /%E0)でサーバーごと落ちないようにする
      res.writeHead(400).end("Bad Request");
      return;
    }
    const filePath = path.join(DIST_DIR, decodedPath);
    // dist の外を読ませない
    if (!isInside(filePath, DIST_DIR)) {
      res.writeHead(403).end();
      return;
    }
    const target = (await stat(filePath).catch(() => null))?.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;
    // シンボリックリンクを解決した実体パスでも dist の中にあることを確認する
    const realTarget = await realpath(target).catch(() => null);
    if (!realTarget) {
      res.writeHead(404).end("Not Found");
      return;
    }
    if (!isInside(realTarget, realDistDir)) {
      res.writeHead(403).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(realTarget)] || "application/octet-stream",
    });
    createReadStream(realTarget)
      .on("error", () => res.destroy())
      .pipe(res);
  })
    .on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `ポート ${port} は使用中です。PORT=<番号> を環境変数か .env.local で指定してください。`,
        );
        process.exit(1);
      }
      throw error;
    })
    // ステージングURLを含むビルドを同一ネットワークの他端末へ公開しないよう、ループバックのみで待ち受ける
    .listen(port, "127.0.0.1", () => {
      console.warn(`ステージング向けビルドを配信中: http://localhost:${port}/`);
    });
};

// リポジトリのESLint設定(ecmaVersion 2020)はトップレベルawaitを解析できないため、async関数で包む
const main = async () => {
  const stagingOrigin = resolveStagingOrigin();

  const build = spawnSync("npx", ["togostanza", "build"], { stdio: "inherit" });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  const rewrittenCount = await rewriteDist(stagingOrigin);
  console.warn(`${PRODUCTION_ORIGIN} をステージングURLへ置換しました(${rewrittenCount}ファイル)`);

  serveDist(Number(process.env.PORT || readEnvLocal("PORT")) || 8081);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
