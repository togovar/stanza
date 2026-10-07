// ステージング向けビルドをローカルで再現して配信する。
// metadata.json の stanza:example などは本番URLのまま書く運用のため、
// .github/workflows/publish.yml と同じく dist 内の本番URLをステージングURLへ置換してから配信する。
// ステージングのホスト名は公開しない方針なので、リポジトリには書かず環境変数か .env.local から読む。
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
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

const resolveStagingOrigin = () => {
  const origin = (process.env[ORIGIN_ENV_KEY] || readEnvLocal(ORIGIN_ENV_KEY) || "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+$/.test(origin)) {
    console.error(
      `${ORIGIN_ENV_KEY} にステージングのオリジン(例: https://<staging-host>)を指定してください。\n` +
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
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
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

const serveDist = (port) => {
  createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      // 不正なパーセントエンコーディング(例: /%E0)でサーバーごと落ちないようにする
      res.writeHead(400).end("Bad Request");
      return;
    }
    const filePath = path.join(DIST_DIR, decodedPath);
    // dist の外を読ませない
    if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const target = (await stat(filePath).catch(() => null))?.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;
    if (!existsSync(target)) {
      res.writeHead(404).end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(target)] || "application/octet-stream",
    });
    createReadStream(target)
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
