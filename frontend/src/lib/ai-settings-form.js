function normalizeText(value) {
  return String(value ?? "").trim();
}

export function resolveAiSettingsProviderId(settings) {
  const provider = normalizeText(settings?.provider).toLowerCase();
  const customProviderName = normalizeText(settings?.customProviderName);
  if (provider === "openai-compatible" && customProviderName) {
    return "custom";
  }
  return provider || "openai-compatible";
}

export function buildAiSettingsPayload(input) {
  const providerId = normalizeText(input?.providerId).toLowerCase();
  const isCustom = providerId === "custom";
  return {
    provider: isCustom ? "openai-compatible" : providerId || "openai-compatible",
    customProviderName: isCustom ? normalizeText(input?.customProviderName) : "",
    baseUrl: normalizeText(input?.baseUrl),
    apiKey: normalizeText(input?.apiKey) || undefined,
    model: normalizeText(input?.model),
    enabled: Boolean(input?.enabled),
  };
}

export function mergeAiModelOptions(currentModel, options) {
  const normalizedCurrent = normalizeText(currentModel);
  const seen = new Set();
  const merged = [];

  if (normalizedCurrent) {
    seen.add(normalizedCurrent);
    merged.push({
      id: normalizedCurrent,
      label: normalizedCurrent,
    });
  }

  for (const option of Array.isArray(options) ? options : []) {
    const id = normalizeText(option?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push({
      id,
      label: normalizeText(option?.label) || id,
    });
  }

  return merged;
}
