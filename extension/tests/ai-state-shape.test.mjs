import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultAiState, normalizeAiState } from "../shared/ai-state.js";

test("default ai state is initialized with safe values", () => {
  const state = createDefaultAiState();
  assert.equal(state.enabled, false);
  assert.equal(state.apiKey, "");
  assert.deepEqual(state.folderAnalyses, []);
});

test("normalize ai state fills missing arrays and coerces provider fields", () => {
  const state = normalizeAiState(
    {
      provider: "invalid-provider",
      customProviderName: 456,
      apiKey: 123,
      folderAnalyses: null,
      videoAnalyses: undefined,
    },
    1234,
  );

  assert.equal(state.provider, "openai-compatible");
  assert.equal(state.customProviderName, "456");
  assert.equal(state.apiKey, "123");
  assert.deepEqual(state.folderAnalyses, []);
  assert.deepEqual(state.videoAnalyses, []);
  assert.equal(state.updatedAt, 1234);
});

test("normalize ai state migrates legacy categories and fills missing category with other", () => {
  const state = normalizeAiState(
    {
      videoAnalyses: [
        {
          folderId: 7,
          videoId: 11,
          category: "",
          categories: ["music"],
          analyzedAt: 123,
          provider: "gemini",
          model: "gemini-2.5-flash",
        },
        {
          folderId: 7,
          videoId: 12,
          analyzedAt: 124,
          provider: "gemini",
          model: "gemini-2.5-flash",
        },
      ],
    },
    2000,
  );

  assert.equal(state.videoAnalyses.length, 2);
  assert.equal(state.videoAnalyses[0].category, "music");
  assert.equal(state.videoAnalyses[1].category, "other");
});
