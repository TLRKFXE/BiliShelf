function safeParseUrl(input) {
  try {
    return new URL(String(input || ""));
  } catch {
    return null;
  }
}

export function normalizeBvidToken(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const match = value.match(/(BV[0-9A-Za-z]{10})/i);
  const token = match?.[1] || "";
  if (!token) return "";
  return `${token.slice(0, 2).toUpperCase()}${token.slice(2)}`;
}

export function extractBvidFromAny(raw) {
  return normalizeBvidToken(raw);
}

export function isCollectorUiUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return false;
  const path = parsed.pathname || "";
  return (
    /^\/video\/BV[0-9A-Za-z]+/i.test(path) || /^\/list\/watchlater/i.test(path)
  );
}

export function isActionSyncPageUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return false;
  const hostname = parsed.hostname.toLowerCase();
  const path = parsed.pathname || "";
  if (hostname === "www.bilibili.com") {
    if (/^\/video\/BV[0-9A-Za-z]+/i.test(path)) return true;
    if (/^\/list\/watchlater/i.test(path)) return true;
    if (/^\/list\/ml/i.test(path)) return true;
  }
  if (hostname === "space.bilibili.com") {
    if (/^\/\d+\/favlist/i.test(path)) return true;
  }
  return false;
}

export function containsFavoriteActionKeyword(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized) return false;

  const hasStrongAction =
    /(?:取消收藏|移除|删除|移动|复制|unfavorite|remove|delete|move|copy)/i.test(
      normalized
    );
  if (hasStrongAction) return true;

  const hasFavorite = /(?:收藏|favorite|fav)/i.test(normalized);
  if (!hasFavorite) return false;

  // "收藏夹" is usually a noun label rather than an action button.
  const hasFolderNoun =
    /收藏夹/i.test(normalized) || /favorite\s*folder/i.test(normalized);
  if (hasFolderNoun) return false;

  return true;
}

export function extractFavoriteFolderIdFromUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return 0;
  if (parsed.hostname.toLowerCase() === "www.bilibili.com") {
    const listMatch = parsed.pathname.match(/^\/list\/ml(\d+)/i);
    if (listMatch) {
      return Number.parseInt(listMatch[1], 10) || 0;
    }
  }
  const query = parsed.searchParams;
  const fid = Number.parseInt(query.get("fid") || "", 10);
  if (Number.isFinite(fid) && fid > 0) return fid;
  const mediaId = Number.parseInt(query.get("media_id") || "", 10);
  if (Number.isFinite(mediaId) && mediaId > 0) return mediaId;
  return 0;
}
