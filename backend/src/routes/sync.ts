import { and, eq, isNull, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { folderItems, folders, tags, videoTags, videos } from "../db/schema.js";

const BLOCKED_SYSTEM_TAGS = new Set(["uncategorized", "未分类"]);
const BILI_ORIGIN = "https://www.bilibili.com";
const BILI_NAV_API = "https://api.bilibili.com/x/web-interface/nav";
const BILI_FOLDERS_API = "https://api.bilibili.com/x/v3/fav/folder/created/list-all";
const BILI_FOLDER_VIDEOS_API = "https://api.bilibili.com/x/v3/fav/resource/list";
const BILI_ARCHIVE_TAGS_API = "https://api.bilibili.com/x/tag/archive/tags";
const DEFAULT_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";

const syncFromBiliSchema = z.object({
  cookie: z.string().trim().max(8192).optional(),
  selectedRemoteFolderIds: z.array(z.coerce.number().int().positive()).max(200).optional(),
  offset: z.coerce.number().int().min(0).max(20000).default(0),
  startPage: z.coerce.number().int().min(1).max(20000).default(1),
  includeTagEnrichment: z.coerce.boolean().default(true),
  maxFolders: z.coerce.number().int().min(1).max(500).optional(),
  maxPagesPerFolder: z.coerce.number().int().min(1).max(200).default(5),
  maxVideosPerFolder: z.coerce.number().int().min(1).max(5000).default(200)
});

const syncFolderListSchema = z.object({
  cookie: z.string().trim().max(8192).optional()
});

const exportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json")
});

const importBodySchema = z.object({
  format: z.enum(["json", "csv"]),
  content: z.string().min(2).max(20_000_000)
});

type BiliApiResponse<T> = {
  code: number;
  message?: string;
  msg?: string;
  data: T;
};

type BiliNavData = {
  isLogin?: boolean;
  mid?: number;
};

type BiliFolder = {
  id?: number;
  media_id?: number;
  title?: string;
  media_count?: number;
};

type BiliFolderListData = {
  list?: BiliFolder[];
};

type BiliMediaUpper = {
  name?: string;
  mid?: number;
  space?: string;
};

type BiliMediaTag = {
  tag_name?: string;
  name?: string;
};

type BiliMedia = {
  bvid?: string;
  title?: string;
  cover?: string;
  upper?: BiliMediaUpper;
  intro?: string;
  ctime?: number;
  pubtime?: number;
  fav_time?: number;
  link?: string;
  tname?: string;
  tags?: BiliMediaTag[];
};

type BiliFolderVideoListData = {
  medias?: BiliMedia[];
  has_more?: boolean;
  info?: {
    media_count?: number;
  };
};

type BiliArchiveTag = {
  tag_name?: string;
  tag_name_v2?: string;
  name?: string;
};

type ImportVideoRow = {
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  uploaderSpaceUrl: string | null;
  description: string;
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean;
  partition: string;
  addedAt: number;
  folders: string[];
  customTags: string[];
  systemTags: string[];
};

function uniqueTextList(items: unknown[]) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const item of items) {
    const text = normalizeText(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    values.push(text);
  }
  return values;
}

