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

test("json export omits partition from exported videos", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "buildJsonExportResult",
        args: [
          {
            counters: {
              folder: 3,
              video: 2,
              folderItem: 3,
              tag: 3,
              videoTag: 3,
            },
            folders: [
              {
                id: 1,
                name: "Favorites",
                description: "",
                remoteMediaId: null,
                sortOrder: 1,
                deletedAt: null,
                createdAt: 1,
                updatedAt: 1,
              },
            ],
            videos: [
              {
                id: 1,
                bvid: "BVEXPORT01",
                title: "Export video",
                coverUrl: "https://i0.hdslb.com/export.jpg",
                uploader: "Uploader",
                uploaderSpaceUrl: "https://space.bilibili.com/1",
                description: "Description",
                partition: "music",
                publishAt: 1700000000000,
                bvidUrl: "https://www.bilibili.com/video/BVEXPORT01",
                isInvalid: false,
                deletedAt: null,
                createdAt: 1700000001000,
                updatedAt: 1700000002000,
              },
            ],
            folderItems: [
              { id: 1, folderId: 1, videoId: 1, addedAt: 1700000003000 },
            ],
            tags: [],
            videoTags: [],
            syncMeta: {},
            ai: {},
          },
        ],
      },
    ],
  });

  const result = payload.results[0].value;
  const parsed = JSON.parse(result.content);

  assert.equal("partition" in parsed.videos[0], false);
  assert.equal(parsed.videos[0].favoriteAt, 1700000003000);
  assert.equal(parsed.videos[0].folderCount, 1);
});

test("legacy csv import path still accepts old timestamp columns and partition", async () => {
  const source = await readFile(backgroundPath, "utf8");

  assert.match(source, /publishAt: parseTimestampInput\(pick\(row, "publishAtMs"\) \|\| pick\(row, "publishAt"\)\)/);
  assert.match(
    source,
    /pick\(row, "favoriteAtMs"\) \|\|\s*pick\(row, "favoriteAt"\) \|\|\s*pick\(row, "addedAtMs"\) \|\|\s*pick\(row, "addedAt"\)/s,
  );
  assert.match(source, /partition: pick\(row, "partition"\),/);
});

test("legacy json exports still import text timestamps and ignored extra fields", () => {
  const legacyJson = JSON.stringify({
    meta: {
      version: "v1",
    },
    folders: [{ id: 9, name: "Legacy Folder" }],
    videos: [
      {
        id: 11,
        bvid: "BVLEGACY2",
        title: "Legacy JSON",
        coverUrl: "https://i0.hdslb.com/legacy-json.jpg",
        uploader: "Legacy Uploader",
        uploaderSpaceUrl: "https://space.bilibili.com/9",
        description: "Legacy description",
        partition: "anime",
        publishAtText: "2024-01-02 03:04:05",
        favoriteAtText: "2024-01-03 04:05:06",
        bvidUrl: "https://www.bilibili.com/video/BVLEGACY2",
        isInvalid: false,
        createdAt: 123,
        updatedAt: 456,
      },
    ],
    folderItems: [
      {
        id: 99,
        folderId: 9,
        videoId: 11,
        addedAtText: "2024-01-03 04:05:06",
      },
    ],
    tags: [
      { id: 3, name: "system-tag", type: "system" },
      { id: 4, name: "custom-tag", type: "custom" },
    ],
    videoTags: [
      { videoId: 11, tagId: 3 },
      { videoId: 11, tagId: 4 },
    ],
  });

  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "parseImportRows",
        args: ["json", legacyJson],
      },
    ],
  });

  const parsed = payload.results[0].value;
  assert.equal(parsed.skipped, 0);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].bvid, "BVLEGACY2");
  assert.ok(parsed.rows[0].publishAt > 0);
  assert.ok(parsed.rows[0].addedAt > 0);
  assert.deepEqual(parsed.rows[0].folders, ["Legacy Folder"]);
  assert.deepEqual(parsed.rows[0].customTags, ["custom-tag"]);
  assert.deepEqual(parsed.rows[0].systemTags, ["system-tag"]);
});
