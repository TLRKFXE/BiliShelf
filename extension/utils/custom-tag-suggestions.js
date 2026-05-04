function normalizeTagText(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeTagKey(value) {
  return normalizeTagText(value).toLocaleLowerCase();
}

export function resolveCustomTagInputState(raw) {
  const source = String(raw || "");
  const parts = source.split(",");
  const activeToken = normalizeTagText(parts.pop() ?? "");
  const normalizedTags = [];
  const seen = new Set();

  for (const part of parts) {
    const tag = normalizeTagText(part);
    if (!tag) continue;
    const key = normalizeTagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    normalizedTags.push(tag);
  }

  return {
    normalizedTags,
    activeToken,
  };
}

export function findMatchingCustomTagSuggestions(candidates, rawInput, limit = 8) {
  const { normalizedTags, activeToken } = resolveCustomTagInputState(rawInput);
  const selectedKeys = new Set(normalizedTags.map((tag) => normalizeTagKey(tag)));
  const activeKey = normalizeTagKey(activeToken);
  const results = [];
  const seen = new Set();

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const normalized = normalizeTagText(candidate);
    if (!normalized) continue;
    const key = normalizeTagKey(normalized);
    if (!key || seen.has(key) || selectedKeys.has(key)) continue;
    if (activeKey && !key.includes(activeKey)) continue;
    seen.add(key);
    results.push(normalized);
    if (results.length >= limit) break;
  }

  return results;
}

export function appendSuggestedCustomTag(rawInput, suggestion) {
  const source = String(rawInput || "");
  const normalizedSuggestion = normalizeTagText(suggestion);
  if (!normalizedSuggestion) {
    return source.trim();
  }

  const { normalizedTags, activeToken } = resolveCustomTagInputState(rawInput);
  const suggestionKey = normalizeTagKey(normalizedSuggestion);
  const rawParts = source
    .split(",")
    .map((part) => normalizeTagText(part))
    .filter(Boolean);
  const keys = new Set(rawParts.map((tag) => normalizeTagKey(tag)));
  const activeTokenKey = normalizeTagKey(activeToken);

  if (activeToken) {
    if (activeTokenKey === suggestionKey) {
      return [...normalizedTags, normalizedSuggestion].join(", ");
    }

    if (activeTokenKey && suggestionKey.includes(activeTokenKey)) {
      return [...normalizedTags, normalizedSuggestion].join(", ");
    }
  }

  if (keys.has(suggestionKey)) {
    return rawParts.join(", ");
  }

  return [...rawParts, normalizedSuggestion]
    .filter((tag, index, list) => {
      const key = normalizeTagKey(tag);
      return list.findIndex((item) => normalizeTagKey(item) === key) === index;
    })
    .join(", ");
}
