import test from "node:test";
import assert from "node:assert/strict";

import {
  LIBRARY_EXPORT_VIDEO_CSV_HEADER,
  isFavoriteMediaInvalid,
  normalizeBiliSpaceUrl,
} from "../shared/library-export.js";

test("csv export header drops duplicate addedAt columns", () => {
  assert.ok(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("favoriteAt"));
  assert.ok(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("favoriteAtMs"));
  assert.equal(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("addedAt"), false);
  assert.equal(LIBRARY_EXPORT_VIDEO_CSV_HEADER.includes("addedAtMs"), false);
});

test("normalizeBiliSpaceUrl returns canonical uploader space webpages", () => {
  assert.equal(normalizeBiliSpaceUrl("123456"), "https://space.bilibili.com/123456");
  assert.equal(
    normalizeBiliSpaceUrl("https://www.bilibili.com/space/654321?from=search"),
    "https://space.bilibili.com/654321",
  );
  assert.equal(
    normalizeBiliSpaceUrl("https://api.bilibili.com/x/space/wbi/acc/info?mid=777888"),
    "https://space.bilibili.com/777888",
  );
  assert.equal(normalizeBiliSpaceUrl("", 0), null);
});

test("favorite media attr flags invalid bilibili videos", () => {
  assert.equal(isFavoriteMediaInvalid({ attr: 0, title: "valid" }), false);
  assert.equal(isFavoriteMediaInvalid({ attr: 1, title: "deleted" }), true);
  assert.equal(isFavoriteMediaInvalid({ attr: 9, title: "self deleted" }), true);
  assert.equal(isFavoriteMediaInvalid({ title: "\u5df2\u5931\u6548\u89c6\u9891" }), true);
});
