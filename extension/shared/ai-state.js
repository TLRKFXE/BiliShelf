const AI_PROVIDERS = new Set([
  "openai",
  "gemini",
  "claude",
  "grok",
  "deepseek",
  "kimi",
  "openai-compatible",
]);
const DEFAULT_CATEGORY_KEY = "other";

function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toIntOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function normalizeAiProvider(value) {
  const normalized = normalizeText(value).toLowerCase();
  return AI_PROVIDERS.has(normalized) ? normalized : "openai-compatible";
}

function normalizeFolderAnalysisRecord(record, nowValue) {
  const folderId = toInt(record?.folderId, 0);
  if (folderId <= 0) return null;

  const status = normalizeText(record?.status);
  return {
    folderId,
    status:
      status === "running" ||
      status === "success" ||
      status === "error" ||
      status === "idle"
        ? status
        : "idle",
    lastError: normalizeText(record?.lastError) || null,
    startedAt: toIntOrNull(record?.startedAt),
    finishedAt: toIntOrNull(record?.finishedAt),
    updatedAt: toInt(record?.updatedAt, nowValue),
    provider: normalizeAiProvider(record?.provider),
    model: normalizeText(record?.model),
  };
}

function normalizeVideoAnalysisRecord(record) {
  const folderId = toInt(record?.folderId, 0);
  const videoId = toInt(record?.videoId, 0);
  const category =
    normalizeText(record?.category) ||
    normalizeText(Array.isArray(record?.categories) ? record.categories[0] : "") ||
    DEFAULT_CATEGORY_KEY;
  if (folderId <= 0 || videoId <= 0) return null;

  return {
    folderId,
    videoId,
    category,
    analyzedAt: toIntOrNull(record?.analyzedAt),
    provider: normalizeAiProvider(record?.provider),
    model: normalizeText(record?.model),
  };
}

export function createDefaultAiState(nowValue = Date.now()) {
  return {
    provider: "openai-compatible",
    baseUrl: "",
    apiKey: "",
    model: "",
    enabled: false,
    lastTestAt: null,
    lastTestOk: false,
    lastError: null,
    updatedAt: nowValue,
    folderAnalyses: [],
    videoAnalyses: [],
  };
}

export function normalizeAiState(rawState, nowValue = Date.now()) {
  const base = createDefaultAiState(nowValue);
  return {
    provider: normalizeAiProvider(rawState?.provider),
    baseUrl: normalizeText(rawState?.baseUrl),
    apiKey: String(rawState?.apiKey ?? ""),
    model: normalizeText(rawState?.model),
    enabled: Boolean(rawState?.enabled),
    lastTestAt: toIntOrNull(rawState?.lastTestAt),
    lastTestOk: Boolean(rawState?.lastTestOk),
    lastError: normalizeText(rawState?.lastError) || null,
    updatedAt: toInt(rawState?.updatedAt, base.updatedAt),
    folderAnalyses: Array.isArray(rawState?.folderAnalyses)
      ? rawState.folderAnalyses
          .map((record) => normalizeFolderAnalysisRecord(record, base.updatedAt))
          .filter(Boolean)
      : [],
    videoAnalyses: Array.isArray(rawState?.videoAnalyses)
      ? rawState.videoAnalyses
          .map((record) => normalizeVideoAnalysisRecord(record))
          .filter(Boolean)
      : [],
  };
}
