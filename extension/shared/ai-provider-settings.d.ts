import type { AiProvider } from "./ai-state.js";

export type AiModelOption = {
  id: string;
  label: string;
};

export type AiProviderPreset = {
  provider: AiProvider;
  baseUrl: string;
  models: AiModelOption[];
  supportsRemoteFetch: boolean;
};

export function getAiProviderPreset(provider: unknown): AiProviderPreset;
export function normalizeAiProviderBaseUrl(
  provider: unknown,
  rawUrl: unknown
): string;
export function listAiProviderModels(
  config: {
    provider?: unknown;
    baseUrl?: unknown;
    apiKey?: unknown;
  },
  options?: {
    fetchImpl?: typeof fetch;
  }
): Promise<
  AiProviderPreset & {
    source: "builtin" | "remote";
  }
>;
