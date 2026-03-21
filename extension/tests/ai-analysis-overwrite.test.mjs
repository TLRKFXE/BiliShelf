import test from "node:test";
import assert from "node:assert/strict";

import * as aiAnalysis from "../shared/ai-analysis.js";

test("failed rerun preserves previous successful category result", () => {
  assert.equal(typeof aiAnalysis.applyFolderCategoryAttempt, "function");

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

  const next = aiAnalysis.applyFolderCategoryAttempt(
    previousSuccess,
    failedAttempt,
  );

  assert.deepEqual(next.videos, previousSuccess.videos);
  assert.equal(next.status, "error");
  assert.equal(next.lastError, "provider timeout");
  assert.equal(next.startedAt, failedAttempt.startedAt);
  assert.equal(next.finishedAt, failedAttempt.finishedAt);
});
