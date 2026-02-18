import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const requiredZipNames = [
  "bilishelf-extension-0.1.0-chrome.zip",
  "bilishelf-extension-0.1.0-edge.zip",
  "bilishelf-extension-0.1.0-firefox.zip"
];

const extensionRoot = process.cwd();
const outputDir = path.join(extensionRoot, ".output");
const releaseDir = path.join(extensionRoot, "release", "packages");
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const targetDir = path.join(releaseDir, stamp);

async function ensureFileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function sha256(filePath) {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  await fs.mkdir(targetDir, { recursive: true });

  const lines = [];
  for (const fileName of requiredZipNames) {
    const source = path.join(outputDir, fileName);
    const exists = await ensureFileExists(source);
    if (!exists) {
      throw new Error(`Missing expected zip: ${source}`);
    }

    const dest = path.join(targetDir, fileName);
    await fs.copyFile(source, dest);
    const hash = await sha256(dest);
    lines.push(`${hash}  ${fileName}`);
  }

  const checksumPath = path.join(targetDir, "SHA256SUMS.txt");
  await fs.writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Release package directory ready: ${targetDir}`);
  console.log(`Checksum file: ${checksumPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
