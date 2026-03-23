import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRecoveredInvalidVideoMetadata,
  mergeRecoveredInvalidVideoFields,
} from "../shared/invalid-video-recovery.js";

test("normalizeRecoveredInvalidVideoMetadata trims and normalizes", () => {
  const input = {
    title: "  Archival Title ",
    coverUrl: "//i0.hdslb.com/bfs/archive/cover.jpg",
    description: "  Description  ",
  };
  const normalized = normalizeRecoveredInvalidVideoMetadata(input);

  assert.strictEqual(normalized.title, "Archival Title");
  assert.strictEqual(
    normalized.coverUrl,
    "https://i0.hdslb.com/bfs/archive/cover.jpg"
  );
  assert.strictEqual(normalized.description, "Description");
});

test("mergeRecoveredInvalidVideoFields only updates invalid video fields", () => {
  const recovered = normalizeRecoveredInvalidVideoMetadata({
    title: "Recovered Title",
    coverUrl: "//i0.hdslb.com/bfs/archive/cover.jpg",
    description: "Recovered description",
  });

  const video = {
    isInvalid: true,
    title: "Old Title",
    coverUrl: "https://placeholder",
    description: "",
    uploader: "Existing UP",
    uploaderSpaceUrl: "https://space.bilibili.com/1",
  };

  const result = mergeRecoveredInvalidVideoFields(video, recovered);

  assert.ok(result.changed);
  assert.strictEqual(video.title, "Recovered Title");
  assert.strictEqual(
    video.coverUrl,
    "https://i0.hdslb.com/bfs/archive/cover.jpg"
  );
  assert.strictEqual(video.description, "Recovered description");
  assert.strictEqual(video.uploader, "Existing UP");
  assert.strictEqual(video.uploaderSpaceUrl, "https://space.bilibili.com/1");
  assert.deepStrictEqual(result.updates, {
    title: "Recovered Title",
    coverUrl: "https://i0.hdslb.com/bfs/archive/cover.jpg",
    description: "Recovered description",
  });
});

test("mergeRecoveredInvalidVideoFields ignores non-invalid videos", () => {
  const normalized = normalizeRecoveredInvalidVideoMetadata({
    title: "Recovered Title",
  });
  const video = {
    isInvalid: false,
    title: "Valid Title",
  };

  const result = mergeRecoveredInvalidVideoFields(video, normalized);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(result.updates, {});
});
