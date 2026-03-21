import test from "node:test";
import assert from "node:assert/strict";

import {
  applyFolderCategoryAttempt,
  matchFolderAiCategoriesPath,
  runFolderAiCategories,
} from "../shared/ai-analysis.js";

test("runFolderAiCategories groups videos without generating a folder summary", async () => {
  const input = {
    folderId: 7,
    folderName: "Favorites",
    folderDescription: "",
    videos: [
      {
        videoId: 101,
        title: "Video A",
        uploader: "Uploader A",
        description: "",
        customTags: [],
        systemTags: [],
      },
      {
        videoId: 102,
        title: "Video B",
        uploader: "Uploader B",
        description: "",
        customTags: [],
        systemTags: [],
      },
      {
        videoId: 103,
        title: "Video C",
        uploader: "Uploader C",
        description: "",
        customTags: [],
        systemTags: [],
      },
    ],
  };

  const categoryByVideo = new Map([
    [101, "music"],
    [102, "tech"],
    [103, "sports"],
  ]);

  const result = await runFolderAiCategories({
    folderId: 7,
    input,
    provider: "gemini",
    model: "gemini-2.5-flash",
    now: () => 1234,
    classifyVideo: async (_ctx, video) => ({
      category: categoryByVideo.get(video.videoId),
    }),
  });

  assert.equal(result.folderId, 7);
  assert.equal(result.status, "success");
  assert.equal("summary" in result, false);
  assert.deepEqual(
    result.videos.map((video) => ({
      videoId: video.videoId,
      category: video.category,
    })),
    [
      { videoId: 101, category: "music" },
      { videoId: 102, category: "tech" },
      { videoId: 103, category: "sports" },
    ],
  );
  assert.equal(
    result.videos.every((video) => "summary" in video === false),
    true,
  );
});

test("category rerun failure keeps previous successful categorized videos", () => {
  const previousSuccess = {
    folderId: 7,
    status: "success",
    lastError: null,
    startedAt: 100,
    finishedAt: 120,
    updatedAt: 120,
    provider: "openai",
    model: "gpt-4.1-mini",
    videos: [
      {
        folderId: 7,
        videoId: 11,
        category: "music",
        analyzedAt: 111,
        provider: "openai",
        model: "gpt-4.1-mini",
      },
      {
        folderId: 7,
        videoId: 12,
        category: "tech",
        analyzedAt: 112,
        provider: "openai",
        model: "gpt-4.1-mini",
      },
    ],
  };

  const failedAttempt = {
    folderId: 7,
    status: "error",
    lastError: "provider timeout",
    startedAt: 200,
    finishedAt: 205,
    updatedAt: 205,
    provider: "openai",
    model: "gpt-4.1-mini",
    videos: [],
  };

  const next = applyFolderCategoryAttempt(previousSuccess, failedAttempt);

  assert.deepEqual(next.videos, previousSuccess.videos);
  assert.equal(next.status, "error");
  assert.equal(next.lastError, "provider timeout");
  assert.equal(next.startedAt, 200);
  assert.equal(next.finishedAt, 205);
  assert.equal("summary" in next, false);
});

test("matchFolderAiCategoriesPath supports preferred route and legacy alias", () => {
  const preferred = matchFolderAiCategoriesPath("/folders/42/ai-categories");
  const legacy = matchFolderAiCategoriesPath("/folders/42/ai-analysis");
  const invalid = matchFolderAiCategoriesPath("/folders/42/ai-summary");

  assert.ok(preferred);
  assert.ok(legacy);
  assert.equal(preferred?.[1], "42");
  assert.equal(legacy?.[1], "42");
  assert.equal(invalid, null);
});

test("returns provider quota error instead of a generic timeout message", async () => {
  const input = {
    folderId: 42,
    folderName: "Test Folder",
    folderDescription: "",
    videos: [
      {
        videoId: 9001,
        title: "Test Video",
        uploader: "Uploader",
        description: "",
        customTags: [],
        systemTags: [],
      },
    ],
  };

  const provider429Body = JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      message: "Resource has been exhausted.",
      details: [{ retryDelay: "7s" }],
    },
  });

  await assert.rejects(
    () =>
      runFolderAiCategories({
        folderId: 42,
        input,
        provider: "gemini",
        model: "gemini-2.5-flash",
        now: () => 1234,
        classifyVideo: async () => {
          throw new Error(provider429Body);
        },
      }),
    (error) => {
      assert.match(String(error?.message), /quota/i);
      assert.doesNotMatch(String(error?.message), /timeout/i);
      return true;
    },
  );
});
