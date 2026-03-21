import test from "node:test";
import assert from "node:assert/strict";

import { applyFolderCategoryAttempt } from "../shared/ai-analysis.js";

test("keeps previous successful category result when rerun fails", () => {
  const previous = {
    folderId: 7,
    status: "success",
    lastError: null,
    startedAt: 1,
    finishedAt: 2,
    updatedAt: 2,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [
      {
        folderId: 7,
        videoId: 11,
        category: "tech",
        analyzedAt: 2,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    ],
  };

  const next = applyFolderCategoryAttempt(previous, {
    folderId: 7,
    status: "error",
    lastError: "quota exceeded",
    startedAt: 3,
    finishedAt: 4,
    updatedAt: 4,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [],
  });

  assert.equal(next.videos.length, 1);
  assert.equal(next.videos[0].category, "tech");
  assert.equal("categories" in next.videos[0], false);
  assert.equal(next.lastError, "quota exceeded");
});

test("migrates legacy categories payload to singular category", () => {
  const previous = {
    folderId: 7,
    status: "success",
    lastError: null,
    startedAt: 1,
    finishedAt: 2,
    updatedAt: 2,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [
      {
        folderId: 7,
        videoId: 11,
        category: "tech",
        analyzedAt: 2,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    ],
  };

  const next = applyFolderCategoryAttempt(previous, {
    folderId: 7,
    status: "success",
    lastError: null,
    startedAt: 3,
    finishedAt: 4,
    updatedAt: 4,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [
      {
        folderId: 7,
        videoId: 12,
        categories: ["music"],
        analyzedAt: 4,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    ],
  });

  assert.equal(next.status, "success");
  assert.equal(next.videos.length, 1);
  assert.equal(next.videos[0].videoId, 12);
  assert.equal(next.videos[0].category, "music");
});

test("normalizes empty category values to other instead of dropping videos", () => {
  const next = applyFolderCategoryAttempt(null, {
    folderId: 8,
    status: "success",
    lastError: null,
    startedAt: 10,
    finishedAt: 12,
    updatedAt: 12,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [
      {
        folderId: 8,
        videoId: 101,
        category: "",
        analyzedAt: 12,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
      {
        folderId: 8,
        videoId: 102,
        category: "sports",
        analyzedAt: 12,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    ],
  });

  assert.equal(next.videos.length, 2);
  assert.equal(next.videos[0].category, "other");
  assert.equal(next.videos[1].category, "sports");
});

test("uses snapshot folder id and treats whitespace timestamps as null", () => {
  const next = applyFolderCategoryAttempt(null, {
    folderId: 99,
    status: "success",
    lastError: null,
    startedAt: "   ",
    finishedAt: " \n ",
    updatedAt: 40,
    provider: "gemini",
    model: "gemini-2.5-flash",
    videos: [
      {
        folderId: 12345,
        videoId: 1,
        category: "music",
        analyzedAt: 41,
        provider: "gemini",
        model: "gemini-2.5-flash",
      },
    ],
  });

  assert.equal(next.startedAt, null);
  assert.equal(next.finishedAt, null);
  assert.equal(next.videos[0].folderId, 99);
});