function parsePipeList(raw: unknown) {
  return uniqueTextList(
    String(raw ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseCsvRows(content: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      current.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

function parseImportRows(format: "json" | "csv", content: string) {
  const now = Date.now();
  const rows: ImportVideoRow[] = [];
  let skipped = 0;

  const pushRow = (row: Partial<ImportVideoRow>) => {
    const bvid = normalizeText(row.bvid);
    const title = normalizeText(row.title);
    const bvidUrl = normalizeBiliVideoUrl(row.bvidUrl, bvid);
    if (!bvid || !title || !bvidUrl) {
      skipped += 1;
      return;
    }

    rows.push({
      bvid,
      title,
      coverUrl: normalizeCoverUrl(row.coverUrl),
      uploader: normalizeText(row.uploader) || "Unknown uploader",
      uploaderSpaceUrl: normalizeBiliSpaceUrl(row.uploaderSpaceUrl),
      description: normalizeText(row.description),
      publishAt: parseTimestampInput(row.publishAt),
      bvidUrl,
      isInvalid: Boolean(row.isInvalid),
      partition: normalizeText(row.partition) || "uncategorized",
      addedAt: parseTimestampInput(row.addedAt) ?? now,
      folders: uniqueTextList((row.folders ?? []) as unknown[]),
      customTags: uniqueTextList((row.customTags ?? []) as unknown[]),
      systemTags: uniqueTextList((row.systemTags ?? []) as unknown[])
    });
  };

  if (format === "json") {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const jsonVideos = Array.isArray(parsed?.videos) ? parsed.videos as Array<Record<string, unknown>> : [];
    const jsonFolders = Array.isArray(parsed?.folders) ? parsed.folders as Array<Record<string, unknown>> : [];
    const jsonFolderItems = Array.isArray(parsed?.folderItems) ? parsed.folderItems as Array<Record<string, unknown>> : [];
    const jsonTags = Array.isArray(parsed?.tags) ? parsed.tags as Array<Record<string, unknown>> : [];
    const jsonVideoTags = Array.isArray(parsed?.videoTags) ? parsed.videoTags as Array<Record<string, unknown>> : [];

    const folderNameById = new Map<number, string>();
    for (const folder of jsonFolders) {
      const id = Number(folder.id);
      const name = normalizeText(folder.name);
      if (Number.isFinite(id) && id > 0 && name) {
        folderNameById.set(Math.trunc(id), name);
      }
    }

    const tagById = new Map<number, { name: string; type: "system" | "custom" }>();
    for (const tag of jsonTags) {
      const id = Number(tag.id);
      const name = normalizeText(tag.name);
      const type = tag.type === "system" ? "system" : "custom";
      if (Number.isFinite(id) && id > 0 && name) {
        tagById.set(Math.trunc(id), { name, type });
      }
    }

    const foldersByVideoId = new Map<number, string[]>();
    const addedAtByVideoId = new Map<number, number>();
    for (const item of jsonFolderItems) {
      const videoId = Number(item.videoId);
      const folderId = Number(item.folderId);
      const folderName = folderNameById.get(Math.trunc(folderId));
      if (!Number.isFinite(videoId) || videoId <= 0 || !folderName) continue;
      const key = Math.trunc(videoId);
      const bucket = foldersByVideoId.get(key) ?? [];
      if (!bucket.includes(folderName)) bucket.push(folderName);
      foldersByVideoId.set(key, bucket);

      const addedAt = parseTimestampInput(item.addedAt ?? item.addedAtText);
      if (addedAt && addedAt > 0) {
        const prev = addedAtByVideoId.get(key) ?? 0;
        if (addedAt > prev) addedAtByVideoId.set(key, addedAt);
      }
    }

    const customTagsByVideoId = new Map<number, string[]>();
    const systemTagsByVideoId = new Map<number, string[]>();
    for (const edge of jsonVideoTags) {
      const videoId = Number(edge.videoId);
      const tagId = Number(edge.tagId);
      if (!Number.isFinite(videoId) || videoId <= 0 || !Number.isFinite(tagId) || tagId <= 0) {
        continue;
      }
      const tag = tagById.get(Math.trunc(tagId));
      if (!tag) continue;
      const key = Math.trunc(videoId);
      const target = tag.type === "system" ? systemTagsByVideoId : customTagsByVideoId;
      const bucket = target.get(key) ?? [];
      if (!bucket.includes(tag.name)) bucket.push(tag.name);
      target.set(key, bucket);
    }

    for (const video of jsonVideos) {
      const videoId = Number(video.id);
      const key = Number.isFinite(videoId) && videoId > 0 ? Math.trunc(videoId) : -1;
      const favoriteAt =
        addedAtByVideoId.get(key) ??
        parseTimestampInput(
          video.favoriteAt ??
            video.favoriteAtText ??
            video.addedAt ??
            video.addedAtText
        ) ??
        now;
      pushRow({
        bvid: normalizeText(video.bvid),
        title: normalizeText(video.title),
        coverUrl: normalizeText(video.coverUrl),
        uploader: normalizeText(video.uploader),
        uploaderSpaceUrl: normalizeText(video.uploaderSpaceUrl || video.uploaderUrl),
        description: normalizeText(video.description),
        publishAt: parseTimestampInput(video.publishAt ?? video.publishAtText),
        bvidUrl: normalizeText(video.bvidUrl),
        isInvalid: Boolean(video.isInvalid),
        partition: normalizeText(video.partition) || "uncategorized",
        addedAt: favoriteAt,
        folders: foldersByVideoId.get(key) ?? ["Imported"],
        customTags: customTagsByVideoId.get(key) ?? [],
        systemTags: systemTagsByVideoId.get(key) ?? []
      });
    }
    return { rows, skipped };
  }

  const csvRows = parseCsvRows(content);
  if (csvRows.length === 0) return { rows, skipped };

  const [header, ...bodyRows] = csvRows;
  const indexByName = new Map<string, number>();
  header.forEach((name, idx) => {
    indexByName.set(normalizeText(name), idx);
  });

  const pick = (row: string[], name: string) => {
    const idx = indexByName.get(name);
    if (idx === undefined || idx < 0) return "";
    return row[idx] ?? "";
  };

  for (const row of bodyRows) {
    pushRow({
      bvid: pick(row, "bvid"),
      title: pick(row, "title"),
      coverUrl: pick(row, "coverUrl"),
      uploader: pick(row, "uploader"),
      uploaderSpaceUrl: pick(row, "uploaderSpaceUrl"),
      description: pick(row, "description"),
      publishAt: parseTimestampInput(pick(row, "publishAtMs") || pick(row, "publishAt")),
      bvidUrl: pick(row, "bvidUrl"),
      isInvalid: pick(row, "isInvalid") === "1",
      partition: pick(row, "partition"),
      addedAt:
        parseTimestampInput(
          pick(row, "favoriteAtMs") ||
            pick(row, "favoriteAt") ||
            pick(row, "addedAtMs") ||
            pick(row, "addedAt")
        ) ?? now,
      folders: parsePipeList(pick(row, "folders")),
      customTags: parsePipeList(pick(row, "customTags")),
      systemTags: parsePipeList(pick(row, "systemTags"))
    });
  }

  return { rows, skipped };
}

function resolveFolderHasMore(
  payload: BiliFolderVideoListData,
  page: number,
  pageSize: number,
  pageMediaCount: number
) {
  if (typeof payload.has_more === "boolean") return payload.has_more;
  const total = Number(payload.info?.media_count ?? 0);
  if (Number.isFinite(total) && total > 0) {
    return page * pageSize < total;
  }
  return pageMediaCount >= pageSize;
}

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeCoverUrl(input: unknown) {
  const value = normalizeText(input);
  if (!value) return DEFAULT_COVER;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://")) return value.replace(/^http:\/\//i, "https://");
  return value;
}

function normalizeBiliVideoUrl(input: unknown, bvidFallback?: unknown) {
  const value = normalizeText(input);
  const fallbackBvid = normalizeText(bvidFallback);
  const fallback = fallbackBvid ? `${BILI_ORIGIN}/video/${fallbackBvid}/` : "";

  if (!value) return fallback;

  const appSchemeMatch = value.match(/^bilibili:\/\/video\/([^/?#]+)/i);
  if (appSchemeMatch) {
    const token = normalizeText(appSchemeMatch[1]);
    if (/^BV[0-9A-Za-z]+$/i.test(token)) return `${BILI_ORIGIN}/video/${token}/`;
    if (fallback) return fallback;
    if (/^\d+$/.test(token)) return `${BILI_ORIGIN}/video/av${token}/`;
    return `${BILI_ORIGIN}/video/${token}/`;
  }

  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/video/")) return `${BILI_ORIGIN}${value}`;
  if (/^video\//i.test(value)) return `${BILI_ORIGIN}/${value}`;
  if (/^BV[0-9A-Za-z]+$/i.test(value)) return `${BILI_ORIGIN}/video/${value}/`;
  if (/^av\d+$/i.test(value)) return `${BILI_ORIGIN}/video/${value}/`;
  if (/^\d+$/.test(value)) return fallback || `${BILI_ORIGIN}/video/av${value}/`;
  if (/^http:\/\//i.test(value)) return value.replace(/^http:\/\//i, "https://");
  if (/^https?:\/\//i.test(value)) return value;

  return fallback || value;
}

function normalizeBiliSpaceUrl(input: unknown, midFallback?: unknown) {
  const value = normalizeText(input);
  const fallbackMid = normalizeText(midFallback);
  const fallback = /^\d+$/.test(fallbackMid) ? `${BILI_ORIGIN}/space/${fallbackMid}` : "";

  if (!value) return fallback || null;
  if (/^\d+$/.test(value)) return `${BILI_ORIGIN}/space/${value}`;
  if (value.startsWith("//")) return `https:${value}`;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback || null;
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return fallback || null;
  }
}

function parseTimestampInput(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? Math.trunc(value) : Math.trunc(value * 1000);
  }

  const text = normalizeText(value);
  if (!text) return null;

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return numeric > 1e12 ? Math.trunc(numeric) : Math.trunc(numeric * 1000);
  }

  const normalizedDateText = text.includes(" ") && !text.includes("T") ? text.replace(" ", "T") : text;
  const parsed = Date.parse(normalizedDateText);
  if (Number.isFinite(parsed)) return Math.trunc(parsed);
  return null;
}

function formatTimestamp(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN) || !value) return "";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toMillis(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1e12) return Math.trunc(parsed);
  return Math.trunc(parsed * 1000);
}

function buildBiliHeaders(cookie?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    Referer: `${BILI_ORIGIN}/`,
    Origin: BILI_ORIGIN,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 412 || status === 429 || status >= 500;
}

function isRiskControlError(message: string) {
  const text = normalizeText(message);
  return text.includes("(412)") || text.includes(" 412");
}

async function fetchBiliJson<T>(url: string, cookie?: string): Promise<T> {
  const maxAttempts = 4;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: buildBiliHeaders(cookie)
      });
      if (!response.ok) {
        if (attempt < maxAttempts && isRetryableStatus(response.status)) {
          const backoff = 350 * attempt + Math.floor(Math.random() * 260);
          await sleep(backoff);
          continue;
        }
        throw new Error(`Bilibili API request failed (${response.status})`);
      }

      const payload = (await response.json()) as BiliApiResponse<T>;
      if (payload.code !== 0) {
        throw new Error(payload.message || payload.msg || "Bilibili API returned non-zero code");
      }

      return payload.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        const backoff = 350 * attempt + Math.floor(Math.random() * 260);
        await sleep(backoff);
        continue;
      }
    }
  }

  throw lastError || new Error("Bilibili API request failed");
}

