import test from "node:test";
import assert from "node:assert/strict";

import {
  FOLDER_PLAYBACK_QUEUE_CAP,
  buildFolderPlaybackSession,
  findPlaybackQueueIndex,
  getAdjacentPlaybackItems,
  normalizePlaybackSession,
} from "../shared/folder-playback-session.js";

test("buildFolderPlaybackSession() caps queue length at queue cap", () => {
  const videos = Array.from(
    { length: FOLDER_PLAYBACK_QUEUE_CAP + 10 },
    (_, idx) => ({
      id: idx + 1,
      videoId: idx + 1,
      bvid: `BV${idx + 1}`,
      title: `Video ${idx + 1}`,
      url: `https://www.bilibili.com/video/BV${idx + 1}`,
      isInvalid: false,
    }),
  );

  const session = buildFolderPlaybackSession(videos);

  assert.equal(session.queue.length, FOLDER_PLAYBACK_QUEUE_CAP);
});

test("buildFolderPlaybackSession() skips invalid videos", () => {
  const videos = [
    { videoId: 1, bvid: "BV1", isInvalid: true },
    { videoId: 2, bvid: "BV2", isInvalid: false },
    { videoId: 3, bvid: "BV3", isInvalid: true },
  ];

  const session = buildFolderPlaybackSession(videos);

  assert.equal(session.queue.every((item) => item.isInvalid === false), true);
  assert.equal(session.queue.length, 1);
});

test("findPlaybackQueueIndex() resolves current item by video id or bvid", () => {
  const queue = [
    { videoId: 1, bvid: "BV1" },
    { videoId: 2, bvid: "BV2" },
    { videoId: 3, bvid: "BV3" },
  ];

  assert.equal(findPlaybackQueueIndex(queue, { videoId: 2 }), 1);
  assert.equal(findPlaybackQueueIndex(queue, { bvid: "BV3" }), 2);
});

test("getAdjacentPlaybackItems() returns disabled edges at the first and last item", () => {
  const queue = [
    { videoId: 1, bvid: "BV1" },
    { videoId: 2, bvid: "BV2" },
  ];

  const edgesAtStart = getAdjacentPlaybackItems(queue, 0);
  assert.equal(edgesAtStart.previous.disabled, true);
  assert.equal(edgesAtStart.next.disabled, false);

  const edgesAtEnd = getAdjacentPlaybackItems(queue, queue.length - 1);
  assert.equal(edgesAtEnd.previous.disabled, false);
  assert.equal(edgesAtEnd.next.disabled, true);
});

test("normalizePlaybackSession(null) returns null", () => {
  assert.equal(normalizePlaybackSession(null), null);
});
