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
      apiKey: 123,
      folderAnalyses: null,
      videoAnalyses: undefined,
    },
    1234,
  );

  assert.equal(state.provider, "openai-compatible");
  assert.equal(state.apiKey, "123");
  assert.deepEqual(state.folderAnalyses, []);
  assert.deepEqual(state.videoAnalyses, []);
  assert.equal(state.updatedAt, 1234);
});
