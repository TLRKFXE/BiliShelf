import type { AiCategoryKey, AiMeta, AiProvider } from "./ai-state.js";

export type AiSettingsResponse = {
  provider: AiProvider;
  customProviderName: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  apiKeySet: boolean;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  updatedAt: number;
};

export type VideoCategoryPayload = {
  category: AiCategoryKey;
};

export const STABLE_CATEGORY_KEYS: readonly AiCategoryKey[];
export function normalizeVideoCategoryPayload(payload: unknown): VideoCategoryPayload;
export const normalizeClassificationPayload: typeof normalizeVideoCategoryPayload;
export function maskApiKeyStateForResponse(state: Partial<AiMeta> & { apiKey?: string }): AiSettingsResponse;
