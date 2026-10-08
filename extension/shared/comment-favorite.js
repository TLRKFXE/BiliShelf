function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeDigits(value) {
  const match = normalizeText(value).match(/\d{1,32}/);
  return match?.[0] ?? "";
}

function normalizeHttpUrl(value) {
  const source = normalizeText(value);
  if (!source) return "";
  try {
    const url = new URL(source.startsWith("//") ? `https:${source}` : source);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function fingerprintText(value) {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export function parseBilibiliCount(value) {
  const text = normalizeText(value).replace(/,/g, "");
  const match = text.match(/(\d+(?:\.\d+)?)\s*([万亿]?)/);
  if (!match) return 0;
  const multiplier = match[2] === "亿" ? 100_000_000 : match[2] === "万" ? 10_000 : 1;
  return Math.max(0, Math.round(Number(match[1]) * multiplier));
}

export function parseCommentPublishedAt(value, nowValue = Date.now()) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.trunc(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
  }
  const text = normalizeText(value);
  if (!text) return null;
  if (/刚刚/.test(text)) return nowValue;
  const relative = text.match(/(\d+)\s*(秒|分钟|小时|天)前/);
  if (relative) {
    const unitMs = {
      秒: 1000,
      分钟: 60_000,
      小时: 3_600_000,
      天: 86_400_000,
    }[relative[2]];
    return nowValue - Number(relative[1]) * unitMs;
  }
  if (/昨天/.test(text)) return nowValue - 86_400_000;

  const normalized = text
    .replace(/年|\//g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\s+/g, " ");
  const withYear = /^\d{1,2}-\d{1,2}(?:\s|$)/.test(normalized)
    ? `${new Date(nowValue).getFullYear()}-${normalized}`
    : normalized;
  const parsed = Date.parse(withYear);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createCommentSourceKey(raw) {
  const rpid = normalizeDigits(raw?.rpid);
  if (rpid) return `rpid:${rpid}`;
  const payload = [
    // Bilibili BV IDs are case-sensitive; preserve the identifier exactly.
    normalizeText(raw?.bvid),
    normalizeDigits(raw?.authorMid),
    normalizeText(raw?.content).replace(/\s+/g, " ").slice(0, 20_000),
    (Array.isArray(raw?.contentImageUrls) ? raw.contentImageUrls : [])
      .map(normalizeHttpUrl)
      .filter(Boolean)
      .join("\u001e"),
  ].join("\u001f");
  return `comment:${fingerprintText(payload)}`;
}

export function buildCommentSourceUrl(raw) {
  const base = normalizeHttpUrl(raw?.videoUrl || raw?.sourceUrl);
  if (!base) return "";
  const rpid = normalizeDigits(raw?.rpid);
  const rootRpid = normalizeDigits(raw?.rootRpid) || rpid;
  if (!rootRpid) return base;
  const url = new URL(base);
  url.searchParams.set("comment_on", "1");
  url.searchParams.set("comment_root_id", rootRpid);
  if (rpid && rpid !== rootRpid) {
    url.searchParams.set("comment_secondary_id", rpid);
  }
  url.hash = `reply${rpid || rootRpid}`;
  return url.toString();
}

export function normalizeFavoriteComment(raw, nowValue = Date.now()) {
  const content = normalizeText(raw?.content).replace(/\r\n/g, "\n").slice(0, 20_000);
  const contentImageUrls = Array.from(
    new Set(
      (Array.isArray(raw?.contentImageUrls) ? raw.contentImageUrls : [])
        .map(normalizeHttpUrl)
        .filter(Boolean),
    ),
  ).slice(0, 9);
  if (!content && contentImageUrls.length === 0) {
    throw new Error("Comment content or image is required");
  }
  const rpid = normalizeDigits(raw?.rpid);
  const rootRpid = normalizeDigits(raw?.rootRpid) || rpid;
  const bvidMatch = normalizeText(raw?.bvid).match(/BV[0-9A-Za-z]+/i);
  const videoUrl = normalizeHttpUrl(raw?.videoUrl || raw?.sourceUrl);
  const normalized = {
    sourceKey: "",
    rpid,
    rootRpid,
    bvid: bvidMatch?.[0] ?? "",
    videoTitle: normalizeText(raw?.videoTitle).slice(0, 500),
    videoUrl,
    sourceUrl: "",
    content,
    contentImageUrls,
    authorName: normalizeText(raw?.authorName).slice(0, 200) || "Unknown user",
    authorMid: normalizeDigits(raw?.authorMid),
    authorAvatarUrl: normalizeHttpUrl(raw?.authorAvatarUrl),
    authorSpaceUrl: normalizeHttpUrl(raw?.authorSpaceUrl),
    replyToName: normalizeText(raw?.replyToName).slice(0, 200),
    likeCount: Math.max(0, Math.trunc(Number(raw?.likeCount) || 0)),
    publishedAt: parseCommentPublishedAt(
      raw?.publishedAt ?? raw?.publishedAtText,
      nowValue,
    ),
    publishedAtText: normalizeText(raw?.publishedAtText).slice(0, 120),
  };
  normalized.sourceKey = createCommentSourceKey(normalized);
  normalized.sourceUrl = buildCommentSourceUrl({
    ...normalized,
    sourceUrl: raw?.sourceUrl,
  });
  return normalized;
}
