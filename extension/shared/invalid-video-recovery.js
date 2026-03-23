function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCoverUrl(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return trimmed;
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
