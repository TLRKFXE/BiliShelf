import test from "node:test";
import assert from "node:assert/strict";

import {
  COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY,
  normalizeRememberedCollectorFolderIds,
  resolveRememberedCollectorFolderIds,
} from "../utils/collector-folder-memory.js";

test("normalizeRememberedCollectorFolderIds keeps positive integer ids only and removes duplicates", () => {
  assert.deepEqual(
    normalizeRememberedCollectorFolderIds([
      3,
      "5",
      3,
      " 5 ",
      0,
      -1,
      null,
      "folder",
      9.4,
      12,
    ]),
    [3, 5, 9, 12],
  );
});

test("resolveRememberedCollectorFolderIds filters missing ids and follows current folder order", () => {
  const folders = [
    { id: 7, name: "稍后再看" },
    { id: 3, name: "默认收藏夹" },
    { id: 12, name: "教程" },
    { id: 5, name: "音乐" },
  ];

  assert.deepEqual(
    resolveRememberedCollectorFolderIds([5, 999, "3", 12, 5, "invalid"], folders),
    [3, 12, 5],
  );
});

test("collector folder memory exposes a stable storage key", () => {
  assert.equal(
    COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY,
    "bili_like_collector_last_folder_ids_v1",
  );
});
