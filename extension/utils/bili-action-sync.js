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

export function extractBangumiSeasonId(raw) {
  const parsed = safeParseUrl(raw);
  if (!parsed) return "";
  const match = (parsed.pathname || "").match(/^\/bangumi\/play\/(ss[0-9A-Za-z]+)/i);
  if (!match) return "";
  return `ss${match[1].slice(2)}`.toLowerCase();
}

export function extractAudioId(raw) {
  const parsed = safeParseUrl(raw);
  if (!parsed) return "";
  const match = (parsed.pathname || "").match(/^\/audio\/(au[0-9A-Za-z]+)/i);
  if (!match) return "";
  return `au${match[1].slice(2)}`.toLowerCase();
}

export function isSpecialMediaUrl(rawUrl) {
  return Boolean(extractBangumiSeasonId(rawUrl) || extractAudioId(rawUrl));
}

export function extractAidFromAny(raw) {
  const value = String(raw || "");
  if (/^\d{5,15}$/.test(value.trim())) return Number.parseInt(value.trim(), 10) || 0;
  const match = value.match(/(?:^|[/?=&])(av)?(\d{5,15})(?=$|[/?&#])/i);
  if (!match) return 0;
  const token = match[1] || "";
  if (!token && !/(?:\/video\/|[?&](?:aid|oid)=)/i.test(value)) return 0;
  return Number.parseInt(match[2], 10) || 0;
}

export function isCollectorUiUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return false;
  const path = parsed.pathname || "";
  return (
    /^\/video\/(?:BV[0-9A-Za-z]+|av\d+)/i.test(path) ||
    /^\/list\/(?:watchlater|ml\d+)/i.test(path) ||
    /^\/bangumi\/play\/ss[0-9A-Za-z]+/i.test(path) ||
    /^\/audio\/au[0-9A-Za-z]+/i.test(path) ||
    (parsed.hostname.toLowerCase() === "t.bilibili.com" && /^\/\d+/.test(path))
  );
}

export function isDynamicVideoUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  return Boolean(
    parsed &&
      parsed.hostname.toLowerCase() === "t.bilibili.com" &&
      /^\/\d+/.test(parsed.pathname || "")
  );
}

export function isArticleUiUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return false;
  const hostname = parsed.hostname.toLowerCase();
  return (
    (hostname === "www.bilibili.com" || hostname === "bilibili.com") &&
    (/^\/opus\/\d+/i.test(parsed.pathname || "") ||
      /^\/read\/cv\d+/i.test(parsed.pathname || ""))
  );
}

export function extractOpusId(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return "";
  return (
    parsed.pathname.match(/^\/opus\/(\d+)/i)?.[1] ||
    parsed.pathname.match(/^\/read\/cv(\d+)/i)?.[1] ||
    ""
  );
}

export function isActionSyncPageUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed) return false;
  const hostname = parsed.hostname.toLowerCase();
  const path = parsed.pathname || "";
  if (hostname === "www.bilibili.com" || hostname === "bilibili.com") {
    if (/^\/video\/(?:BV[0-9A-Za-z]+|av\d+)/i.test(path)) return true;
    if (/^\/list\/watchlater/i.test(path)) return true;
    if (/^\/list\/ml/i.test(path)) return true;
    if (/^\/bangumi\/play\/ss[0-9A-Za-z]+/i.test(path)) return true;
    if (/^\/audio\/au[0-9A-Za-z]+/i.test(path)) return true;
    if (/^\/opus\/\d+/i.test(path) || /^\/read\/cv\d+/i.test(path)) return true;
  }
  if (hostname === "t.bilibili.com" && /^\/\d+/.test(path)) return true;
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
