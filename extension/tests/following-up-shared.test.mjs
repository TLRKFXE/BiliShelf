import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeFollowedUpRecords,
  normalizeFollowedUpRecord,
  searchFollowedUps,
} from "../shared/following-up.js";

test("normalizeFollowedUpRecord maps Bilibili following fields into a stable record", () => {
  assert.deepEqual(
    normalizeFollowedUpRecord({
      mid: "123",
      uname: "  TLRK  ",
      face: "//i0.hdslb.com/bfs/face/a.jpg",
    }),
    {
      uid: 123,
      name: "TLRK",
      avatarUrl: "https://i0.hdslb.com/bfs/face/a.jpg",
      spaceUrl: "https://space.bilibili.com/123",
    }
  );
});

test("normalizeFollowedUpRecord drops malformed records and unsafe avatars", () => {
  assert.equal(
    normalizeFollowedUpRecord({
      mid: "0",
      uname: "Nobody",
      face: "https://i0.hdslb.com/bfs/face/a.jpg",
    }),
    null
  );
  assert.equal(
    normalizeFollowedUpRecord({
      mid: "123",
      uname: "   ",
      face: "https://i0.hdslb.com/bfs/face/a.jpg",
    }),
    null
  );
  assert.deepEqual(
    normalizeFollowedUpRecord({
      mid: "123",
      uname: "Safe",
      face: "javascript:alert(1)",
    }),
    {
      uid: 123,
      name: "Safe",
      avatarUrl: "",
      spaceUrl: "https://space.bilibili.com/123",
    }
  );
});

test("mergeFollowedUpRecords upserts by uid and preserves old records on partial imports", () => {
  const nowTs = 1_714_000_000_000;
  const merged = mergeFollowedUpRecords(
    [
      {
        uid: 1,
        name: "Old",
        avatarUrl: "https://i0.hdslb.com/old.jpg",
        spaceUrl: "https://space.bilibili.com/1",
        sortOrder: 9,
        importedAt: 100,
        updatedAt: 100,
      },
      {
        uid: 3,
        name: "Kept",
        avatarUrl: "https://i0.hdslb.com/kept.jpg",
        spaceUrl: "https://space.bilibili.com/3",
        sortOrder: 3,
        importedAt: 300,
        updatedAt: 300,
      },
    ],
    [
      {
        uid: 2,
        name: "New",
        avatarUrl: "https://i0.hdslb.com/new.jpg",
        spaceUrl: "https://space.bilibili.com/2",
      },
      {
        uid: 1,
        name: "Updated",
        avatarUrl: "https://i0.hdslb.com/updated.jpg",
        spaceUrl: "https://space.bilibili.com/1",
      },
    ],
    nowTs
  );

  assert.equal(merged.records.length, 3);
  assert.equal(merged.created, 1);
  assert.equal(merged.updated, 1);
  assert.deepEqual(
    merged.records.map((item) => [item.uid, item.name, item.sortOrder]),
    [
      [2, "New", 0],
      [1, "Updated", 1],
      [3, "Kept", 3],
    ]
  );
  assert.equal(merged.records.find((item) => item.uid === 1)?.importedAt, 100);
  assert.equal(merged.records.find((item) => item.uid === 1)?.updatedAt, nowTs);
});

test("searchFollowedUps filters by name and uid without changing order", () => {
  const records = [
    {
      uid: 10,
      name: "Alpha",
      avatarUrl: "",
      spaceUrl: "https://space.bilibili.com/10",
      sortOrder: 0,
      importedAt: 1,
      updatedAt: 1,
    },
    {
      uid: 20,
      name: "Beta",
      avatarUrl: "",
      spaceUrl: "https://space.bilibili.com/20",
      sortOrder: 1,
      importedAt: 1,
      updatedAt: 1,
    },
  ];

  assert.deepEqual(searchFollowedUps(records, "alp").map((item) => item.uid), [10]);
  assert.deepEqual(searchFollowedUps(records, "20").map((item) => item.uid), [20]);
  assert.deepEqual(searchFollowedUps(records, "").map((item) => item.uid), [10, 20]);
});
