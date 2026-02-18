import type { LocationQuery } from "vue-router";

export function readSingleQueryValue(value: LocationQuery[string]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parsePositiveInt(
  raw: LocationQuery[string],
  fallback: number,
  allowed?: readonly number[]
) {
  const value = Number(readSingleQueryValue(raw));
  if (!Number.isFinite(value) || value <= 0) return fallback;
  if (allowed && !allowed.includes(value)) return fallback;
  return value;
}

export function parseNullableFolderId(raw: LocationQuery[string]) {
  const value = Number(readSingleQueryValue(raw));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function normalizeDateText(raw: LocationQuery[string]) {
  const value = readSingleQueryValue(raw);
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

export function isSameQuery(
  left: Record<string, string>,
  right: LocationQuery
) {
  const rightNormalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(right)) {
    const single = readSingleQueryValue(value);
    if (single == null || single === "") continue;
    rightNormalized[key] = String(single);
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(rightNormalized).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key, index) => key === rightKeys[index] && left[key] === rightNormalized[key]
  );
}
