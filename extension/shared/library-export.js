const BILI_SPACE_ORIGIN = "https://space.bilibili.com";

function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function buildBiliSpaceUrl(mid) {
  const text = normalizeText(mid);
  if (!/^\d+$/.test(text)) return null;
  if (Number(text) <= 0) return null;
  return `${BILI_SPACE_ORIGIN}/${text}`;
}

function normalizeUrlCandidate(value) {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(?:space|www|api)\.bilibili\.com\//i.test(value)) return `https://${value}`;
  return value;
}

function extractMidFromUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (host === "space.bilibili.com" && /^\d+$/.test(segments[0] || "")) {
      return segments[0];
    }
    if (host.endsWith("bilibili.com")) {
      if (segments[0] === "space" && /^\d+$/.test(segments[1] || "")) {
        return segments[1];
      }
      const mid = parsed.searchParams.get("mid");
      if (/^\d+$/.test(mid || "")) {
        return mid;
      }
    }
    return "";
  } catch {
    return "";
  }
}

export const LIBRARY_EXPORT_VIDEO_CSV_HEADER = Object.freeze([
  "bvid",
  "title",
  "uploader",
  "uploaderSpaceUrl",
  "description",
  "coverUrl",
  "bvidUrl",
  "partition",
  "publishAt",
  "publishAtMs",
  "favoriteAt",
  "favoriteAtMs",
  "folders",
  "customTags",
  "systemTags",
  "isInvalid",
  "deletedAt",
]);

export function normalizeBiliSpaceUrl(input, midFallback) {
  const value = normalizeUrlCandidate(normalizeText(input));
  const fallback = buildBiliSpaceUrl(midFallback);

  if (!value) return fallback;
  if (/^\d+$/.test(value)) return buildBiliSpaceUrl(value);

  const midFromUrl = extractMidFromUrl(value);
  if (midFromUrl) return buildBiliSpaceUrl(midFromUrl);

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function isFavoriteMediaInvalid(media) {
  const rawAttr = media && typeof media === "object" ? media.attr : undefined;
  if (typeof rawAttr === "number" && Number.isFinite(rawAttr)) {
    return rawAttr > 0;
  }
  if (typeof rawAttr === "string") {
    const parsed = Number(rawAttr.trim());
    if (Number.isFinite(parsed)) return parsed > 0;
  }

  const title = normalizeText(media && typeof media === "object" ? media.title : "");
  return (
    title.includes("\u5df2\u5931\u6548\u89c6\u9891") ||
    title.includes("\u89c6\u9891\u5931\u6548")
  );
}
