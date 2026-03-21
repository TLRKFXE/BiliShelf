function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

export function formatAiProviderErrorMessage(statusCode, responseText) {
  const fallback = normalizeText(responseText) || `AI request failed (${statusCode})`;
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object") return fallback;

  const rootError =
    parsed.error && typeof parsed.error === "object" ? parsed.error : parsed;
  const code = Number(rootError.code);
  const providerStatus = normalizeText(rootError.status).toUpperCase();
  const providerMessage = normalizeText(rootError.message);
  const details = Array.isArray(rootError.details) ? rootError.details : [];

  let retryDelay = "";
  for (const detail of details) {
    if (!detail || typeof detail !== "object") continue;
    const candidate = normalizeText(detail.retryDelay);
    if (candidate) {
      retryDelay = candidate;
      break;
    }
  }

  const isQuotaError =
    statusCode === 429 ||
    code === 429 ||
    providerStatus === "RESOURCE_EXHAUSTED" ||
    providerStatus.includes("QUOTA") ||
    providerMessage.toLowerCase().includes("quota");
  if (!isQuotaError) return fallback;

  const retrySuffix = retryDelay ? ` Retry after ${retryDelay}.` : "";
  const detailSuffix = providerMessage ? ` ${providerMessage}` : "";
  return `AI provider quota exceeded.${detailSuffix}${retrySuffix}`.trim();
}
