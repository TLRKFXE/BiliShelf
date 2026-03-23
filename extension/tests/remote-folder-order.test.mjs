import test from "node:test";
import assert from "node:assert/strict";

import { reconcileRemoteFolderSortOrder } from "../shared/remote-folder-order.js";

test("reconcileRemoteFolderSortOrder realigns remote-linked folders to remote order", () => {
  const folders = [
    {
      id: 1,
      name: "Local Notes",
      remoteMediaId: null,
      sortOrder: 1,
      createdAt: 10,
      deletedAt: null,
    },
    {
      id: 2,
      name: "Remote C",
      remoteMediaId: 30,
      sortOrder: 2,
      createdAt: 20,
      deletedAt: null,
    },
    {
      id: 3,
      name: "Remote A",
      remoteMediaId: 10,
      sortOrder: 3,
      createdAt: 30,
      deletedAt: null,
    },
    {
      id: 4,
      name: "Remote B",
      remoteMediaId: 20,
      sortOrder: 4,
      createdAt: 40,
      deletedAt: null,
    },
    {
      id: 5,
      name: "Remote Missing",
      remoteMediaId: 999,
      sortOrder: 5,
      createdAt: 50,
      deletedAt: null,
    },
    {
      id: 6,
      name: "Local Archive",
      remoteMediaId: null,
      sortOrder: 6,
      createdAt: 60,
      deletedAt: null,
    },
  ];

  const remoteFolders = [
    { remoteId: 10, title: "Remote A" },
    { remoteId: 20, title: "Remote B" },
    { remoteId: 30, title: "Remote C" },
    { remoteId: 40, title: "Remote D" },
  ];

  const ordered = reconcileRemoteFolderSortOrder(folders, remoteFolders);

  assert.deepEqual(
    ordered.map((folder) => ({
      id: folder.id,
      name: folder.name,
      sortOrder: folder.sortOrder,
    })),
    [
      { id: 3, name: "Remote A", sortOrder: 1 },
      { id: 4, name: "Remote B", sortOrder: 2 },
      { id: 2, name: "Remote C", sortOrder: 3 },
      { id: 5, name: "Remote Missing", sortOrder: 4 },
      { id: 1, name: "Local Notes", sortOrder: 5 },
      { id: 6, name: "Local Archive", sortOrder: 6 },
    ],
  );
});
