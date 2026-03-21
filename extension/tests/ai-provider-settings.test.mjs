import test from "node:test";
import assert from "node:assert/strict";

import {
  getAiProviderPreset,
  listAiProviderModels,
  normalizeAiProviderBaseUrl,
} from "../shared/ai-provider-settings.js";

test("normalizes official provider base urls to stable roots", () => {
  assert.equal(
    normalizeAiProviderBaseUrl("gemini", "https://generativelanguage.googleapis.com"),
    "https://generativelanguage.googleapis.com/v1beta",
  );
  assert.equal(
    normalizeAiProviderBaseUrl("openai", "https://api.openai.com"),
    "https://api.openai.com/v1",
  );
  assert.equal(
    normalizeAiProviderBaseUrl("claude", "https://api.anthropic.com"),
    "https://api.anthropic.com/v1",
  );
});

test("returns built-in preset models without requiring network access", () => {
  const gemini = getAiProviderPreset("gemini");
  assert.equal(gemini.baseUrl, "https://generativelanguage.googleapis.com/v1beta");
  assert.ok(gemini.models.some((model) => model.id === "gemini-2.5-flash"));
});

test("lists gemini models from the models api and keeps only generateContent models", async () => {
  const calls = [];
  const result = await listAiProviderModels(
    {
      provider: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: "secret",
    },
    {
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              models: [
                {
                  name: "models/gemini-2.5-flash",
                  displayName: "Gemini 2.5 Flash",
                  supportedGenerationMethods: ["generateContent"],
                },
                {
                  name: "models/text-embedding-004",
                  displayName: "Embedding",
                  supportedGenerationMethods: ["embedContent"],
                },
              ],
            }),
        };
      },
    },
  );

  assert.equal(
    calls[0].url,
    "https://generativelanguage.googleapis.com/v1beta/models?key=secret",
  );
  assert.deepEqual(result.models, [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ]);
  assert.equal(result.source, "remote");
});

test("lists openai-compatible models from the models api", async () => {
  const result = await listAiProviderModels(
    {
      provider: "openai-compatible",
      baseUrl: "https://api.example.com",
      apiKey: "secret",
    },
    {
      fetchImpl: async () => ({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              { id: "model-b" },
              { id: "model-a" },
            ],
          }),
      }),
    },
  );

  assert.deepEqual(result.models, [
    { id: "model-a", label: "model-a" },
    { id: "model-b", label: "model-b" },
  ]);
});
