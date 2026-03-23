import test from "node:test";
import assert from "node:assert/strict";

import {
  clearFolderSelection,
  estimateSelectedVideoCount,
  orderSelectedFolderIds,
  selectAllFolderIds,
  toggleFolderSelection,
} from "../src/lib/sync-folder-selection.js";

const folders = [
  { remoteId: 10, title: "Default", mediaCount: 120 },
  { remoteId: 30, title: "Later", mediaCount: 5 },
  { remoteId: 20, title: "Music", mediaCount: 48 },
];

test("selectAllFolderIds returns every loaded folder id in list order", () => {
  assert.deepEqual(selectAllFolderIds(folders), [10, 30, 20]);
});

test("clearFolderSelection always returns an empty selection", () => {
  assert.deepEqual(clearFolderSelection([10, 30]), []);
});

test("toggleFolderSelection adds and removes one folder without duplicates", () => {
  const selected = toggleFolderSelection([10], 30, true);
  const duplicate = toggleFolderSelection(selected, 30, true);
  const removed = toggleFolderSelection(duplicate, 10, false);

  assert.deepEqual(selected, [10, 30]);
  assert.deepEqual(duplicate, [10, 30]);
  assert.deepEqual(removed, [30]);
});

test("orderSelectedFolderIds normalizes the queue to the current folder list order", () => {
  assert.deepEqual(orderSelectedFolderIds([20, 10], folders), [10, 20]);
  assert.deepEqual(orderSelectedFolderIds([999, 20, 10], folders), [10, 20]);
});

test("estimateSelectedVideoCount sums only selected folders", () => {
  assert.equal(estimateSelectedVideoCount([10, 20], folders), 168);
  assert.equal(estimateSelectedVideoCount([30], folders), 5);
  assert.equal(estimateSelectedVideoCount([], folders), 0);
});
