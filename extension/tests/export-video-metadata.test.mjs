import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExportVideoMetadata,
  buildVideoExportMaps,
  LIBRARY_EXPORT_VIDEO_CSV_HEADER,
} from "../shared/export-video-metadata.js";

test("csv export header includes folderCount for duplicate folder membership", () => {
  assert.equal(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("partition"), true);
  assert.equal(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("folderCount"), true);
});

test("buildExportVideoMetadata preserves partition and counts linked folders", () => {
  const state = {
    folders: [
      { id: 1, name: "默认收藏夹" },
      { id: 2, name: "音乐" },
      { id: 3, name: "科技" },
    ],
    folderItems: [
      { folderId: 1, videoId: 11, addedAt: 1000 },
      { folderId: 2, videoId: 11, addedAt: 2500 },
      { folderId: 3, videoId: 12, addedAt: 3000 },
    ],
    tags: [
      { id: 1, name: "音乐", type: "system" },
      { id: 2, name: "收藏", type: "custom" },
    ],
    videoTags: [
      { videoId: 11, tagId: 1 },
      { videoId: 11, tagId: 2 },
    ],
  };

  const video = {
    id: 11,
    partition: "音乐",
  };

  const maps = buildVideoExportMaps(state);
  const metadata = buildExportVideoMetadata(video, maps);

  assert.equal(metadata.partition, "音乐");
  assert.equal(metadata.folderCount, 2);
  assert.equal(metadata.favoriteAt, 2500);
  assert.deepEqual(metadata.folders, ["默认收藏夹", "音乐"]);
  assert.deepEqual(metadata.customTags, ["收藏"]);
  assert.deepEqual(metadata.systemTags, ["音乐"]);
});
