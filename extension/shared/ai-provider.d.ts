import type { AiMeta, AiProvider } from "./ai-state.js";

export type AiSettingsResponse = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  enabled: boolean;
  apiKeySet: boolean;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  updatedAt: number;
};

export type ClassificationPayload = {
  categories: string[];
  reasoningSnippet: string | null;
};

export type FolderSummaryPayload = {
  summary: string | null;
};

export function normalizeClassificationPayload(payload: unknown): ClassificationPayload;
export function normalizeFolderSummaryPayload(payload: unknown): FolderSummaryPayload;
export function maskApiKeyStateForResponse(state: Partial<AiMeta> & { apiKey?: string }): AiSettingsResponse;
