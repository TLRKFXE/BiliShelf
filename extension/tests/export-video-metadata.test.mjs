import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExportVideoMetadata,
  buildVideoExportMaps,
  LIBRARY_EXPORT_VIDEO_CSV_HEADER,
} from "../shared/export-video-metadata.js";

test("csv export header keeps a human-readable field order", () => {
  assert.deepEqual([...LIBRARY_EXPORT_VIDEO_CSV_HEADER], [
    "bvid",
    "title",
    "uploader",
    "uploaderSpaceUrl",
    "bvidUrl",
    "coverUrl",
    "folders",
    "folderCount",
    "systemTags",
    "customTags",
    "publishAt",
    "favoriteAt",
    "isInvalid",
    "deletedAt",
    "description",
  ]);
});

test("buildExportVideoMetadata counts linked folders without exposing partition", () => {
  const state = {
    folders: [
      { id: 1, name: "Default" },
      { id: 2, name: "Music" },
      { id: 3, name: "Tech" },
    ],
    folderItems: [
      { folderId: 1, videoId: 11, addedAt: 1000 },
      { folderId: 2, videoId: 11, addedAt: 2500 },
      { folderId: 3, videoId: 12, addedAt: 3000 },
    ],
    tags: [
      { id: 1, name: "music", type: "system" },
      { id: 2, name: "saved", type: "custom" },
    ],
    videoTags: [
      { videoId: 11, tagId: 1 },
      { videoId: 11, tagId: 2 },
    ],
  };

  const maps = buildVideoExportMaps(state);
  const metadata = buildExportVideoMetadata({ id: 11 }, maps);

  assert.equal("partition" in metadata, false);
  assert.equal(metadata.folderCount, 2);
  assert.equal(metadata.favoriteAt, 2500);
  assert.deepEqual(metadata.folders, ["Default", "Music"]);
  assert.deepEqual(metadata.customTags, ["saved"]);
  assert.deepEqual(metadata.systemTags, ["music"]);
});

test("buildVideoExportMaps can ignore tag relations for videos outside the exported set", () => {
  const state = {
    folders: [
      { id: 1, name: "Default" },
      { id: 2, name: "Archive" },
    ],
    folderItems: [
      { folderId: 1, videoId: 11, addedAt: 1000 },
      { folderId: 2, videoId: 12, addedAt: 2500 },
    ],
    tags: [
      { id: 1, name: "keep-system", type: "system" },
      { id: 2, name: "keep-custom", type: "custom" },
      { id: 3, name: "orphan-system", type: "system" },
      { id: 4, name: "orphan-custom", type: "custom" },
    ],
    videoTags: [
      { videoId: 11, tagId: 1 },
      { videoId: 11, tagId: 2 },
      { videoId: 12, tagId: 3 },
      { videoId: 12, tagId: 4 },
    ],
  };

  const maps = buildVideoExportMaps(state, new Set([11]));
  const keptMetadata = buildExportVideoMetadata({ id: 11 }, maps);
  const skippedMetadata = buildExportVideoMetadata({ id: 12 }, maps);

  assert.deepEqual(keptMetadata.systemTags, ["keep-system"]);
  assert.deepEqual(keptMetadata.customTags, ["keep-custom"]);
  assert.deepEqual(skippedMetadata.systemTags, []);
  assert.deepEqual(skippedMetadata.customTags, []);
});
