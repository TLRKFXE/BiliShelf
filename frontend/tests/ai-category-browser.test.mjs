import test from "node:test";
import assert from "node:assert/strict";

import {
  canOpenAiCategoryBrowser,
  loadAllAiBrowserVideos,
} from "../src/lib/ai-category-browser.js";

test("loads every reported page for large ai category browser folders", async () => {
  const seenPages = [];

  const videos = await loadAllAiBrowserVideos({
    folderId: 7,
    pageSize: 100,
    fetchPage: async ({ page, pageSize }) => {
      seenPages.push(page);
      const remaining = 50_000 - (page - 1) * pageSize;
      const count = Math.max(0, Math.min(pageSize, remaining));
      return {
        items: Array.from({ length: count }, (_, index) => ({
          id: (page - 1) * pageSize + index + 1,
        })),
        pagination: {
          total: 50_000,
        },
      };
    },
  });

  assert.equal(seenPages[0], 1);
  assert.equal(seenPages.at(-1), 500);
  assert.equal(seenPages.length, 500);
  assert.equal(videos.length, 50_000);
});

test("does not open ai category browser for empty results", () => {
  assert.equal(canOpenAiCategoryBrowser(null), false);
  assert.equal(
    canOpenAiCategoryBrowser({
      folderId: 7,
      status: "error",
      lastError: "quota exceeded",
      startedAt: 1,
      finishedAt: 2,
      updatedAt: 2,
      provider: "gemini",
      model: "gemini-2.5-flash",
      videos: [],
    }),
    false
  );
});

test("allows ai category browser when rerun errors but preserved categorized videos exist", () => {
  assert.equal(
    canOpenAiCategoryBrowser({
      folderId: 7,
      status: "error",
      lastError: "quota exceeded",
      startedAt: 1,
      finishedAt: 2,
      updatedAt: 2,
      provider: "gemini",
      model: "gemini-2.5-flash",
      videos: [
        {
          videoId: 11,
          category: "tech",
          analyzedAt: 2,
          provider: "gemini",
          model: "gemini-2.5-flash",
        },
      ],
    }),
    true
  );
});
