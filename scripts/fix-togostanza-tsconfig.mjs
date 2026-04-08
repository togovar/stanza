import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(
  scriptDir,
  "../node_modules/togostanza/tsconfig.json"
);

const deprecatedPatterns = [
  /"moduleResolution"\s*:\s*"node10"/,
  /"moduleResolution"\s*:\s*"node"/,
];

async function main() {
  try {
    await access(targetPath);
  } catch {
    process.stderr.write(
      `[fix-togostanza-tsconfig] Skipped: ${targetPath} was not found.\n`
    );
    process.exit(0);
  }

  const original = await readFile(targetPath, "utf8");

  if (original.includes('"moduleResolution": "bundler"')) {
    process.stdout.write("[fix-togostanza-tsconfig] Already up to date.\n");
    process.exit(0);
  }

  let updated = original;

  for (const pattern of deprecatedPatterns) {
    updated = updated.replace(pattern, '"moduleResolution": "bundler"');
  }

  if (updated === original) {
    process.stderr.write(
      "[fix-togostanza-tsconfig] Skipped: moduleResolution setting was not found.\n"
    );
    process.exit(0);
  }

  await writeFile(targetPath, updated);
  process.stdout.write("[fix-togostanza-tsconfig] Updated togostanza tsconfig.\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
