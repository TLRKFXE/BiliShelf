function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizeCoverUrl(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^https?:\/\//i.test(trimmed)
      ? trimmed
      : "";
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeRecoveredInvalidVideoMetadata(input = {}) {
  return {
    title: normalizeText(input.title) || null,
    coverUrl: normalizeCoverUrl(input.coverUrl),
    description: normalizeText(input.description) || null,
  };
}

function mergeRecoveredInvalidVideoFields(video, recovered) {
  if (!video || !video.isInvalid) {
    return { changed: false, updates: {} };
  }

  const updates = {};
  let changed = false;

  if (recovered.title && recovered.title !== video.title) {
    video.title = recovered.title;
    updates.title = recovered.title;
    changed = true;
  }

  if (recovered.coverUrl && recovered.coverUrl !== video.coverUrl) {
    video.coverUrl = recovered.coverUrl;
    updates.coverUrl = recovered.coverUrl;
    changed = true;
  }

  if (
    recovered.description &&
    recovered.description !== video.description
  ) {
    video.description = recovered.description;
    updates.description = recovered.description;
    changed = true;
  }

  return { changed, updates };
}

export {
  normalizeRecoveredInvalidVideoMetadata,
  mergeRecoveredInvalidVideoFields,
};
