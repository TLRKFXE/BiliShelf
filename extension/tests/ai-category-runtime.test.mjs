import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  applyFolderCategoryAttempt,
  matchFolderAiCategoriesPath,
  runFolderAiCategories,
} from "../shared/ai-analysis.js";
import { categorizeFolderVideo } from "../shared/ai-category-runtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

test("runFolderAiCategories groups videos without generating summary fields", async () => {
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
      categorizeFolderVideo(
        {
          provider: "gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          apiKey: "test-key",
          model: "gemini-2.5-flash",
        },
        {
          folderId: 1,
          folderName: "Favorites",
          folderDescription: "",
          videos: [],
        },
        {
          videoId: 99,
          bvid: "BVTEST",
          title: "Test Video",
          uploader: "Uploader",
          description: "",
          publishAt: null,
          addedAt: null,
          customTags: [],
          systemTags: [],
        },
        {
          fetchImpl: async () => ({
            ok: false,
            status: 429,
            text: async () => provider429Body,
          }),
        },
      ),
    (error) => {
      assert.match(String(error?.message), /quota/i);
      assert.match(String(error?.message), /retry after 7s/i);
      assert.doesNotMatch(String(error?.message), /timeout/i);
      return true;
    },
  );
});

test("keeps non-quota 429 provider errors without rewriting to quota exceeded", async () => {
  const provider429Body = JSON.stringify({
    error: {
      code: 429,
      status: "RATE_LIMITED",
      message: "Too many requests. Please slow down.",
    },
  });

  await assert.rejects(
    () =>
      categorizeFolderVideo(
        {
          provider: "gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          apiKey: "test-key",
          model: "gemini-2.5-flash",
        },
        {
          folderId: 1,
          folderName: "Favorites",
          folderDescription: "",
          videos: [],
        },
        {
          videoId: 100,
          bvid: "BVTEST2",
          title: "Test Video 2",
          uploader: "Uploader",
          description: "",
          publishAt: null,
          addedAt: null,
          customTags: [],
          systemTags: [],
        },
        {
          fetchImpl: async () => ({
            ok: false,
            status: 429,
            text: async () => provider429Body,
          }),
        },
      ),
    (error) => {
      assert.match(String(error?.message), /too many requests/i);
      assert.doesNotMatch(String(error?.message), /quota exceeded/i);
      return true;
    },
  );
});

test("background temporarily disables ai categorization routes", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8",
  );

  assert.match(source, /const AI_CATEGORIES_ENABLED = false;/);
  assert.match(
    source,
    /if \(folderAiCategoryMatch\) \{\s*if \(!AI_CATEGORIES_ENABLED\) \{\s*return ok\(null\);/s,
  );
  assert.match(
    source,
    /if \(folderAiCategoryMatch && method === "POST"\) \{\s*if \(!AI_CATEGORIES_ENABLED\) \{\s*return fail\(403, "AI categorization is temporarily disabled"\);/s,
  );
  assert.match(
    source,
    /if \(folderAiCategoryWriteMatch && method === "DELETE"\) \{\s*if \(!AI_CATEGORIES_ENABLED\) \{\s*return fail\(403, "AI categorization is temporarily disabled"\);/s,
  );
});
