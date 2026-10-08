import test from "node:test";
import assert from "node:assert/strict";

import { runBackgroundScenario } from "./helpers/background-runtime-harness.mjs";

function createState() {
  return {
    counters: { folder: 3, video: 3, folderItem: 4, tag: 1, videoTag: 1 },
    folders: [
      {
        id: 1,
        name: "Source",
        description: "",
        remoteMediaId: null,
        sortOrder: 1,
        deletedAt: null,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 2,
        name: "Target",
        description: "",
        remoteMediaId: null,
        sortOrder: 2,
        deletedAt: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    videos: [
      {
        id: 1,
        bvid: "BV1Ab411c7mD",
        title: "Uppercase suffix",
        coverUrl: "",
        uploader: "Uploader",
        uploaderSpaceUrl: null,
        description: "",
        partition: "",
        publishAt: null,
        bvidUrl: "https://www.bilibili.com/video/BV1Ab411c7mD",
        isInvalid: false,
        deletedAt: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    folderItems: [{ id: 1, folderId: 1, videoId: 1, addedAt: 1 }],
    tags: [],
    videoTags: [],
    syncMeta: {},
    ai: {},
  };
}

test("BV IDs remain case-sensitive in save and local status lookup", () => {
  const payload = runBackgroundScenario({
    exports: ["saveVideoSelectionToState", "handleReadOnlyApi"],
    input: {},
    scenarioSource: `
      const state = ${JSON.stringify(createState())};
      const saved = saveVideoSelectionToState(state, {
        bvid: "BV1ab411c7mD",
        title: "Lowercase suffix",
        bvidUrl: "https://www.bilibili.com/video/BV1ab411c7mD",
        coverUrl: "",
        uploader: "Uploader",
        description: "",
        folderIds: [2],
        customTags: [],
        systemTags: [],
      });
      const upper = handleReadOnlyApi(
        state,
        "/videos/by-bvid",
        new URLSearchParams({ bvid: "BV1Ab411c7mD" }),
      );
      const lower = handleReadOnlyApi(
        state,
        "/videos/by-bvid",
        new URLSearchParams({ bvid: "BV1ab411c7mD" }),
      );
      return {
        saved,
        videoCount: state.videos.length,
        bvids: state.videos.map((video) => video.bvid),
        upperFolders: upper.data?.folders || [],
        lowerFolders: lower.data?.folders || [],
      };
    `,
  }).result;

  assert.equal(payload.saved.ok, true);
  assert.equal(payload.videoCount, 2);
  assert.deepEqual(payload.bvids, ["BV1Ab411c7mD", "BV1ab411c7mD"]);
  assert.deepEqual(payload.upperFolders.map((folder) => folder.id), [1]);
  assert.deepEqual(payload.lowerFolders.map((folder) => folder.id), [2]);
});

test("copying a video adds one folder link without cloning the video", () => {
  const payload = runBackgroundScenario({
    exports: ["copyVideoToFolder"],
    scenarioSource: `
      const state = ${JSON.stringify(createState())};
      const copied = copyVideoToFolder(state, 2, 1);
      return {
        copied,
        videoCount: state.videos.length,
        bvid: state.videos[0].bvid,
        folderItems: state.folderItems,
      };
    `,
  }).result;

  assert.equal(payload.copied, true);
  assert.equal(payload.videoCount, 1);
  assert.equal(payload.bvid, "BV1Ab411c7mD");
  assert.deepEqual(
    payload.folderItems.map((item) => [item.folderId, item.videoId]),
    [
      [1, 1],
      [2, 1],
    ],
  );
});
