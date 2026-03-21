import test from "node:test";
import assert from "node:assert/strict";

import {
  maskApiKeyStateForResponse,
  STABLE_CATEGORY_KEYS,
  normalizeVideoCategoryPayload,
} from "../shared/ai-provider.js";

test("normalizes category response into a single category key", () => {
  const result = normalizeVideoCategoryPayload({ category: "tech" });
  assert.equal(result.category, "tech");
});

test("falls back to other when category output is invalid or empty", () => {
  assert.equal(
    normalizeVideoCategoryPayload({ category: "" }).category,
    "other",
  );
  assert.equal(
    normalizeVideoCategoryPayload({ category: "not-a-real-key" }).category,
    "other",
  );
});

test("exports stable category keys for prompt/runtime alignment", () => {
  assert.ok(Array.isArray(STABLE_CATEGORY_KEYS));
  assert.ok(STABLE_CATEGORY_KEYS.includes("tech"));
  assert.ok(STABLE_CATEGORY_KEYS.includes("other"));
  assert.equal(new Set(STABLE_CATEGORY_KEYS).size, STABLE_CATEGORY_KEYS.length);
});

test("masks raw api key state for settings responses", () => {
  const result = maskApiKeyStateForResponse({
    provider: "openai-compatible",
    baseUrl: "https://example.com/v1",
    apiKey: "secret",
    model: "gpt-test",
    enabled: true,
    lastTestAt: 99,
    lastTestOk: true,
    lastError: "",
    updatedAt: 100,
  });

  assert.equal(result.apiKeySet, true);
  assert.equal("apiKey" in result, false);
  assert.equal(result.provider, "openai-compatible");
});
