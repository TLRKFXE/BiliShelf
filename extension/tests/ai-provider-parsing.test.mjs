import test from "node:test";
import assert from "node:assert/strict";

import {
  maskApiKeyStateForResponse,
  normalizeClassificationPayload,
} from "../shared/ai-provider.js";

test("normalizes classification response into categories array", async () => {
  const result = normalizeClassificationPayload({
    categories: ["Music", " Live ", "Music"],
    reasoningSnippet: "focus on live music",
  });

  assert.deepEqual(result.categories, ["Music", "Live"]);
  assert.equal(result.reasoningSnippet, "focus on live music");
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
