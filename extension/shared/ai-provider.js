import { normalizeAiProvider } from "./ai-state.js";

function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function toIntOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeCategoryList(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.map((item) => normalizeText(item)).filter(Boolean)),
  );
}

export function normalizeClassificationPayload(payload) {
  return {
    categories: normalizeCategoryList(payload?.categories),
    reasoningSnippet:
      normalizeText(payload?.reasoningSnippet ?? payload?.reasoning) || null,
  };
}

export function normalizeFolderSummaryPayload(payload) {
  return {
    summary:
      normalizeText(payload?.summary ?? payload?.folderSummary ?? payload?.text) ||
      null,
  };
}

export function maskApiKeyStateForResponse(state) {
  return {
    provider: normalizeAiProvider(state?.provider),
    baseUrl: normalizeText(state?.baseUrl),
    model: normalizeText(state?.model),
    enabled: Boolean(state?.enabled),
    apiKeySet: normalizeText(state?.apiKey).length > 0,
    lastTestAt: toIntOrNull(state?.lastTestAt),
    lastTestOk: Boolean(state?.lastTestOk),
    lastError: normalizeText(state?.lastError) || null,
    updatedAt: toIntOrNull(state?.updatedAt) ?? Date.now(),
  };
}
