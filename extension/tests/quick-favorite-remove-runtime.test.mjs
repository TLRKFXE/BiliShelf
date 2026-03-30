import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
      const capturedArgs = {};
      for (const index of step.captureArgs || []) {
        capturedArgs[index] = args[index];
      }
      results.push({ exportName: step.exportName, value, capturedArgs });
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

function createBaseState() {
  return {
    counters: {
      folder: 3,
      video: 2,
      folderItem: 3,
      tag: 1,
      videoTag: 1,
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
      {
        id: 2,
        name: "Music",
        description: "",
        remoteMediaId: null,
        sortOrder: 2,
        deletedAt: null,
        createdAt: 2,
        updatedAt: 2,
      },
    ],
    videos: [
      {
        id: 1,
        bvid: "BVLOCAL01",
        title: "Local video",
        coverUrl: "https://i0.hdslb.com/local.jpg",
        uploader: "Uploader",
        uploaderSpaceUrl: "https://space.bilibili.com/1",
        description: "Description",
        partition: "",
        publishAt: null,
        bvidUrl: "https://www.bilibili.com/video/BVLOCAL01",
        isInvalid: false,
        deletedAt: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    folderItems: [
      { id: 1, folderId: 1, videoId: 1, addedAt: 1000 },
      { id: 2, folderId: 2, videoId: 1, addedAt: 2000 },
    ],
    tags: [],
    videoTags: [],
    syncMeta: {},
    ai: {},
  };
}

test("saveVideoSelectionToState removes deselected folder links and reports them", () => {
  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "saveVideoSelectionToState",
        args: [
          createBaseState(),
          {
            bvid: "BVLOCAL01",
            title: "Local video",
            bvidUrl: "https://www.bilibili.com/video/BVLOCAL01",
            coverUrl: "https://i0.hdslb.com/local.jpg",
            uploader: "Uploader",
            uploaderSpaceUrl: "https://space.bilibili.com/1",
            description: "Description",
            folderIds: [2],
            customTags: [],
            systemTags: [],
          },
        ],
        captureArgs: [0],
      },
    ],
  });

  const result = payload.results[0].value;
  const nextState = payload.results[0].capturedArgs[0];

  assert.equal(result.ok, true);
  assert.deepEqual(result.data.addedFolderIds, []);
  assert.deepEqual(result.data.existingFolderIds, [2]);
  assert.deepEqual(result.data.removedFolderIds, [1]);
  assert.deepEqual(result.data.finalFolderIds, [2]);
  assert.equal(nextState.folderItems.length, 1);
  assert.equal(nextState.folderItems[0].folderId, 2);
});

test("saveVideoSelectionToState allows unchecking every folder to fully remove a local video", () => {
  const baseState = createBaseState();
  baseState.folderItems = [{ id: 1, folderId: 1, videoId: 1, addedAt: 1000 }];

  const payload = runBackgroundExports({
    steps: [
      {
        exportName: "saveVideoSelectionToState",
        args: [
          baseState,
          {
            bvid: "BVLOCAL01",
            title: "Local video",
            bvidUrl: "https://www.bilibili.com/video/BVLOCAL01",
            coverUrl: "https://i0.hdslb.com/local.jpg",
            uploader: "Uploader",
            uploaderSpaceUrl: "https://space.bilibili.com/1",
            description: "Description",
            folderIds: [],
            customTags: [],
            systemTags: [],
          },
        ],
        captureArgs: [0],
      },
    ],
  });

  const result = payload.results[0].value;
  const nextState = payload.results[0].capturedArgs[0];

  assert.equal(result.ok, true);
  assert.equal(result.data.deleted, true);
  assert.deepEqual(result.data.removedFolderIds, [1]);
  assert.deepEqual(result.data.finalFolderIds, []);
  assert.equal(nextState.videos.length, 0);
  assert.equal(nextState.folderItems.length, 0);
});
