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

async function readBackgroundSource() {
  const source = await readFile(backgroundPath, "utf8");
  return source.replace(/\r\n/g, "\n");
}

function runBackgroundExports(input) {
  const script = `
    globalThis.defineBackground = (callback) => callback;

    const storageData = JSON.parse(process.env.FOLDER_PLAYBACK_STORAGE_SEED || "{}");
    const storage = {
      async get(keys) {
        const names = Array.isArray(keys) ? keys : [keys];
        const result = {};
        for (const name of names) {
          result[name] = storageData[name];
        }
        return result;
      },
      async set(next) {
        Object.assign(storageData, next || {});
      },
      async remove(keys) {
        const names = Array.isArray(keys) ? keys : [keys];
        for (const name of names) {
          delete storageData[name];
        }
      }
    };

    globalThis.chrome = {
      alarms: {
        clear() {},
        onAlarm: { addListener() {} }
      },
      runtime: {
        onMessage: { addListener() {} }
      },
      storage: {
        local: storage
      }
    };

    const mod = await import(${JSON.stringify(backgroundUrl)});
    const input = JSON.parse(process.env.FOLDER_PLAYBACK_TEST_INPUT || "{}");
    const results = [];

    for (const step of input.steps || []) {
      const fn = mod[step.exportName];
      if (typeof fn !== "function") {
        throw new Error("Missing export: " + step.exportName);
      }

      const args = (step.args || []).map((arg) => {
        if (arg && arg.$ref === "storage") return storage;
        return arg;
      });

      const value = await fn(...args);
      results.push({ exportName: step.exportName, value });
    }

    console.log(JSON.stringify({ results, storageData }));
  `;

  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        FOLDER_PLAYBACK_TEST_INPUT: JSON.stringify(input),
        FOLDER_PLAYBACK_STORAGE_SEED: JSON.stringify(input.storageSeed || {}),
      },
      input: script,
    }
  );

  return JSON.parse(stdout.trim());
}

test("background exposes playback session routes", async () => {
  const source = await readBackgroundSource();

  assert.match(source, /\/playback\/folder-session/);
  assert.match(source, /\/playback\/session/);
  assert.match(source, /\/playback\/session\/current/);
});

test("buildFolderPlaybackSessionFromState scopes to the selected folder and skips invalid videos", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "buildFolderPlaybackSessionFromState",
        args: [
          {
            folders: [
              { id: 7, name: "Queue", deletedAt: null },
              { id: 9, name: "Other", deletedAt: null },
            ],
            videos: [
              {
                id: 11,
                bvid: "BVKEEP1",
                title: "Keep me",
                coverUrl: "https://i0.hdslb.com/keep.jpg",
                uploader: "Alice",
                description: "",
                bvidUrl: "https://www.bilibili.com/video/BVKEEP1",
                isInvalid: false,
                deletedAt: null,
                updatedAt: 10,
              },
              {
                id: 12,
                bvid: "BVSKIP1",
                title: "Keep invalid",
                coverUrl: "https://i0.hdslb.com/skip.jpg",
                uploader: "Alice",
                description: "",
                bvidUrl: "https://www.bilibili.com/video/BVSKIP1",
                isInvalid: true,
                deletedAt: null,
                updatedAt: 9,
              },
              {
                id: 13,
                bvid: "BVOTHER1",
                title: "Keep me",
                coverUrl: "https://i0.hdslb.com/other.jpg",
                uploader: "Bob",
                description: "",
                bvidUrl: "https://www.bilibili.com/video/BVOTHER1",
                isInvalid: false,
                deletedAt: null,
                updatedAt: 8,
              },
            ],
            folderItems: [
              { folderId: 7, videoId: 11, addedAt: 100 },
              { folderId: 7, videoId: 12, addedAt: 99 },
              { folderId: 9, videoId: 13, addedAt: 98 },
            ],
            videoTags: [],
            tags: [],
          },
          {
            folderId: 7,
            filters: {
              title: "Keep",
            },
          },
        ],
      },
    ],
  });

  assert.equal(payload.results[0].value.playable, 1);
  assert.equal(payload.results[0].value.skippedInvalid, 1);
  assert.equal(payload.results[0].value.session.queue.length, 1);
  assert.equal(payload.results[0].value.firstItem.bvid, "BVKEEP1");
});

test("buildFolderPlaybackSessionFromState caps oversized playback queues", () => {
  const videos = Array.from({ length: 1005 }, (_, index) => ({
    id: index + 1,
    bvid: `BV${index + 1}`,
    title: `Video ${index + 1}`,
    coverUrl: `https://i0.hdslb.com/${index + 1}.jpg`,
    uploader: "Queue",
    description: "",
    bvidUrl: `https://www.bilibili.com/video/BV${index + 1}`,
    isInvalid: false,
    deletedAt: null,
    updatedAt: index + 1,
  }));

  const folderItems = videos.map((video, index) => ({
    folderId: 3,
    videoId: video.id,
    addedAt: 10_000 - index,
  }));

  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "buildFolderPlaybackSessionFromState",
        args: [
          {
            folders: [{ id: 3, name: "Long Queue", deletedAt: null }],
            videos,
            folderItems,
            videoTags: [],
            tags: [],
          },
          { folderId: 3 },
        ],
      },
    ],
  });

  assert.equal(payload.results[0].value.playable, 1000);
  assert.equal(payload.results[0].value.truncated, true);
  assert.equal(payload.results[0].value.session.queue.length, 1000);
});

test("stored playback session can be read back through storage helpers", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "setStoredFolderPlaybackSession",
        args: [
          {
            folderId: 7,
            currentIndex: 0,
            queue: [
              { videoId: 11, bvid: "BVKEEP1", url: "https://www.bilibili.com/video/BVKEEP1" },
            ],
          },
          { $ref: "storage" },
        ],
      },
      {
        exportName: "getStoredFolderPlaybackSession",
        args: [{ $ref: "storage" }],
      },
    ],
  });

  assert.equal(payload.results[1].value.folderId, 7);
  assert.equal(payload.results[1].value.queue.length, 1);
  assert.equal(payload.results[1].value.queue[0].bvid, "BVKEEP1");
});

test("stored playback cursor can be updated and cleared", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "setStoredFolderPlaybackSession",
        args: [
          {
            folderId: 5,
            currentIndex: 0,
            queue: [
              { videoId: 21, bvid: "BVFIRST1", url: "https://www.bilibili.com/video/BVFIRST1" },
              { videoId: 22, bvid: "BVNEXT01", url: "https://www.bilibili.com/video/BVNEXT01" },
            ],
          },
          { $ref: "storage" },
        ],
      },
      {
        exportName: "updateStoredFolderPlaybackCurrent",
        args: [{ bvid: "BVNEXT01" }, { $ref: "storage" }],
      },
      {
        exportName: "clearStoredFolderPlaybackSession",
        args: [{ $ref: "storage" }],
      },
      {
        exportName: "getStoredFolderPlaybackSession",
        args: [{ $ref: "storage" }],
      },
    ],
  });

  assert.equal(payload.results[1].value.currentIndex, 1);
  assert.equal(payload.results[3].value, null);
});
