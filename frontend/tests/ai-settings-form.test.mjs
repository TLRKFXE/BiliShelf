import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAiSettingsPayload,
  mergeAiModelOptions,
  resolveAiSettingsProviderId,
} from "../src/lib/ai-settings-form.js";

test("maps saved custom provider metadata back to the custom form mode", () => {
  assert.equal(
    resolveAiSettingsProviderId({
      provider: "openai-compatible",
      customProviderName: "My Provider",
    }),
    "custom",
  );
});

test("builds custom provider payloads as openai-compatible runtime settings", () => {
  assert.deepEqual(
    buildAiSettingsPayload({
      providerId: "custom",
      customProviderName: "My Provider",
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret",
      model: "model-a",
      enabled: true,
    }),
    {
      provider: "openai-compatible",
      customProviderName: "My Provider",
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret",
      model: "model-a",
      enabled: true,
    },
  );
});

test("keeps the current model available when refreshed options do not contain it", () => {
  const options = mergeAiModelOptions("model-z", [
    { id: "model-a", label: "Model A" },
  ]);

  assert.deepEqual(options, [
    { id: "model-z", label: "model-z" },
    { id: "model-a", label: "Model A" },
  ]);
});
