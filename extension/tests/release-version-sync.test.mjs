import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

async function readRepoText(...relativePath) {
  return readFile(path.join(repoRoot, ...relativePath), "utf8");
}

async function readRepoJson(...relativePath) {
  return JSON.parse(await readRepoText(...relativePath));
}

test("frontend package and extension manifest use the extension package version", async () => {
  const frontendPackage = await readRepoJson("frontend", "package.json");
  const extensionPackage = await readRepoJson("extension", "package.json");
  const wxtConfigSource = await readRepoText("extension", "wxt.config.ts");

  assert.equal(frontendPackage.version, extensionPackage.version);
  assert.match(
    wxtConfigSource,
    /import\s+packageJson\s+from\s+["']\.\/package\.json["']/,
    "expected WXT to read the extension package version",
  );
  assert.match(wxtConfigSource, /version:\s*packageJson\.version/);
  assert.doesNotMatch(wxtConfigSource, /version:\s*["']/);
});

test("README store metadata matches the current package version", async () => {
  const extensionPackage = await readRepoJson("extension", "package.json");
  const readme = await readRepoText("README.md");

  assert.match(
    readme,
    new RegExp(
      `bilishelf-store-version:\\s*edge=${extensionPackage.version};\\s*firefox=${extensionPackage.version}`,
      "i",
    ),
  );
});

test("update checks use README stores and the GitHub latest release API", async () => {
  const backgroundSource = await readRepoText(
    "extension",
    "entrypoints",
    "background.ts",
  );

  assert.match(
    backgroundSource,
    /raw\.githubusercontent\.com\/TLRKFXE\/BiliShelf\/main\/README\.md/,
  );
  assert.match(
    backgroundSource,
    /cdn\.jsdelivr\.net\/gh\/TLRKFXE\/BiliShelf@main\/README\.md/,
  );
  assert.match(
    backgroundSource,
    /gh-proxy\.com\/https:\/\/api\.github\.com\/repos\/TLRKFXE\/BiliShelf\/releases\/latest/,
  );
  assert.match(
    backgroundSource,
    /api\.github\.com\/repos\/TLRKFXE\/BiliShelf\/releases\/latest/,
  );
  assert.match(
    backgroundSource,
    /github\.com\/TLRKFXE\/BiliShelf\/releases\.atom/,
  );
  assert.match(backgroundSource, /tag_name/);
  assert.match(
    backgroundSource,
    /cdn\.jsdelivr\.net\/gh\/TLRKFXE\/BiliShelf@latest\/extension\/package\.json/,
  );
  assert.doesNotMatch(backgroundSource, /0\.1\.5/);
});

test("about page makes the sponsor name interactive with a heart burst", async () => {
  const source = await readRepoText(
    "frontend",
    "src",
    "components",
    "dialogs",
    "AiSettingsDialog.vue",
  );

  assert.match(source, /celebrateSponsor/);
  assert.match(source, /sponsor-heart/);
  assert.match(source, /💖/u);
});

test("release packaging script does not hardcode the initial extension version", async () => {
  const prepareReleaseSource = await readRepoText(
    "extension",
    "scripts",
    "prepare-release.mjs",
  );

  assert.doesNotMatch(prepareReleaseSource, /0\.1\.0/);
  assert.match(
    prepareReleaseSource,
    /(package\.json|packageVersion|readFile)/,
    "expected release packaging to derive the current version dynamically",
  );
});

test("manager security patch scans all chunks and preserves minified identifiers", async () => {
  const source = await readRepoText(
    "extension",
    "scripts",
    "patch-manager-innerhtml.mjs",
  );

  assert.match(source, /file\.endsWith\("\.js"\)/);
  assert.match(source, /match\[1\]/);
  assert.match(source, /patchedTargets\.length === 0/);
  assert.doesNotMatch(source, /\}\},It="/);
});
