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

test("frontend package, extension package, and extension manifest versions stay aligned and move past the initial release", async () => {
  const frontendPackage = await readRepoJson("frontend", "package.json");
  const extensionPackage = await readRepoJson("extension", "package.json");
  const wxtConfigSource = await readRepoText("extension", "wxt.config.ts");
  const manifestVersion = wxtConfigSource.match(/version:\s*"([^"]+)"/)?.[1];

  assert.ok(manifestVersion, "expected manifest version in extension/wxt.config.ts");
  assert.equal(frontendPackage.version, extensionPackage.version);
  assert.equal(manifestVersion, extensionPackage.version);
  assert.equal(extensionPackage.version, "0.1.5");
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
