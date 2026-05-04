import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const backgroundPath = path.join(repoRoot, "extension", "entrypoints", "background.ts");
const backgroundUrl = pathToFileURL(backgroundPath).href;

function runBackgroundExports(input) {
  const script = `
    globalThis.defineBackground = (callback) => callback;
    globalThis.chrome = {
      alarms: {
        clear() {},
        onAlarm: { addListener() {} }
      },
      runtime: {
        onMessage: { addListener() {} }
      }
    };

    const mod = await import(${JSON.stringify(backgroundUrl)});
    const input = JSON.parse(process.env.BILISHELF_TEST_INPUT || "{}");
    const results = [];

    for (const step of input.steps || []) {
      const fn = mod[step.exportName];
      if (typeof fn !== "function") {
        throw new Error("Missing export: " + step.exportName);
      }

      const args = step.args || [];
      const value = await fn(...args);
      results.push({ exportName: step.exportName, value });
    }

    console.log(JSON.stringify({ results }));
  `;

  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        BILISHELF_TEST_INPUT: JSON.stringify(input),
      },
      input: script,
    },
  );

  return JSON.parse(stdout.trim());
}

test("normalizeWebDavRemotePath preserves explicit blank input for base-url-root usage", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "normalizeWebDavRemotePath",
        args: [""],
      },
      {
        exportName: "normalizeWebDavRemotePath",
        args: ["  foo//bar  "],
      },
    ],
  });

  assert.equal(payload.results[0].value, "");
  assert.equal(payload.results[1].value, "foo/bar");
});

test("buildWebDavCollectionUrls expands nested directories in order and skips blank remote paths", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "buildWebDavCollectionUrls",
        args: ["https://dav.example.com/root/", "foo/bar"],
      },
      {
        exportName: "buildWebDavCollectionUrls",
        args: ["https://dav.example.com/root/", ""],
      },
    ],
  });

  assert.deepEqual(payload.results[0].value, [
    "https://dav.example.com/root/foo",
    "https://dav.example.com/root/foo/bar",
  ]);
  assert.deepEqual(payload.results[1].value, []);
});

test("background prepares WebDAV directories before connectivity probes and uploads", async () => {
  const source = await readFile(backgroundPath, "utf8");

  assert.match(
    source,
    /if \(method === "POST" && path === "\/backup\/webdav\/test"\) \{[\s\S]*await ensureWebDavRemoteDirectory\(meta\);[\s\S]*const probeName =/,
  );
  assert.match(
    source,
    /if \(method === "POST" && path === "\/backup\/webdav\/upload"\) \{[\s\S]*await ensureWebDavRemoteDirectory\(meta\);[\s\S]*const jsonBackup = buildJsonExportResult\(state\);/,
  );
});