function pickFolderId(folder: BiliFolder) {
  const raw = folder.id ?? folder.media_id;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function pickFolderTitle(folder: BiliFolder) {
  return normalizeText(folder.title);
}

function pickFolderMediaCount(folder: BiliFolder) {
  const value = Number(folder.media_count ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function extractMediaTags(media: BiliMedia) {
  const names: string[] = [];
  for (const tag of media.tags ?? []) {
    const name = normalizeText(tag.tag_name ?? tag.name);
    if (!name) continue;
    if (BLOCKED_SYSTEM_TAGS.has(name.toLowerCase())) continue;
    if (!names.includes(name)) names.push(name);
  }
  const partition = normalizeText(media.tname);
  if (partition && !BLOCKED_SYSTEM_TAGS.has(partition.toLowerCase()) && !names.includes(partition)) {
    names.push(partition);
  }
  return names;
}

async function fetchArchiveTagNames(bvid: string, cookie?: string) {
  const data = await fetchBiliJson<BiliArchiveTag[]>(
    `${BILI_ARCHIVE_TAGS_API}?bvid=${encodeURIComponent(bvid)}`,
    cookie
  );
  return uniqueTextList(
    (Array.isArray(data) ? data : [])
      .map((item) => normalizeText(item.tag_name ?? item.tag_name_v2 ?? item.name))
      .filter(Boolean)
      .filter((name) => !BLOCKED_SYSTEM_TAGS.has(name.toLowerCase()))
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureLocalFolder(remoteFolderId: number, remoteTitle: string) {
  const now = Date.now();

  const byRemote = db
    .select()
    .from(folders)
    .where(eq(folders.remoteMediaId, remoteFolderId))
    .get();

  if (byRemote) {
    db.update(folders)
      .set({
        name: remoteTitle || byRemote.name,
        remoteMediaId: remoteFolderId,
        deletedAt: null,
        updatedAt: now
      })
      .where(eq(folders.id, byRemote.id))
      .run();
    return byRemote.id;
  }

  const byName = db
    .select()
    .from(folders)
    .where(eq(folders.name, remoteTitle))
    .get();

  if (byName) {
    db.update(folders)
      .set({
        remoteMediaId: remoteFolderId,
        deletedAt: null,
        updatedAt: now
      })
      .where(eq(folders.id, byName.id))
      .run();
    return byName.id;
  }

  const activeFolderCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(folders)
      .where(isNull(folders.deletedAt))
      .get()?.value ?? 0;

  const inserted = db
    .insert(folders)
    .values({
      name: remoteTitle,
      description: "Synced from Bilibili",
      remoteMediaId: remoteFolderId,
      sortOrder: Number(activeFolderCount),
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    })
    .run();

  return Number(inserted.lastInsertRowid);
}

async function ensureSystemTagId(tagName: string) {
  const normalized = normalizeText(tagName);
  if (!normalized) return null;

  const existing = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${normalized.toLowerCase()}`)
    .get();

  if (existing) {
    if (existing.archivedAt !== null) {
      db.update(tags)
        .set({ archivedAt: null })
        .where(eq(tags.id, existing.id))
        .run();
    }
    return existing.id;
  }

  const inserted = db
    .insert(tags)
    .values({
      name: normalized,
      type: "system",
      createdAt: Date.now(),
      archivedAt: null
    })
    .onConflictDoNothing()
    .run();

  if (inserted.lastInsertRowid) {
    return Number(inserted.lastInsertRowid);
  }

  const fallback = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${normalized.toLowerCase()}`)
    .get();
  return fallback?.id ?? null;
}

async function ensureFolderByNameForImport(folderName: string) {
  const normalized = normalizeText(folderName);
  if (!normalized) return null;
  const now = Date.now();

  const existing = db.select().from(folders).where(eq(folders.name, normalized)).get();
  if (existing) {
    if (existing.deletedAt !== null) {
      db.update(folders)
        .set({ deletedAt: null, updatedAt: now })
        .where(eq(folders.id, existing.id))
        .run();
    }
    return { id: existing.id, created: false };
  }

  const activeFolderCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(folders)
      .where(isNull(folders.deletedAt))
      .get()?.value ?? 0;

  const inserted = db
    .insert(folders)
    .values({
      name: normalized,
      description: "Imported",
      remoteMediaId: null,
      sortOrder: Number(activeFolderCount),
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    })
    .run();

  return { id: Number(inserted.lastInsertRowid), created: true };
}

async function ensureTagForImport(tagName: string, type: "system" | "custom") {
  const normalized = normalizeText(tagName);
  if (!normalized) return null;
  if (type === "system" && BLOCKED_SYSTEM_TAGS.has(normalized.toLowerCase())) return null;
  const now = Date.now();

  const existing = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${normalized.toLowerCase()}`)
    .get();

  if (existing) {
    if (existing.archivedAt !== null) {
      db.update(tags).set({ archivedAt: null }).where(eq(tags.id, existing.id)).run();
    }
    if (existing.type !== type) {
      db.update(tags).set({ type }).where(eq(tags.id, existing.id)).run();
    }
    return { id: existing.id, created: false };
  }

  const inserted = db
    .insert(tags)
    .values({
      name: normalized,
      type,
      createdAt: now,
      archivedAt: null
    })
    .onConflictDoNothing()
    .run();

  if (inserted.lastInsertRowid) {
    return { id: Number(inserted.lastInsertRowid), created: true };
  }

  const fallback = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${normalized.toLowerCase()}`)
    .get();
  if (!fallback) return null;
  return { id: fallback.id, created: false };
}

async function upsertVideoFromRemote(media: BiliMedia) {
  const now = Date.now();
  const bvid = normalizeText(media.bvid);
  if (!bvid) return null;

  const title = normalizeText(media.title) || bvid;
  const bvidUrl = normalizeBiliVideoUrl(media.link, bvid);
  const uploader = normalizeText(media.upper?.name) || "Unknown uploader";
  const uploaderSpaceUrl = normalizeBiliSpaceUrl(media.upper?.space, media.upper?.mid);
  const description = normalizeText(media.intro);
  const coverUrl = normalizeCoverUrl(media.cover);
  const publishAt = toMillis(media.pubtime ?? media.ctime, now);
  const partition = normalizeText(media.tname) || "uncategorized";

  const existing = db.select().from(videos).where(eq(videos.bvid, bvid)).get();
  if (existing) {
    db.update(videos)
      .set({
        title,
        coverUrl,
        uploader,
        uploaderSpaceUrl,
        description,
        partition,
        publishAt,
        bvidUrl,
        isInvalid: false,
        deletedAt: null,
        updatedAt: now
      })
      .where(eq(videos.id, existing.id))
      .run();

    return { id: existing.id, created: false };
  }

  const inserted = db
    .insert(videos)
    .values({
      bvid,
      title,
      coverUrl,
      uploader,
      uploaderSpaceUrl,
      description,
      partition,
      publishAt,
      bvidUrl,
      isInvalid: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    })
    .run();

  return { id: Number(inserted.lastInsertRowid), created: true };
}

async function fetchFolderVideos(
  remoteFolderId: number,
  cookie: string | undefined,
  startPage: number,
  maxPages: number,
  maxVideosPerFolder: number
) {
  const medias: BiliMedia[] = [];
  const pageSize = Math.max(1, Math.min(20, maxVideosPerFolder));
  const limit = Math.max(1, maxVideosPerFolder);
  let hasMorePage = false;
  let nextPage: number | null = null;

  for (let step = 0; step < maxPages; step += 1) {
    const page = startPage + step;
    const query = new URLSearchParams({
      media_id: String(remoteFolderId),
      pn: String(page),
      ps: String(pageSize),
      keyword: "",
      order: "mtime",
      type: "0",
      tid: "0",
      platform: "web"
    });
    const url = `${BILI_FOLDER_VIDEOS_API}?${query.toString()}`;
    const data = await fetchBiliJson<BiliFolderVideoListData>(url, cookie);
    const pageMedias = data.medias ?? [];
    const remoteHasMore = resolveFolderHasMore(data, page, pageSize, pageMedias.length);
    if (pageMedias.length === 0) {
      hasMorePage = false;
      nextPage = null;
      break;
    }

    const remain = limit - medias.length;
    if (remain <= 0) {
      hasMorePage = true;
      nextPage = page;
      break;
    }

    medias.push(...pageMedias.slice(0, remain));
    if (medias.length >= limit) {
      hasMorePage = remoteHasMore;
      nextPage = hasMorePage ? page + 1 : null;
      break;
    }

    if (!remoteHasMore) {
      hasMorePage = false;
      nextPage = null;
      break;
    }

    hasMorePage = true;
    nextPage = page + 1;
    await sleep(120 + Math.floor(Math.random() * 140));
  }

  return {
    medias,
    hasMorePage,
    nextPage
  };
}

async function fetchRemoteFolders(cookie: string | undefined) {
  const nav = await fetchBiliJson<BiliNavData>(BILI_NAV_API, cookie);
  const mid = Number(nav.mid ?? 0);
  const isLogin = Boolean(nav.isLogin);
  if (!isLogin || !Number.isFinite(mid) || mid <= 0) {
    throw new Error("BILIBILI_LOGIN_REQUIRED");
  }

  const folderData = await fetchBiliJson<BiliFolderListData>(
    `${BILI_FOLDERS_API}?up_mid=${mid}`,
    cookie
  );

  return (folderData.list ?? [])
    .map((folder) => ({
      remoteId: pickFolderId(folder),
      title: pickFolderTitle(folder),
      mediaCount: pickFolderMediaCount(folder)
    }))
    .filter((folder) => folder.remoteId > 0 && folder.title && folder.mediaCount > 0);
}

export const syncRoutes: FastifyPluginAsync = async (app) => {
  app.post("/sync/bilibili/folders", async (request, reply) => {
    const payload = syncFolderListSchema.parse(request.body ?? {});
    const cookie =
      normalizeText(payload.cookie) || normalizeText(process.env.BILIBILI_COOKIE) || undefined;

    try {
      const items = await fetchRemoteFolders(cookie);
      return {
        ok: true,
        items,
        total: items.length
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "BILIBILI_LOGIN_REQUIRED") {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message:
            "Bilibili login required. Plugin mode can use browser login directly; backend mode should provide cookie in request body or BILIBILI_COOKIE env."
        });
      }
      request.log.error({ err: error }, "Fetch bilibili folders for sync failed");
      return reply.internalServerError(
        error instanceof Error ? error.message : "Fetch folder list failed"
      );
    }
  });

  app.post("/sync/bilibili", async (request, reply) => {
    const payload = syncFromBiliSchema.parse(request.body ?? {});
    const cookie =
      normalizeText(payload.cookie) || normalizeText(process.env.BILIBILI_COOKIE) || undefined;

    try {
      const remoteFolders = await fetchRemoteFolders(cookie);
      const selectedIdSet = new Set(
        (payload.selectedRemoteFolderIds ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      );
      const candidateFolders =
        selectedIdSet.size > 0
          ? remoteFolders.filter((folder) => selectedIdSet.has(folder.remoteId))
          : remoteFolders;

      const maxFolders = payload.maxFolders ? Math.min(payload.maxFolders, 200) : 10;
      const offset = Math.min(payload.offset, candidateFolders.length);
      const foldersToSync = candidateFolders.slice(offset, offset + maxFolders);

      let foldersSynced = 0;
      let foldersAttempted = 0;
      let videosProcessed = 0;
      let videosUpserted = 0;
      let folderLinksAdded = 0;
      let tagsBound = 0;
      let riskErrorStreak = 0;
      let riskBlocked = false;
      const errors: Array<{ folder: string; message: string }> = [];
      const archiveTagCache = new Map<string, string[]>();
      const singleFolderRun = selectedIdSet.size === 1 && foldersToSync.length === 1;
      let hasMorePage = false;
      let nextPage: number | null = null;

      for (const folder of foldersToSync) {
        foldersAttempted += 1;
        try {
          const localFolderId = await ensureLocalFolder(folder.remoteId, folder.title);
          foldersSynced += 1;
          riskErrorStreak = 0;

          const pageResult = await fetchFolderVideos(
            folder.remoteId,
            cookie,
            payload.startPage,
            payload.maxPagesPerFolder,
            payload.maxVideosPerFolder
          );
          const medias = pageResult.medias;
          if (singleFolderRun) {
            hasMorePage = pageResult.hasMorePage;
            nextPage = pageResult.nextPage;
          }

          for (const media of medias) {
            const upserted = await upsertVideoFromRemote(media);
            if (!upserted) continue;
            videosProcessed += 1;
            videosUpserted += 1;

            const addedAt = toMillis(media.fav_time, Date.now());
            const linkInsert = db
              .insert(folderItems)
              .values({
                folderId: localFolderId,
                videoId: upserted.id,
                addedAt
              })
              .onConflictDoNothing()
              .run();
            if (linkInsert.changes > 0) {
              folderLinksAdded += 1;
            } else {
              db.update(folderItems)
                .set({ addedAt })
                .where(
                  and(
                    eq(folderItems.folderId, localFolderId),
                    eq(folderItems.videoId, upserted.id),
                    sql`${folderItems.addedAt} < ${addedAt}`
                  )
                )
                .run();
            }

            const mediaTags = extractMediaTags(media);
            if (payload.includeTagEnrichment && mediaTags.length === 0) {
              const bvid = normalizeText(media.bvid);
              if (bvid) {
                if (!archiveTagCache.has(bvid)) {
                  try {
                    archiveTagCache.set(bvid, await fetchArchiveTagNames(bvid, cookie));
                  } catch {
                    archiveTagCache.set(bvid, []);
                  }
                }
                for (const name of archiveTagCache.get(bvid) ?? []) {
                  if (!mediaTags.includes(name)) mediaTags.push(name);
                }
              }
            }
            for (const mediaTag of mediaTags) {
              const tagId = await ensureSystemTagId(mediaTag);
              if (!tagId) continue;

              const bind = db
                .insert(videoTags)
                .values({
                  videoId: upserted.id,
                  tagId
                })
                .onConflictDoNothing()
                .run();
              if (bind.changes > 0) tagsBound += 1;
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push({
            folder: folder.title,
            message
          });

          if (isRiskControlError(message)) {
            riskErrorStreak += 1;
            if (riskErrorStreak >= 3) {
              riskBlocked = true;
              errors.push({
                folder: "__sync__",
                message:
                  "Too many 412 responses in a row; sync stopped early to avoid triggering stronger risk-control. Retry later."
              });
              break;
            }
          } else {
            riskErrorStreak = 0;
          }
        }
      }

      const nextOffsetRaw = offset + foldersAttempted;
      const hasMore = nextOffsetRaw < candidateFolders.length;

      const MAX_RETURN_ERRORS = 20;
      const returnedErrors = errors.slice(0, MAX_RETURN_ERRORS);
      const errorsOmitted = Math.max(0, errors.length - returnedErrors.length);

      return {
        ok: true,
        summary: {
          foldersDetected: candidateFolders.length,
          foldersSynced,
          videosProcessed,
          videosUpserted,
          folderLinksAdded,
          tagsBound,
          errorCount: errors.length
        },
        hasMore,
        nextOffset: hasMore ? nextOffsetRaw : null,
        hasMorePage: singleFolderRun ? hasMorePage : false,
        nextPage: singleFolderRun && hasMorePage ? nextPage : null,
        riskBlocked,
        errors: returnedErrors,
        errorsOmitted,
        syncedAt: Date.now()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "BILIBILI_LOGIN_REQUIRED") {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message:
            "Bilibili login required. Plugin mode can use browser login directly; backend mode should provide cookie in request body or BILIBILI_COOKIE env."
        });
      }
      request.log.error({ err: error }, "Sync from Bilibili failed");
      return reply.internalServerError(
        message || "Sync failed"
      );
    }
  });

  app.post("/import", async (request, reply) => {
    const payload = importBodySchema.parse(request.body ?? {});
    try {
      const parsed = parseImportRows(payload.format, payload.content);
      const rows = parsed.rows;
      const summary = {
        videosUpserted: 0,
        folderLinksAdded: 0,
        tagsBound: 0,
        foldersCreated: 0,
        tagsCreated: 0,
        rowsSkipped: parsed.skipped
      };

      for (const row of rows) {
        const now = Date.now();
        const existingVideo = db.select().from(videos).where(eq(videos.bvid, row.bvid)).get();
        let videoId = existingVideo?.id ?? 0;
        const nextPayload = {
          bvid: row.bvid,
          title: row.title,
          coverUrl: normalizeCoverUrl(row.coverUrl),
          uploader: row.uploader || "Unknown uploader",
          uploaderSpaceUrl: normalizeBiliSpaceUrl(row.uploaderSpaceUrl),
          description: row.description,
          partition: row.partition || "uncategorized",
          publishAt: row.publishAt,
          bvidUrl: row.bvidUrl,
          isInvalid: row.isInvalid,
          deletedAt: null,
          updatedAt: now
        };

        if (existingVideo) {
          db.update(videos).set(nextPayload).where(eq(videos.id, existingVideo.id)).run();
          videoId = existingVideo.id;
        } else {
          const inserted = db
            .insert(videos)
            .values({
              ...nextPayload,
              createdAt: now
            })
            .run();
          videoId = Number(inserted.lastInsertRowid);
        }
        summary.videosUpserted += 1;

        const folderNames = row.folders.length > 0 ? row.folders : ["Imported"];
        for (const folderName of folderNames) {
          const folder = await ensureFolderByNameForImport(folderName);
          if (!folder) continue;
          if (folder.created) summary.foldersCreated += 1;

          const addedAt = row.addedAt > 0 ? row.addedAt : now;
          const linkInsert = db
            .insert(folderItems)
            .values({
              folderId: folder.id,
              videoId,
              addedAt
            })
            .onConflictDoNothing()
            .run();
          if (linkInsert.changes > 0) {
            summary.folderLinksAdded += 1;
          } else {
            db.update(folderItems)
              .set({ addedAt })
              .where(
                and(
                  eq(folderItems.folderId, folder.id),
                  eq(folderItems.videoId, videoId),
                  sql`${folderItems.addedAt} < ${addedAt}`
                )
              )
              .run();
          }
        }

        for (const tagName of row.customTags) {
          const tag = await ensureTagForImport(tagName, "custom");
          if (!tag) continue;
          if (tag.created) summary.tagsCreated += 1;
          const bound = db
            .insert(videoTags)
            .values({ videoId, tagId: tag.id })
            .onConflictDoNothing()
            .run();
          if (bound.changes > 0) summary.tagsBound += 1;
        }
        for (const tagName of row.systemTags) {
          const tag = await ensureTagForImport(tagName, "system");
          if (!tag) continue;
          if (tag.created) summary.tagsCreated += 1;
          const bound = db
            .insert(videoTags)
            .values({ videoId, tagId: tag.id })
            .onConflictDoNothing()
            .run();
          if (bound.changes > 0) summary.tagsBound += 1;
        }
      }

      return {
        ok: true,
        summary,
        importedAt: Date.now()
      };
    } catch (error) {
      request.log.error({ err: error }, "Import library failed");
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Import failed"
      });
    }
  });

  app.get("/export", async (request) => {
    const query = exportQuerySchema.parse(request.query);
    const now = Date.now();
    const stamp = timestampLabel();

    const folderRows = db.select().from(folders).all();
    const videoRows = db.select().from(videos).all();
    const folderItemRows = db.select().from(folderItems).all();
    const tagRows = db.select().from(tags).all();
    const videoTagRows = db.select().from(videoTags).all();
    const latestAddedAtByVideo = new Map<number, number>();
    for (const relation of folderItemRows) {
      const last = latestAddedAtByVideo.get(relation.videoId) ?? 0;
      if (relation.addedAt > last) latestAddedAtByVideo.set(relation.videoId, relation.addedAt);
    }

    if (query.format === "json") {
      const exportVideos = videoRows.map((video) => ({
        ...video,
        publishAtText: formatTimestamp(video.publishAt),
        favoriteAt: latestAddedAtByVideo.get(video.id) ?? null,
        favoriteAtText: formatTimestamp(latestAddedAtByVideo.get(video.id) ?? null)
      }));
      const exportFolderItems = folderItemRows.map((item) => ({
        ...item,
        addedAtText: formatTimestamp(item.addedAt)
      }));
      const content = JSON.stringify(
        {
          meta: {
            version: "v1",
            exportedAt: now,
            exportedAtText: formatTimestamp(now),
            source: "bilishelf"
          },
          folders: folderRows,
          videos: exportVideos,
          folderItems: exportFolderItems,
          tags: tagRows,
          videoTags: videoTagRows
        },
        null,
        2
      );

      return {
        format: "json",
        filename: `bilishelf-export-${stamp}.json`,
        mimeType: "application/json;charset=utf-8",
        content,
        summary: {
          folders: folderRows.length,
          videos: videoRows.length,
          tags: tagRows.length
        }
      };
    }

    const folderMap = new Map(folderRows.map((row) => [row.id, row.name]));
    const tagMap = new Map(tagRows.map((row) => [row.id, row]));
    const folderNamesByVideo = new Map<number, string[]>();
    for (const relation of folderItemRows) {
      const bucket = folderNamesByVideo.get(relation.videoId) ?? [];
      const folderName = folderMap.get(relation.folderId);
      if (folderName && !bucket.includes(folderName)) bucket.push(folderName);
      folderNamesByVideo.set(relation.videoId, bucket);

      const last = latestAddedAtByVideo.get(relation.videoId) ?? 0;
      if (relation.addedAt > last) latestAddedAtByVideo.set(relation.videoId, relation.addedAt);
    }

    const customTagsByVideo = new Map<number, string[]>();
    const systemTagsByVideo = new Map<number, string[]>();
    for (const relation of videoTagRows) {
      const tag = tagMap.get(relation.tagId);
      if (!tag) continue;
      const target =
        tag.type === "custom" ? customTagsByVideo : systemTagsByVideo;
      const bucket = target.get(relation.videoId) ?? [];
      if (!bucket.includes(tag.name)) bucket.push(tag.name);
      target.set(relation.videoId, bucket);
    }

    const header = [
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
      "addedAt",
      "addedAtMs",
      "folders",
      "customTags",
      "systemTags",
      "isInvalid",
      "deletedAt"
    ];

    const lines = [header.join(",")];
    for (const video of videoRows) {
      const favoriteAtMs = latestAddedAtByVideo.get(video.id) ?? "";
      const addedAtMs = favoriteAtMs;
      const publishAtMs = video.publishAt ?? "";
      const row = [
        video.bvid,
        video.title,
        video.uploader,
        video.uploaderSpaceUrl ?? "",
        video.description,
        video.coverUrl,
        video.bvidUrl,
        video.partition,
        formatTimestamp(video.publishAt),
        publishAtMs,
        formatTimestamp(typeof favoriteAtMs === "number" ? favoriteAtMs : null),
        favoriteAtMs,
        formatTimestamp(typeof favoriteAtMs === "number" ? favoriteAtMs : null),
        addedAtMs,
        (folderNamesByVideo.get(video.id) ?? []).join("|"),
        (customTagsByVideo.get(video.id) ?? []).join("|"),
        (systemTagsByVideo.get(video.id) ?? []).join("|"),
        video.isInvalid ? "1" : "0",
        video.deletedAt ?? ""
      ].map(csvEscape);
      lines.push(row.join(","));
    }

    return {
      format: "csv",
      filename: `bilishelf-export-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: `\uFEFF${lines.join("\n")}`,
      summary: {
        folders: folderRows.length,
        videos: videoRows.length,
        tags: tagRows.length
      }
    };
  });
};
