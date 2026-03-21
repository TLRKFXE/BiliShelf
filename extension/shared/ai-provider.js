import { normalizeAiProvider } from "./ai-state.js";

const DEFAULT_CATEGORY_KEY = "other";
const STABLE_CATEGORY_KEYS = new Set([
  "animation",
  "music",
  "dance",
  "game",
  "knowledge",
  "tech",
  "sports",
  "car",
  "life",
  "food",
  "animal",
  "fashion",
  "ent",
  "cinephile",
  "news",
  DEFAULT_CATEGORY_KEY,
]);

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

function normalizeCategoryKey(value) {
  const key = normalizeText(value).toLowerCase();
  return STABLE_CATEGORY_KEYS.has(key) ? key : DEFAULT_CATEGORY_KEY;
}

export function normalizeVideoCategoryPayload(payload) {
  const category =
    normalizeText(payload?.category) ||
    normalizeText(Array.isArray(payload?.categories) ? payload.categories[0] : "");
  return {
    category: normalizeCategoryKey(category),
  };
}

export const normalizeClassificationPayload = normalizeVideoCategoryPayload;

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
