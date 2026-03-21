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
  assert.equal(next.lastError, "quota exceeded");
});
