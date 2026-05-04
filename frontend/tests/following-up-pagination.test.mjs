import test from "node:test";
import assert from "node:assert/strict";

async function loadPaginationModule() {
  try {
    return await import("../src/lib/following-up-pagination.js");
  } catch {
    return null;
  }
}

test("following-up pagination exports stable defaults", async () => {
  const pagination = await loadPaginationModule();

  assert.ok(pagination, "following-up pagination helper should exist");
  assert.deepEqual(pagination.FOLLOWING_UP_PAGE_SIZE_OPTIONS, [12, 24, 48, 96]);
  assert.equal(pagination.DEFAULT_FOLLOWING_UP_PAGE_SIZE, 24);
  assert.equal(pagination.normalizeFollowingUpPageSize(48), 48);
  assert.equal(pagination.normalizeFollowingUpPageSize("bad"), 24);
  assert.equal(pagination.normalizeFollowingUpPageSize(999), 24);
});

test("following-up pagination slices records and clamps page numbers", async () => {
  const pagination = await loadPaginationModule();

  assert.ok(
    pagination && typeof pagination.paginateFollowingUps === "function",
    "paginateFollowingUps should exist"
  );

  const records = Array.from({ length: 55 }, (_, index) => ({
    uid: index + 1,
  }));

  const pageFive = pagination.paginateFollowingUps(records, 5, 12);
  assert.equal(pageFive.page, 5);
  assert.equal(pageFive.pageSize, 12);
  assert.equal(pageFive.total, 55);
  assert.equal(pageFive.totalPages, 5);
  assert.equal(pageFive.items.length, 7);
  assert.equal(pageFive.items[0].uid, 49);

  const overflowPage = pagination.paginateFollowingUps(records, 99, 24);
  assert.equal(overflowPage.page, 3);
  assert.equal(overflowPage.totalPages, 3);
  assert.equal(overflowPage.items.length, 7);
  assert.equal(overflowPage.items[0].uid, 49);
});
