import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCommentSourceUrl,
  createCommentSourceKey,
  normalizeFavoriteComment,
  parseBilibiliCount,
  parseCommentPublishedAt,
} from "../shared/comment-favorite.js";

test("comment favorites prefer stable reply ids and build direct source links", () => {
  assert.equal(createCommentSourceKey({ rpid: "123456" }), "rpid:123456");
  assert.equal(
    buildCommentSourceUrl({
      videoUrl: "https://www.bilibili.com/video/BV1TEST/",
      rootRpid: "123",
      rpid: "456",
    }),
    "https://www.bilibili.com/video/BV1TEST/?comment_on=1&comment_root_id=123&comment_secondary_id=456#reply456",
  );
});

test("comment fallback keys are deterministic and normalized records reject empty content", () => {
  const input = { bvid: "bv1test", authorMid: "42", content: " same  comment " };
  assert.equal(createCommentSourceKey(input), createCommentSourceKey({ ...input }));
  assert.notEqual(
    createCommentSourceKey(input),
    createCommentSourceKey({ ...input, bvid: "BV1TEST" }),
  );
  assert.match(createCommentSourceKey(input), /^comment:/);
  assert.throws(() => normalizeFavoriteComment({ content: "  " }), /required/);

  const record = normalizeFavoriteComment({
    ...input,
    videoUrl: "https://www.bilibili.com/video/BV1TEST/",
    contentImageUrls: [
      "https://i0.hdslb.com/bfs/new_dyn/a.jpg",
      "javascript:alert(1)",
    ],
    likeCount: "12",
  });
  assert.equal(record.bvid, "bv1test");
  assert.equal(record.likeCount, 12);
  assert.deepEqual(record.contentImageUrls, ["https://i0.hdslb.com/bfs/new_dyn/a.jpg"]);

  const imageOnly = normalizeFavoriteComment({
    rpid: "987654",
    videoUrl: "https://www.bilibili.com/opus/123456",
    contentImageUrls: ["https://i0.hdslb.com/bfs/new_dyn/image-only.jpg"],
  });
  assert.equal(imageOnly.content, "");
  assert.equal(imageOnly.sourceUrl.endsWith("#reply987654"), true);
});

test("comment count and relative time parsing cover Bilibili labels", () => {
  assert.equal(parseBilibiliCount("1.2万"), 12_000);
  assert.equal(parseBilibiliCount("赞 345"), 345);
  const now = new Date(2026, 7, 5, 12, 0, 0).getTime();
  assert.equal(parseCommentPublishedAt("2小时前", now), now - 7_200_000);
  assert.equal(
    parseCommentPublishedAt("08-05 10:30", now),
    new Date(2026, 7, 5, 10, 30, 0).getTime(),
  );
});
