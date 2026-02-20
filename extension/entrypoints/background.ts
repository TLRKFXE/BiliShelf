type FolderRecord = {
  id: number;
  name: string;
  description: string | null;
  remoteMediaId: number | null;
  sortOrder: number;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type VideoRecord = {
  id: number;
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  description: string;
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type FolderItemRecord = {
  id: number;
  folderId: number;
  videoId: number;
  addedAt: number;
};

type TagRecord = {
  id: number;
  name: string;
  type: "system" | "custom";
  createdAt: number;
  archivedAt: number | null;
};

type VideoTagRecord = {
  id: number;
  videoId: number;
  tagId: number;
};

type LocalState = {
  counters: {
    folder: number;
    video: number;
    folderItem: number;
    tag: number;
    videoTag: number;
  };
  folders: FolderRecord[];
  videos: VideoRecord[];
  folderItems: FolderItemRecord[];
  tags: TagRecord[];
  videoTags: VideoTagRecord[];
};

type ApiResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

type LocalApiRequest = {
  method: string;
  path: string;
  body?: unknown;
};

const DB_NAME = "bilishelf-local-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_KEY = "state";
const MESSAGE_TYPE = "BILISHELF_LOCAL_API";
const BILI_NAV_API = "https://api.bilibili.com/x/web-interface/nav";
const BILI_FOLDERS_API = "https://api.bilibili.com/x/v3/fav/folder/created/list-all";
const BILI_FOLDER_VIDEOS_API = "https://api.bilibili.com/x/v3/fav/resource/list";
const BILI_ARCHIVE_TAGS_API = "https://api.bilibili.com/x/tag/archive/tags";
const BILI_ORIGIN = "https://www.bilibili.com";
const BLOCKED_SYSTEM_TAGS = new Set(["uncategorized", "未分类"]);
const DEFAULT_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";
const PAGE_FETCH_MESSAGE_TYPE = "BILISHELF_PAGE_FETCH_JSON";

type SyncFetchStage = "nav" | "folders" | "folderVideos";
type FetchSource = "extension" | "page";

type TabBridgePayload = {
  ok: boolean;
  status: number;
  payload?: unknown;
  error?: string;
};

const defaultState = (): LocalState => ({
  counters: {
    folder: 1,
    video: 1,
    folderItem: 1,
    tag: 1,
    videoTag: 1
  },
  folders: [],
  videos: [],
  folderItems: [],
  tags: [],
  videoTags: []
});

let dbPromise: Promise<IDBDatabase> | null = null;
let stateQueue: Promise<void> = Promise.resolve();

function now() {
  return Date.now();
}

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeKey(value: unknown) {
  return normalizeText(value).toLocaleLowerCase();
}

function normalizeOutputBvid(value: string) {
  const copyMarker = "__copy__";
  const markerIndex = value.indexOf(copyMarker);
  if (markerIndex < 0) return value;
  return value.slice(0, markerIndex);
}

function toInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toIntOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseListParam(params: URLSearchParams, key: string) {
  const raw = params.get(key) || "";
  return raw
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function includesIgnoreCase(source: string, keyword: string) {
  if (!keyword) return true;
  return source.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
}

function paginate<T>(items: T[], pageRaw: string | null, pageSizeRaw: string | null) {
  const page = Math.max(1, toInt(pageRaw, 1));
  const pageSize = Math.max(1, toInt(pageSizeRaw, 30));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total
    }
  };
}

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

async function readState() {
  const db = await openDatabase();
  return new Promise<LocalState>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);

    request.onsuccess = () => {
      const record = request.result as { key: string; value: LocalState } | undefined;
      if (!record?.value) {
        resolve(defaultState());
        return;
      }

      const raw = record.value as Partial<LocalState>;
      const base = defaultState();
      const normalized: LocalState = {
        counters: {
          folder: raw.counters?.folder ?? base.counters.folder,
          video: raw.counters?.video ?? base.counters.video,
          folderItem: raw.counters?.folderItem ?? base.counters.folderItem,
          tag: raw.counters?.tag ?? base.counters.tag,
          videoTag: raw.counters?.videoTag ?? base.counters.videoTag
        },
        folders: (raw.folders ?? []).map((folder) => ({
          ...folder,
          remoteMediaId:
            folder.remoteMediaId === null || folder.remoteMediaId === undefined
              ? null
              : toInt(folder.remoteMediaId)
        })),
        videos: raw.videos ?? [],
        folderItems: raw.folderItems ?? [],
        tags: raw.tags ?? [],
        videoTags: raw.videoTags ?? []
      };
      resolve(normalized);
    };
    request.onerror = () => reject(request.error || new Error("Read state failed"));
  });
}

async function writeState(state: LocalState) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: STATE_KEY, value: state });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Write state failed"));
  });
}

function withState<T>(mutate: (state: LocalState) => Promise<T> | T, persist: boolean) {
  const task = stateQueue.then(async () => {
    const state = await readState();
    const result = await mutate(state);
    if (persist) {
      await writeState(state);
    }
    return result;
  });

  stateQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

function ok(data: unknown, status = 200): ApiResult {
  return { ok: true, status, data };
}

function fail(status: number, error: string): ApiResult {
  return { ok: false, status, error };
}

function activeFolders(state: LocalState) {
  return state.folders
    .filter((folder) => folder.deletedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}

function folderItemExists(state: LocalState, folderId: number, videoId: number) {
  return state.folderItems.some((item) => item.folderId === folderId && item.videoId === videoId);
}

function hasActiveFolder(state: LocalState, videoId: number) {
  return state.folderItems.some((item) => {
    if (item.videoId !== videoId) return false;
    const folder = state.folders.find((row) => row.id === item.folderId);
    return !!folder && folder.deletedAt === null;
  });
}

function markOrphanVideosDeleted(state: LocalState) {
  const ts = now();
  for (const video of state.videos) {
    if (video.deletedAt !== null) continue;
    if (!hasActiveFolder(state, video.id)) {
      video.deletedAt = ts;
      video.updatedAt = ts;
    }
  }
}

function ensureTag(state: LocalState, rawName: unknown, type: "system" | "custom") {
  const name = normalizeText(rawName);
  if (!name) return null;

  const key = normalizeKey(name);
  const existing = state.tags.find(
    (tag) => tag.archivedAt === null && tag.type === type && normalizeKey(tag.name) === key
  );
  if (existing) return existing;

  const created: TagRecord = {
    id: state.counters.tag++,
    name,
    type,
    createdAt: now(),
    archivedAt: null
  };
  state.tags.push(created);
  return created;
}

function ensureVideoTag(state: LocalState, videoId: number, tagId: number) {
  if (state.videoTags.some((edge) => edge.videoId === videoId && edge.tagId === tagId)) return;
  state.videoTags.push({
    id: state.counters.videoTag++,
    videoId,
    tagId
  });
}

function getTagSummaryForVideo(state: LocalState, videoId: number) {
  const links = state.videoTags.filter((edge) => edge.videoId === videoId);
  const tags = links
    .map((edge) => state.tags.find((tag) => tag.id === edge.tagId))
    .filter((tag): tag is TagRecord => !!tag && tag.archivedAt === null);

  const systemTags = tags.filter((tag) => tag.type === "system").map((tag) => tag.name);
  const customTags = tags.filter((tag) => tag.type === "custom").map((tag) => tag.name);

  return {
    tags: Array.from(new Set(tags.map((tag) => tag.name))),
    systemTags: Array.from(new Set(systemTags)),
    customTags: Array.from(new Set(customTags))
  };
}

function computeAddedAt(state: LocalState, videoId: number, folderId?: number) {
  const related = state.folderItems.filter((item) => item.videoId === videoId);
  const active = related.filter((item) => {
    const folder = state.folders.find((row) => row.id === item.folderId);
    if (!folder || folder.deletedAt !== null) return false;
    if (folderId !== undefined && folder.id !== folderId) return false;
    return true;
  });

  if (active.length === 0) return null;
  return active.reduce((max, item) => Math.max(max, item.addedAt), 0);
}

function mapVideo(state: LocalState, video: VideoRecord, folderId?: number) {
  const tagSummary = getTagSummaryForVideo(state, video.id);
  return {
    ...video,
    bvid: normalizeOutputBvid(video.bvid),
    addedAt: computeAddedAt(state, video.id, folderId),
    tags: tagSummary.tags,
    systemTags: tagSummary.systemTags,
    customTags: tagSummary.customTags
  };
}

function filterVideoList(
  state: LocalState,
  args: {
    includeDeleted: boolean;
    folderId?: number;
    tags?: string[];
    q?: string;
    title?: string;
    description?: string;
    uploader?: string;
    customTag?: string;
    systemTag?: string;
    from?: number | null;
    to?: number | null;
  }
) {
  const requiredTags = (args.tags || []).map((item) => normalizeKey(item)).filter(Boolean);
  const qKeyword = normalizeText(args.q);
  const titleKeyword = normalizeText(args.title);
  const descriptionKeyword = normalizeText(args.description);
  const uploaderKeyword = normalizeText(args.uploader);
  const customTagKeyword = normalizeText(args.customTag);
  const systemTagKeyword = normalizeText(args.systemTag);

  const rows = state.videos
    .filter((video) => (args.includeDeleted ? video.deletedAt !== null : video.deletedAt === null))
    .map((video) => mapVideo(state, video, args.folderId))
    .filter((video) => {
      const folderIds = state.folderItems
        .filter((item) => item.videoId === video.id)
        .map((item) => item.folderId);
      const activeFolderIds = folderIds.filter((folderId) => {
        const folder = state.folders.find((row) => row.id === folderId);
        return !!folder && folder.deletedAt === null;
      });

      if (!args.includeDeleted && activeFolderIds.length === 0) return false;
      if (args.folderId !== undefined && !activeFolderIds.includes(args.folderId)) return false;

      const allTags = video.tags || [];
      if (
        requiredTags.length > 0 &&
        !requiredTags.every((keyword) =>
          allTags.some((tagName) => normalizeKey(tagName) === keyword)
        )
      ) {
        return false;
      }

      if (qKeyword) {
        const hitTitle = includesIgnoreCase(video.title, qKeyword);
        const hitTag = allTags.some((tagName) => includesIgnoreCase(tagName, qKeyword));
        if (!hitTitle && !hitTag) return false;
      }

      if (titleKeyword && !includesIgnoreCase(video.title, titleKeyword)) return false;
      if (descriptionKeyword && !includesIgnoreCase(video.description, descriptionKeyword)) return false;
      if (uploaderKeyword && !includesIgnoreCase(video.uploader, uploaderKeyword)) return false;

      if (
        customTagKeyword &&
        !(video.customTags || []).some((tagName) => includesIgnoreCase(tagName, customTagKeyword))
      ) {
        return false;
      }

      if (
        systemTagKeyword &&
        !(video.systemTags || []).some((tagName) => includesIgnoreCase(tagName, systemTagKeyword))
      ) {
        return false;
      }

      const addedAt = video.addedAt ?? 0;
      if (args.from !== null && args.from !== undefined && addedAt < args.from) return false;
      if (args.to !== null && args.to !== undefined && addedAt > args.to) return false;

      return true;
    })
    .sort((a, b) => {
      const aRank = a.addedAt || a.updatedAt || 0;
      const bRank = b.addedAt || b.updatedAt || 0;
      return bRank - aRank;
    });

  return rows;
}

function removeVideoCompletely(state: LocalState, videoId: number) {
  state.videos = state.videos.filter((video) => video.id !== videoId);
  state.folderItems = state.folderItems.filter((item) => item.videoId !== videoId);
  state.videoTags = state.videoTags.filter((edge) => edge.videoId !== videoId);
}

function recalculateFolderSortOrders(state: LocalState) {
  const active = activeFolders(state);
  active.forEach((folder, index) => {
    folder.sortOrder = index + 1;
  });
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

function toMillis(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1e12) return Math.trunc(parsed);
  return Math.trunc(parsed * 1000);
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

type BiliApiResponse<T> = {
  code: number;
  message?: string;
  msg?: string;
  data: T;
};

type BiliFolderMediaListData = {
  medias?: Array<Record<string, unknown>>;
  has_more?: boolean;
  info?: {
    media_count?: number;
  };
};

function resolveFolderHasMore(
  payload: BiliFolderMediaListData,
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

type ImportVideoRow = {
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  description: string;
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean;
  addedAt: number;
  partition: string;
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
  const nowTs = now();
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
      description: normalizeText(row.description),
      publishAt: row.publishAt ?? null,
      bvidUrl,
      isInvalid: Boolean(row.isInvalid),
      addedAt: Number.isFinite(row.addedAt) && (row.addedAt ?? 0) > 0 ? Math.trunc(row.addedAt as number) : nowTs,
      partition: normalizeText(row.partition) || "uncategorized",
      folders: uniqueTextList((row.folders ?? []) as unknown[]),
      customTags: uniqueTextList((row.customTags ?? []) as unknown[]),
      systemTags: uniqueTextList((row.systemTags ?? []) as unknown[])
    });
  };

  if (format === "json") {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const jsonVideos = Array.isArray(parsed?.videos) ? parsed.videos as Array<Record<string, unknown>> : [];
    const jsonFolders = Array.isArray(parsed?.folders) ? parsed.folders as Array<Record<string, unknown>> : [];
    const jsonFolderItems = Array.isArray(parsed?.folderItems)
      ? parsed.folderItems as Array<Record<string, unknown>>
      : [];
    const jsonTags = Array.isArray(parsed?.tags) ? parsed.tags as Array<Record<string, unknown>> : [];
    const jsonVideoTags = Array.isArray(parsed?.videoTags)
      ? parsed.videoTags as Array<Record<string, unknown>>
      : [];

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
    for (const relation of jsonFolderItems) {
      const videoId = Number(relation.videoId);
      const folderId = Number(relation.folderId);
      const folderName = folderNameById.get(Math.trunc(folderId));
      if (!Number.isFinite(videoId) || videoId <= 0 || !folderName) continue;
      const key = Math.trunc(videoId);
      const bucket = foldersByVideoId.get(key) ?? [];
      if (!bucket.includes(folderName)) bucket.push(folderName);
      foldersByVideoId.set(key, bucket);

      const addedAt = Number(relation.addedAt ?? 0);
      if (Number.isFinite(addedAt) && addedAt > 0) {
        const prev = addedAtByVideoId.get(key) ?? 0;
        if (addedAt > prev) addedAtByVideoId.set(key, Math.trunc(addedAt));
      }
    }

    const customTagsByVideoId = new Map<number, string[]>();
    const systemTagsByVideoId = new Map<number, string[]>();
    for (const relation of jsonVideoTags) {
      const videoId = Number(relation.videoId);
      const tagId = Number(relation.tagId);
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
      pushRow({
        bvid: video.bvid,
        title: video.title,
        coverUrl: video.coverUrl,
        uploader: video.uploader,
        description: video.description,
        publishAt: Number.isFinite(Number(video.publishAt)) ? Math.trunc(Number(video.publishAt)) : null,
        bvidUrl: video.bvidUrl,
        isInvalid: Boolean(video.isInvalid),
        partition: normalizeText(video.partition) || "uncategorized",
        addedAt: addedAtByVideoId.get(key) ?? nowTs,
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
  header.forEach((name, idx) => indexByName.set(normalizeText(name), idx));
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
      description: pick(row, "description"),
      publishAt: Number.isFinite(Number(pick(row, "publishAt")))
        ? Math.trunc(Number(pick(row, "publishAt")))
        : null,
      bvidUrl: pick(row, "bvidUrl"),
      isInvalid: pick(row, "isInvalid") === "1",
      partition: pick(row, "partition"),
      addedAt: Number.isFinite(Number(pick(row, "addedAt")))
        ? Math.trunc(Number(pick(row, "addedAt")))
        : nowTs,
      folders: parsePipeList(pick(row, "folders")),
      customTags: parsePipeList(pick(row, "customTags")),
      systemTags: parsePipeList(pick(row, "systemTags"))
    });
  }
  return { rows, skipped };
}

class BiliRequestError extends Error {
  status: number;
  stage: SyncFetchStage;
  source: FetchSource;
  url: string;

  constructor(params: {
    status: number;
    stage: SyncFetchStage;
    source: FetchSource;
    url: string;
    message: string;
  }) {
    super(params.message);
    this.name = "BiliRequestError";
    this.status = params.status;
    this.stage = params.stage;
    this.source = params.source;
    this.url = params.url;
  }
}

function isBiliRequestError(error: unknown): error is BiliRequestError {
  return error instanceof BiliRequestError;
}

function stageLabel(stage: SyncFetchStage) {
  switch (stage) {
    case "nav":
      return "nav";
    case "folders":
      return "folders";
    case "folderVideos":
      return "folder-videos";
    default:
      return "unknown";
  }
}

function toBiliRequestError(
  error: unknown,
  stage: SyncFetchStage,
  source: FetchSource,
  url: string
) {
  if (error instanceof BiliRequestError) return error;
  return new BiliRequestError({
    status: 500,
    stage,
    source,
    url,
    message: error instanceof Error ? error.message : String(error)
  });
}

function formatBiliRequestError(error: BiliRequestError) {
  return `[${stageLabel(error.stage)}][${error.source}] ${error.message}`;
}

async function sendMessageToTab<T = unknown>(tabId: number, message: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message || "Failed to communicate with tab"));
        return;
      }
      resolve((response ?? null) as T);
    });
  });
}

function isMissingReceiverError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}

async function injectSyncBridgeScript(tabId: number) {
  if (!chrome.scripting?.executeScript) {
    throw new Error("chrome.scripting is unavailable");
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-scripts/sync-bridge.js"]
  });
}

async function findBilibiliTabId() {
  const tabs = await chrome.tabs.query({ url: ["https://www.bilibili.com/*"] });
  const activeTab = tabs.find((tab) => tab.active && typeof tab.id === "number");
  if (activeTab?.id) return activeTab.id;
  const fallback = tabs.find((tab) => typeof tab.id === "number");
  return fallback?.id ?? null;
}

async function fetchBiliJsonViaPageContext<T>(url: string, stage: SyncFetchStage): Promise<T> {
  const tabId = await findBilibiliTabId();
  if (!tabId) {
    throw new BiliRequestError({
      status: 412,
      stage,
      source: "page",
      url,
      message:
        "Bilibili risk-control blocked extension requests (412). Open any Bilibili page in a tab, then retry sync."
    });
  }

  let result: TabBridgePayload;
  try {
    result = await sendMessageToTab<TabBridgePayload>(tabId, {
      type: PAGE_FETCH_MESSAGE_TYPE,
      url
    });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }
    await injectSyncBridgeScript(tabId);
    result = await sendMessageToTab<TabBridgePayload>(tabId, {
      type: PAGE_FETCH_MESSAGE_TYPE,
      url
    });
  }

  if (!result || result.ok !== true) {
    const status = Number(result?.status ?? 500);
    const errorMessage =
      normalizeText(result?.error) || `Bilibili page-context request failed (${status})`;
    throw new BiliRequestError({
      status,
      stage,
      source: "page",
      url,
      message: errorMessage
    });
  }

  const payload = result.payload as BiliApiResponse<T>;
  if (!payload || typeof payload !== "object") {
    throw new BiliRequestError({
      status: Number(result.status || 500),
      stage,
      source: "page",
      url,
      message: "Bilibili page-context response is invalid"
    });
  }

  if (payload.code !== 0) {
    throw new BiliRequestError({
      status: Number(result.status || 500),
      stage,
      source: "page",
      url,
      message: payload.message || payload.msg || "Bilibili API returned non-zero code"
    });
  }

  return payload.data;
}

async function fetchBiliJsonByExtension<T>(url: string, stage: SyncFetchStage): Promise<T> {
  const maxAttempts = 4;
  let lastError: BiliRequestError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "application/json, text/plain, */*",
          Referer: `${BILI_ORIGIN}/`,
          Origin: BILI_ORIGIN
        }
      });

      if (!response.ok) {
        if (attempt < maxAttempts && isRetryableStatus(response.status)) {
          const backoff = 350 * attempt + Math.floor(Math.random() * 260);
          await sleep(backoff);
          continue;
        }
        throw new BiliRequestError({
          status: response.status,
          stage,
          source: "extension",
          url,
          message: `Bilibili API request failed (${response.status})`
        });
      }

      const payload = (await response.json()) as BiliApiResponse<T>;
      if (payload.code !== 0) {
        throw new BiliRequestError({
          status: response.status,
          stage,
          source: "extension",
          url,
          message: payload.message || payload.msg || "Bilibili API returned non-zero code"
        });
      }

      return payload.data;
    } catch (error) {
      lastError = toBiliRequestError(error, stage, "extension", url);
      if (attempt < maxAttempts) {
        const backoff = 350 * attempt + Math.floor(Math.random() * 260);
        await sleep(backoff);
        continue;
      }
    }
  }

  throw (
    lastError ||
    new BiliRequestError({
      status: 500,
      stage,
      source: "extension",
      url,
      message: "Bilibili API request failed"
    })
  );
}

async function fetchBiliJson<T>(url: string, stage: SyncFetchStage): Promise<T> {
  try {
    return await fetchBiliJsonByExtension<T>(url, stage);
  } catch (extensionError) {
    const extErr = toBiliRequestError(extensionError, stage, "extension", url);
    if (extErr.status !== 412) {
      throw extErr;
    }

    try {
      return await fetchBiliJsonViaPageContext<T>(url, stage);
    } catch (pageError) {
      const pageErr = toBiliRequestError(pageError, stage, "page", url);
      throw new BiliRequestError({
        status: pageErr.status || extErr.status,
        stage,
        source: pageErr.source,
        url,
        message: `${formatBiliRequestError(extErr)} | fallback failed: ${formatBiliRequestError(pageErr)}`
      });
    }
  }
}

type RemoteFolder = { remoteId: number; title: string; mediaCount: number };

function pickRemoteFolderId(raw: Record<string, unknown>) {
  const id = toInt(raw.id ?? raw.media_id ?? 0, 0);
  return id > 0 ? id : 0;
}

async function fetchRemoteFoldersFromBilibili() {
  const nav = await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(BILI_NAV_API, "nav");
  const mid = toInt(nav.mid ?? 0, 0);
  if (!nav.isLogin || mid <= 0) {
    throw new Error("Please login to Bilibili in current browser first");
  }

  const folderData = await fetchBiliJson<{ list?: Array<Record<string, unknown>> }>(
    `${BILI_FOLDERS_API}?up_mid=${mid}`,
    "folders"
  );
  return (folderData.list ?? [])
    .map((item) => ({
      remoteId: pickRemoteFolderId(item),
      title: normalizeText(item.title),
      mediaCount: toInt((item as { media_count?: unknown }).media_count ?? 0, 0)
    }))
    .filter((item) => item.remoteId > 0 && item.title && item.mediaCount > 0) as RemoteFolder[];
}

function extractMediaTagNames(media: Record<string, unknown>) {
  const names: string[] = [];
  const fromPayload = Array.isArray(media.tags) ? media.tags : [];
  for (const rawTag of fromPayload) {
    const candidate =
      typeof rawTag === "string"
        ? rawTag
        : (rawTag as { tag_name?: string; tag_name_v2?: string; name?: string }).tag_name ??
          (rawTag as { tag_name?: string; tag_name_v2?: string; name?: string }).tag_name_v2 ??
          (rawTag as { tag_name?: string; tag_name_v2?: string; name?: string }).name;
    const tagName = normalizeText(candidate);
    if (!tagName) continue;
    const lowered = tagName.toLowerCase();
    if (BLOCKED_SYSTEM_TAGS.has(lowered)) continue;
    if (!names.some((item) => normalizeKey(item) === lowered)) names.push(tagName);
  }

  const partition = normalizeText(media.tname);
  if (partition && !BLOCKED_SYSTEM_TAGS.has(partition.toLowerCase())) {
    if (!names.some((item) => normalizeKey(item) === normalizeKey(partition))) {
      names.push(partition);
    }
  }

  return names;
}

async function fetchArchiveTagNames(bvid: string) {
  const data = await fetchBiliJson<Array<Record<string, unknown>>>(
    `${BILI_ARCHIVE_TAGS_API}?bvid=${encodeURIComponent(bvid)}`,
    "folderVideos"
  );
  const names = (Array.isArray(data) ? data : [])
    .map((item) =>
      normalizeText(
        (item as { tag_name?: string; tag_name_v2?: string; name?: string }).tag_name ??
          (item as { tag_name?: string; tag_name_v2?: string; name?: string }).tag_name_v2 ??
          (item as { tag_name?: string; tag_name_v2?: string; name?: string }).name
      )
    )
    .filter(Boolean)
    .filter((name) => !BLOCKED_SYSTEM_TAGS.has(name.toLowerCase()));
  return uniqueTextList(names);
}

function ensureSystemTagByName(state: LocalState, rawName: unknown) {
  const name = normalizeText(rawName);
  if (!name) return null;
  if (BLOCKED_SYSTEM_TAGS.has(name.toLowerCase())) return null;

  const existing = state.tags.find(
    (tag) => tag.archivedAt === null && normalizeKey(tag.name) === normalizeKey(name)
  );
  if (existing) return existing;

  const created: TagRecord = {
    id: state.counters.tag++,
    name,
    type: "system",
    createdAt: now(),
    archivedAt: null
  };
  state.tags.push(created);
  return created;
}

function ensureFolderByNameForImport(state: LocalState, rawName: unknown) {
  const name = normalizeText(rawName);
  if (!name) return null;
  const timestamp = now();
  const existing = state.folders.find((folder) => normalizeKey(folder.name) === normalizeKey(name));
  if (existing) {
    existing.deletedAt = null;
    existing.updatedAt = timestamp;
    return { folder: existing, created: false };
  }

  const created: FolderRecord = {
    id: state.counters.folder++,
    name,
    description: "Imported",
    remoteMediaId: null,
    sortOrder: activeFolders(state).length + 1,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.folders.push(created);
  return { folder: created, created: true };
}

function ensureLocalFolderByRemoteId(
  state: LocalState,
  remoteFolder: RemoteFolder
) {
  const timestamp = now();
  const byRemote = state.folders.find((folder) => folder.remoteMediaId === remoteFolder.remoteId);
  if (byRemote) {
    byRemote.name = remoteFolder.title || byRemote.name;
    byRemote.deletedAt = null;
    byRemote.updatedAt = timestamp;
    return byRemote;
  }

  const byName = state.folders.find(
    (folder) => normalizeKey(folder.name) === normalizeKey(remoteFolder.title)
  );
  if (byName) {
    byName.remoteMediaId = remoteFolder.remoteId;
    byName.deletedAt = null;
    byName.updatedAt = timestamp;
    return byName;
  }

  const created: FolderRecord = {
    id: state.counters.folder++,
    name: remoteFolder.title,
    description: "Synced from Bilibili",
    remoteMediaId: remoteFolder.remoteId,
    sortOrder: activeFolders(state).length + 1,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.folders.push(created);
  return created;
}

type SyncSummary = {
  foldersDetected: number;
  foldersSynced: number;
  videosProcessed: number;
  videosUpserted: number;
  folderLinksAdded: number;
  tagsBound: number;
  errorCount: number;
};

async function syncFromBilibiliToState(
  state: LocalState,
  options: {
    offset?: number;
    startPage?: number;
    includeTagEnrichment?: boolean;
    maxFolders?: number;
    maxPagesPerFolder?: number;
    selectedRemoteFolderIds?: number[];
    maxVideosPerFolder?: number;
  }
) {
  const remoteFolders = await fetchRemoteFoldersFromBilibili();
  const selectedIdSet = new Set(
    (options.selectedRemoteFolderIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  const candidateFolders =
    selectedIdSet.size > 0
      ? remoteFolders.filter((folder) => selectedIdSet.has(folder.remoteId))
      : remoteFolders;

  const maxFolders = options.maxFolders ? Math.min(options.maxFolders, 200) : 10;
  const offset = Math.min(Math.max(0, options.offset ?? 0), candidateFolders.length);
  const foldersToSync = candidateFolders.slice(offset, offset + maxFolders);
  const startPage = Math.max(1, options.startPage ?? 1);
  const maxPages = Math.max(1, options.maxPagesPerFolder ?? 5);
  const maxVideosPerFolder = Math.max(1, options.maxVideosPerFolder ?? 200);
  const singleFolderRun = selectedIdSet.size === 1 && foldersToSync.length === 1;

  let foldersSynced = 0;
  let foldersAttempted = 0;
  let videosProcessed = 0;
  let videosUpserted = 0;
  let folderLinksAdded = 0;
  let tagsBound = 0;
  let riskErrorStreak = 0;
  let riskBlocked = false;
  let hasMorePage = false;
  let nextPage: number | null = null;
  const errors: Array<{ folder: string; message: string }> = [];
  const archiveTagCache = new Map<string, string[]>();

  for (const remoteFolder of foldersToSync) {
    foldersAttempted += 1;
    try {
      const localFolder = ensureLocalFolderByRemoteId(state, remoteFolder);
      foldersSynced += 1;
      riskErrorStreak = 0;

      const pageSize = Math.max(1, Math.min(20, maxVideosPerFolder));
      let takenCount = 0;
      for (let step = 0; step < maxPages; step += 1) {
        const page = startPage + step;
        const query = new URLSearchParams({
          media_id: String(remoteFolder.remoteId),
          pn: String(page),
          ps: String(pageSize),
          keyword: "",
          order: "mtime",
          type: "0",
          tid: "0",
          platform: "web"
        });
        const folderMediaData = await fetchBiliJson<BiliFolderMediaListData>(
          `${BILI_FOLDER_VIDEOS_API}?${query.toString()}`,
          "folderVideos"
        );
        const pageMedias = folderMediaData.medias ?? [];
        const remoteHasMore = resolveFolderHasMore(
          folderMediaData,
          page,
          pageSize,
          pageMedias.length
        );
        const remain = maxVideosPerFolder - takenCount;
        if (remain <= 0) {
          if (singleFolderRun) {
            hasMorePage = true;
            nextPage = page;
          }
          break;
        }
        const medias = pageMedias.slice(0, remain);
        if (medias.length === 0) {
          if (singleFolderRun) {
            hasMorePage = false;
            nextPage = null;
          }
          break;
        }

        for (const media of medias) {
          const bvid = normalizeText(media.bvid);
          if (!bvid) continue;
          videosProcessed += 1;
          const timestamp = now();
          const publishAt = toMillis(media.pubtime ?? media.ctime, timestamp);
          const favAt = toMillis(media.fav_time, timestamp);

          const existing = state.videos.find((video) => normalizeKey(video.bvid) === normalizeKey(bvid));
          const basePayload = {
            bvid,
            title: normalizeText(media.title) || bvid,
            coverUrl: normalizeCoverUrl(media.cover),
            uploader: normalizeText((media.upper as { name?: string } | undefined)?.name) || "Unknown uploader",
            description: normalizeText(media.intro),
            publishAt,
            bvidUrl: normalizeBiliVideoUrl(media.link, bvid),
            isInvalid: false
          };

          const video: VideoRecord = existing || {
            id: state.counters.video++,
            ...basePayload,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp
          };

          video.bvid = basePayload.bvid;
          video.title = basePayload.title;
          video.coverUrl = basePayload.coverUrl;
          video.uploader = basePayload.uploader;
          video.description = basePayload.description;
          video.publishAt = basePayload.publishAt;
          video.bvidUrl = basePayload.bvidUrl;
          video.isInvalid = false;
          video.deletedAt = null;
          video.updatedAt = timestamp;

          if (!existing) {
            state.videos.push(video);
          }
          videosUpserted += 1;

          const existingLink = state.folderItems.find(
            (item) => item.folderId === localFolder.id && item.videoId === video.id
          );
          if (!existingLink) {
            state.folderItems.push({
              id: state.counters.folderItem++,
              folderId: localFolder.id,
              videoId: video.id,
              addedAt: favAt
            });
            folderLinksAdded += 1;
          } else if (favAt > existingLink.addedAt) {
            existingLink.addedAt = favAt;
          }

          const mediaTags = extractMediaTagNames(media);
          if ((options.includeTagEnrichment ?? true) && mediaTags.length === 0) {
            const bvidKey = normalizeText(media.bvid);
            if (bvidKey) {
              if (!archiveTagCache.has(bvidKey)) {
                try {
                  archiveTagCache.set(bvidKey, await fetchArchiveTagNames(bvidKey));
                } catch {
                  archiveTagCache.set(bvidKey, []);
                }
              }
              for (const fetchedTagName of archiveTagCache.get(bvidKey) ?? []) {
                if (!mediaTags.includes(fetchedTagName)) mediaTags.push(fetchedTagName);
              }
            }
          }

          for (const tagName of mediaTags) {
            const systemTag = ensureSystemTagByName(state, tagName);
            if (!systemTag) continue;
            const existed = state.videoTags.some(
              (edge) => edge.videoId === video.id && edge.tagId === systemTag.id
            );
            if (!existed) {
              state.videoTags.push({
                id: state.counters.videoTag++,
                videoId: video.id,
                tagId: systemTag.id
              });
              tagsBound += 1;
            }
          }
        }

        takenCount += medias.length;
        if (takenCount >= maxVideosPerFolder) {
          if (singleFolderRun) {
            hasMorePage = remoteHasMore;
            nextPage = hasMorePage ? page + 1 : null;
          }
          break;
        }
        if (!remoteHasMore) {
          if (singleFolderRun) {
            hasMorePage = false;
            nextPage = null;
          }
          break;
        }
        if (singleFolderRun) {
          hasMorePage = true;
          nextPage = page + 1;
        }
        await sleep(120 + Math.floor(Math.random() * 140));
      }
    } catch (error) {
      const message = isBiliRequestError(error)
        ? formatBiliRequestError(error)
        : error instanceof Error
          ? error.message
          : String(error);
      errors.push({
        folder: remoteFolder.title,
        message
      });
      const isRiskBlocked = isBiliRequestError(error)
        ? error.status === 412 || isRiskControlError(message)
        : isRiskControlError(message);
      if (isRiskBlocked) {
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

  const summary: SyncSummary = {
    foldersDetected: candidateFolders.length,
    foldersSynced,
    videosProcessed,
    videosUpserted,
    folderLinksAdded,
    tagsBound,
    errorCount: errors.length
  };

  const MAX_RETURN_ERRORS = 20;
  const returnedErrors = errors.slice(0, MAX_RETURN_ERRORS);
  const errorsOmitted = Math.max(0, errors.length - returnedErrors.length);

  return {
    ok: true,
    summary,
    hasMore,
    nextOffset: hasMore ? nextOffsetRaw : null,
    hasMorePage: singleFolderRun ? hasMorePage : false,
    nextPage: singleFolderRun && hasMorePage ? nextPage : null,
    riskBlocked,
    errors: returnedErrors,
    errorsOmitted,
    syncedAt: now()
  };
}

function buildExportPayload(state: LocalState) {
  const exportedAt = now();
  const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, "-");

  const folderById = new Map(state.folders.map((folder) => [folder.id, folder.name]));
  const tagById = new Map(state.tags.map((tag) => [tag.id, tag]));
  const folderNamesByVideo = new Map<number, string[]>();
  const latestAddedAtByVideo = new Map<number, number>();
  for (const relation of state.folderItems) {
    const bucket = folderNamesByVideo.get(relation.videoId) ?? [];
    const folderName = folderById.get(relation.folderId);
    if (folderName && !bucket.includes(folderName)) bucket.push(folderName);
    folderNamesByVideo.set(relation.videoId, bucket);

    const latestAddedAt = latestAddedAtByVideo.get(relation.videoId) ?? 0;
    if (relation.addedAt > latestAddedAt) {
      latestAddedAtByVideo.set(relation.videoId, relation.addedAt);
    }
  }

  const customTagsByVideo = new Map<number, string[]>();
  const systemTagsByVideo = new Map<number, string[]>();
  for (const relation of state.videoTags) {
    const tag = tagById.get(relation.tagId);
    if (!tag) continue;
    const target = tag.type === "custom" ? customTagsByVideo : systemTagsByVideo;
    const bucket = target.get(relation.videoId) ?? [];
    if (!bucket.includes(tag.name)) bucket.push(tag.name);
    target.set(relation.videoId, bucket);
  }

  return {
    exportedAt,
    stamp,
    folderNamesByVideo,
    latestAddedAtByVideo,
    customTagsByVideo,
    systemTagsByVideo
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function handleApi(request: LocalApiRequest): Promise<ApiResult> {
  const method = normalizeText(request.method || "GET").toUpperCase();
  const fullPath = normalizeText(request.path);
  const url = new URL(fullPath.startsWith("/") ? `https://local${fullPath}` : `https://local/${fullPath}`);
  const path = url.pathname;
  const params = url.searchParams;
  const body = (request.body ?? {}) as Record<string, unknown>;

  try {
    return await withState(async (state) => {
      if (method === "GET" && path === "/health") {
        return ok({ ok: true });
      }

      if (method === "POST" && path === "/sync/bilibili") {
        const offsetRaw = toIntOrNull(body.offset);
        const startPageRaw = toIntOrNull(body.startPage);
        const includeTagEnrichment =
          body.includeTagEnrichment === undefined ? true : Boolean(body.includeTagEnrichment);
        const maxFoldersRaw = toIntOrNull(body.maxFolders);
        const maxPagesRaw = toIntOrNull(body.maxPagesPerFolder);
        const maxVideosRaw = toIntOrNull(body.maxVideosPerFolder);
        const selectedRemoteFolderIds = Array.isArray(body.selectedRemoteFolderIds)
          ? body.selectedRemoteFolderIds
              .map((item) => toInt(item))
              .filter((item) => item > 0)
          : [];
        const offset = offsetRaw && offsetRaw > 0 ? offsetRaw : 0;
        const startPage = startPageRaw && startPageRaw > 0 ? startPageRaw : 1;
        const maxFolders =
          maxFoldersRaw && maxFoldersRaw > 0 ? Math.min(maxFoldersRaw, 500) : 10;
        const maxPagesPerFolder =
          maxPagesRaw && maxPagesRaw > 0 ? Math.min(maxPagesRaw, 200) : 5;
        const maxVideosPerFolder =
          maxVideosRaw && maxVideosRaw > 0 ? Math.min(maxVideosRaw, 5000) : 200;

        try {
          const data = await syncFromBilibiliToState(state, {
            offset,
            startPage,
            includeTagEnrichment,
            maxFolders,
            maxPagesPerFolder,
            selectedRemoteFolderIds,
            maxVideosPerFolder
          });
          return ok(data);
        } catch (error) {
          const message = isBiliRequestError(error)
            ? formatBiliRequestError(error)
            : error instanceof Error
              ? error.message
              : "Sync failed";
          if (isBiliRequestError(error) && error.status === 412) {
            return fail(
              412,
              `${message}. Open any Bilibili page in a tab, keep login active, and retry with one folder.`
            );
          }
          const lower = message.toLocaleLowerCase();
          if (lower.includes("login")) {
            return fail(401, message);
          }
          return fail(500, message);
        }
      }

      if (method === "POST" && path === "/sync/bilibili/folders") {
        try {
          const items = await fetchRemoteFoldersFromBilibili();
          return ok({
            ok: true,
            items,
            total: items.length
          });
        } catch (error) {
          const message = isBiliRequestError(error)
            ? formatBiliRequestError(error)
            : error instanceof Error
              ? error.message
              : "Fetch folder list failed";
          if (isBiliRequestError(error) && error.status === 412) {
            return fail(
              412,
              `${message}. Open any Bilibili page in a tab and retry folder discovery.`
            );
          }
          const lower = message.toLocaleLowerCase();
          if (lower.includes("login")) {
            return fail(401, message);
          }
          return fail(500, message);
        }
      }

      if (method === "POST" && path === "/import") {
        const format = normalizeText(body.format).toLowerCase();
        const content = String(body.content ?? "");
        if (format !== "json" && format !== "csv") {
          return fail(400, "Import format must be json or csv");
        }
        if (!content || content.trim().length < 2) {
          return fail(400, "Import content is empty");
        }

        try {
          const parsed = parseImportRows(format as "json" | "csv", content);
          const summary = {
            videosUpserted: 0,
            folderLinksAdded: 0,
            tagsBound: 0,
            foldersCreated: 0,
            tagsCreated: 0,
            rowsSkipped: parsed.skipped
          };

          for (const row of parsed.rows) {
            const timestamp = now();
            const existed = state.videos.find(
              (video) => normalizeKey(video.bvid) === normalizeKey(row.bvid)
            );
            const video: VideoRecord = existed || {
              id: state.counters.video++,
              bvid: row.bvid,
              title: row.title,
              coverUrl: normalizeCoverUrl(row.coverUrl),
              uploader: row.uploader,
              description: row.description,
              publishAt: row.publishAt,
              bvidUrl: row.bvidUrl,
              isInvalid: row.isInvalid,
              deletedAt: null,
              createdAt: timestamp,
              updatedAt: timestamp
            };

            video.bvid = row.bvid;
            video.title = row.title;
            video.coverUrl = normalizeCoverUrl(row.coverUrl);
            video.uploader = row.uploader || "Unknown uploader";
            video.description = row.description;
            video.publishAt = row.publishAt;
            video.bvidUrl = row.bvidUrl;
            video.isInvalid = row.isInvalid;
            video.deletedAt = null;
            video.updatedAt = timestamp;

            if (!existed) state.videos.push(video);
            summary.videosUpserted += 1;

            const folderNames = row.folders.length > 0 ? row.folders : ["Imported"];
            for (const folderName of folderNames) {
              const ensured = ensureFolderByNameForImport(state, folderName);
              if (!ensured) continue;
              if (ensured.created) summary.foldersCreated += 1;

              const addedAt = row.addedAt > 0 ? row.addedAt : timestamp;
              const existingLink = state.folderItems.find(
                (item) => item.folderId === ensured.folder.id && item.videoId === video.id
              );
              if (!existingLink) {
                state.folderItems.push({
                  id: state.counters.folderItem++,
                  folderId: ensured.folder.id,
                  videoId: video.id,
                  addedAt
                });
                summary.folderLinksAdded += 1;
              } else if (addedAt > existingLink.addedAt) {
                existingLink.addedAt = addedAt;
              }
            }

            for (const tagName of row.customTags) {
              const existedTag = state.tags.some(
                (candidate) =>
                  candidate.archivedAt === null &&
                  candidate.type === "custom" &&
                  normalizeKey(candidate.name) === normalizeKey(tagName)
              );
              const tag = ensureTag(state, tagName, "custom");
              if (!tag) continue;
              if (!existedTag) summary.tagsCreated += 1;
              const before = state.videoTags.length;
              ensureVideoTag(state, video.id, tag.id);
              if (state.videoTags.length > before) summary.tagsBound += 1;
            }
            for (const tagName of row.systemTags) {
              if (BLOCKED_SYSTEM_TAGS.has(normalizeText(tagName).toLowerCase())) continue;
              const existedTag = state.tags.some(
                (candidate) =>
                  candidate.archivedAt === null &&
                  candidate.type === "system" &&
                  normalizeKey(candidate.name) === normalizeKey(tagName)
              );
              const tag = ensureTag(state, tagName, "system");
              if (!tag) continue;
              if (!existedTag) summary.tagsCreated += 1;
              const before = state.videoTags.length;
              ensureVideoTag(state, video.id, tag.id);
              if (state.videoTags.length > before) summary.tagsBound += 1;
            }
          }

          return ok({
            ok: true,
            summary,
            importedAt: now()
          });
        } catch (error) {
          return fail(400, error instanceof Error ? error.message : "Import failed");
        }
      }

      if (method === "GET" && path === "/export") {
        const format = params.get("format") === "csv" ? "csv" : "json";
        const summary = {
          folders: state.folders.length,
          videos: state.videos.length,
          tags: state.tags.length
        };
        const { exportedAt, stamp, folderNamesByVideo, latestAddedAtByVideo, customTagsByVideo, systemTagsByVideo } =
          buildExportPayload(state);

        if (format === "json") {
          const content = JSON.stringify(
            {
              meta: {
                version: "v1",
                exportedAt,
                source: "bilishelf-extension-local"
              },
              folders: state.folders,
              videos: state.videos,
              folderItems: state.folderItems,
              tags: state.tags,
              videoTags: state.videoTags
            },
            null,
            2
          );

          return ok({
            format: "json",
            filename: `bilishelf-export-${stamp}.json`,
            mimeType: "application/json;charset=utf-8",
            content,
            summary
          });
        }

        const header = [
          "bvid",
          "title",
          "uploader",
          "description",
          "coverUrl",
          "bvidUrl",
          "partition",
          "publishAt",
          "addedAt",
          "folders",
          "customTags",
          "systemTags",
          "isInvalid",
          "deletedAt"
        ];
        const lines = [header.join(",")];

        for (const video of state.videos) {
          const row = [
            video.bvid,
            video.title,
            video.uploader,
            video.description,
            video.coverUrl,
            video.bvidUrl,
            "",
            video.publishAt ?? "",
            latestAddedAtByVideo.get(video.id) ?? "",
            (folderNamesByVideo.get(video.id) ?? []).join("|"),
            (customTagsByVideo.get(video.id) ?? []).join("|"),
            (systemTagsByVideo.get(video.id) ?? []).join("|"),
            video.isInvalid ? "1" : "0",
            video.deletedAt ?? ""
          ].map(csvEscape);
          lines.push(row.join(","));
        }

        return ok({
          format: "csv",
          filename: `bilishelf-export-${stamp}.csv`,
          mimeType: "text/csv;charset=utf-8",
          content: `\uFEFF${lines.join("\n")}`,
          summary
        });
      }

      if (method === "GET" && path === "/folders") {
        const items = activeFolders(state).map((folder) => {
          const itemCount = state.folderItems.filter((item) => {
            if (item.folderId !== folder.id) return false;
            const video = state.videos.find((row) => row.id === item.videoId);
            return !!video && video.deletedAt === null;
          }).length;

          return { ...folder, itemCount };
        });
        return ok({ items });
      }

      if (method === "POST" && path === "/folders") {
        const name = normalizeText(body.name);
        if (!name) return fail(400, "Folder name is required");

        const hasConflict = activeFolders(state).some(
          (folder) => normalizeKey(folder.name) === normalizeKey(name)
        );
        if (hasConflict) return fail(409, "Folder name already exists");

        const created: FolderRecord = {
          id: state.counters.folder++,
          name,
          description: normalizeText(body.description) || null,
          remoteMediaId: null,
          sortOrder: activeFolders(state).length + 1,
          deletedAt: null,
          createdAt: now(),
          updatedAt: now()
        };
        state.folders.push(created);
        return ok(created, 201);
      }

      const folderMatch = path.match(/^\/folders\/(\d+)$/);
      if (folderMatch && method === "PATCH") {
        const folderId = toInt(folderMatch[1]);
        const folder = state.folders.find((row) => row.id === folderId);
        if (!folder || folder.deletedAt !== null) return fail(404, "Folder not found");

        const nextName = normalizeText(body.name);
        if (nextName) {
          const hasConflict = activeFolders(state).some(
            (row) => row.id !== folderId && normalizeKey(row.name) === normalizeKey(nextName)
          );
          if (hasConflict) return fail(409, "Folder name already exists");
          folder.name = nextName;
        }

        if (Object.prototype.hasOwnProperty.call(body, "description")) {
          folder.description = normalizeText(body.description) || null;
        }

        folder.updatedAt = now();
        return ok(folder);
      }

      if (folderMatch && method === "DELETE") {
        const folderId = toInt(folderMatch[1]);
        const folder = state.folders.find((row) => row.id === folderId);
        if (!folder || folder.deletedAt !== null) return fail(404, "Folder not found");
        folder.deletedAt = now();
        folder.updatedAt = now();
        markOrphanVideosDeleted(state);
        return ok({ ok: true });
      }

      if (method === "PATCH" && path === "/folders/order") {
        const folderIds = Array.isArray(body.folderIds) ? body.folderIds.map((item) => toInt(item)) : [];
        if (folderIds.length === 0) return fail(400, "folderIds is required");

        const active = activeFolders(state);
        const activeSet = new Set(active.map((item) => item.id));
        const ordered: number[] = [];
        for (const id of folderIds) {
          if (activeSet.has(id) && !ordered.includes(id)) ordered.push(id);
        }
        for (const folder of active) {
          if (!ordered.includes(folder.id)) ordered.push(folder.id);
        }

        ordered.forEach((id, index) => {
          const folder = state.folders.find((row) => row.id === id);
          if (folder) folder.sortOrder = index + 1;
        });
        return ok({ ok: true, orderedIds: ordered });
      }

      if (method === "GET" && path === "/trash/folders") {
        const items = state.folders
          .filter((folder) => folder.deletedAt !== null)
          .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))
          .map((folder) => {
            const itemCount = state.folderItems.filter((item) => item.folderId === folder.id).length;
            return { ...folder, itemCount };
          });
        return ok({ items });
      }

      const restoreFolderMatch = path.match(/^\/trash\/folders\/(\d+)\/restore$/);
      if (restoreFolderMatch && method === "POST") {
        const folderId = toInt(restoreFolderMatch[1]);
        const folder = state.folders.find((row) => row.id === folderId);
        if (!folder || folder.deletedAt === null) return fail(404, "Folder not found");

        folder.deletedAt = null;
        folder.updatedAt = now();
        recalculateFolderSortOrders(state);

        const restoreVideos = body.restoreVideos !== false;
        if (restoreVideos) {
          const linkedVideoIds = state.folderItems
            .filter((item) => item.folderId === folder.id)
            .map((item) => item.videoId);
          for (const video of state.videos) {
            if (linkedVideoIds.includes(video.id)) {
              video.deletedAt = null;
              video.updatedAt = now();
            }
          }
        }
        return ok({ ok: true });
      }

      const purgeFolderMatch = path.match(/^\/trash\/folders\/(\d+)$/);
      if (purgeFolderMatch && method === "DELETE") {
        const folderId = toInt(purgeFolderMatch[1]);
        const folder = state.folders.find((row) => row.id === folderId);
        if (!folder || folder.deletedAt === null) return fail(404, "Folder not found");

        const linkedVideoIds = state.folderItems
          .filter((item) => item.folderId === folderId)
          .map((item) => item.videoId);

        state.folderItems = state.folderItems.filter((item) => item.folderId !== folderId);
        state.folders = state.folders.filter((row) => row.id !== folderId);

        for (const videoId of linkedVideoIds) {
          const stillLinked = state.folderItems.some((item) => item.videoId === videoId);
          if (!stillLinked) {
            removeVideoCompletely(state, videoId);
          }
        }
        return ok(undefined, 204);
      }

      if (method === "POST" && path === "/videos") {
        const bvid = normalizeText(body.bvid);
        const title = normalizeText(body.title);
        const bvidUrl = normalizeBiliVideoUrl(body.bvidUrl, bvid);
        if (!bvid || !title || !bvidUrl) return fail(400, "Video payload is incomplete");

        const folderIds = Array.isArray(body.folderIds) ? body.folderIds.map((id) => toInt(id)) : [];
        const activeFolderIdSet = new Set(activeFolders(state).map((folder) => folder.id));
        const validFolderIds = folderIds.filter((id) => activeFolderIdSet.has(id));
        if (validFolderIds.length === 0) return fail(400, "At least one folder is required");

        const existed = state.videos.find((video) => normalizeKey(video.bvid) === normalizeKey(bvid));
        const timestamp = now();
        const video: VideoRecord = existed || {
          id: state.counters.video++,
          bvid,
          title,
          coverUrl: normalizeText(body.coverUrl),
          uploader: normalizeText(body.uploader),
          description: normalizeText(body.description),
          publishAt: toIntOrNull(body.publishAt),
          bvidUrl,
          isInvalid: false,
          deletedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        video.bvid = bvid;
        video.title = title;
        video.coverUrl = normalizeText(body.coverUrl);
        video.uploader = normalizeText(body.uploader);
        video.description = normalizeText(body.description);
        video.publishAt = toIntOrNull(body.publishAt);
        video.bvidUrl = bvidUrl;
        video.isInvalid = Boolean(body.isInvalid);
        video.deletedAt = null;
        video.updatedAt = timestamp;

        if (!existed) {
          state.videos.push(video);
        }

        for (const folderId of validFolderIds) {
          if (folderItemExists(state, folderId, video.id)) continue;
          state.folderItems.push({
            id: state.counters.folderItem++,
            folderId,
            videoId: video.id,
            addedAt: timestamp
          });
        }

        const customTags = Array.isArray(body.customTags) ? body.customTags : [];
        const systemTags = Array.isArray(body.systemTags) ? body.systemTags : [];
        for (const tagName of customTags) {
          const tag = ensureTag(state, tagName, "custom");
          if (tag) ensureVideoTag(state, video.id, tag.id);
        }
        for (const tagName of systemTags) {
          const tag = ensureTag(state, tagName, "system");
          if (tag) ensureVideoTag(state, video.id, tag.id);
        }

        return ok(mapVideo(state, video), existed ? 200 : 201);
      }

      const videoByIdMatch = path.match(/^\/videos\/(\d+)$/);
      if (videoByIdMatch && method === "GET") {
        const videoId = toInt(videoByIdMatch[1]);
        const video = state.videos.find((row) => row.id === videoId && row.deletedAt === null);
        if (!video) return fail(404, "Video not found");

        const folders = state.folderItems
          .filter((item) => item.videoId === videoId)
          .map((item) => state.folders.find((folder) => folder.id === item.folderId))
          .filter((folder): folder is FolderRecord => !!folder && folder.deletedAt === null)
          .map((folder) => ({ id: folder.id, name: folder.name }));

        const tags = state.videoTags
          .filter((edge) => edge.videoId === videoId)
          .map((edge) => state.tags.find((tag) => tag.id === edge.tagId))
          .filter((tag): tag is TagRecord => !!tag && tag.archivedAt === null)
          .map((tag) => ({ id: tag.id, name: tag.name, type: tag.type }));

        return ok({
          ...mapVideo(state, video),
          folders,
          tags
        });
      }

      if (videoByIdMatch && method === "DELETE") {
        const videoId = toInt(videoByIdMatch[1]);
        const video = state.videos.find((row) => row.id === videoId && row.deletedAt === null);
        if (!video) return fail(404, "Video not found");
        video.deletedAt = now();
        video.updatedAt = now();
        return ok(undefined, 204);
      }

      if (method === "GET" && path === "/videos") {
        const folderIdRaw = params.get("folderId");
        const folderId = folderIdRaw ? toInt(folderIdRaw) : undefined;
        const items = filterVideoList(state, {
          includeDeleted: false,
          folderId,
          tags: parseListParam(params, "tags"),
          title: params.get("title") || undefined,
          description: params.get("description") || undefined,
          uploader: params.get("uploader") || undefined,
          customTag: params.get("customTag") || undefined,
          systemTag: params.get("systemTag") || undefined,
          from: toIntOrNull(params.get("from")),
          to: toIntOrNull(params.get("to"))
        });
        const data = paginate(items, params.get("page"), params.get("pageSize"));
        return ok(data);
      }

      if (method === "GET" && path === "/videos/search") {
        const folderIdRaw = params.get("folderId");
        const folderId = folderIdRaw ? toInt(folderIdRaw) : undefined;
        const items = filterVideoList(state, {
          includeDeleted: false,
          folderId,
          tags: parseListParam(params, "tags"),
          q: params.get("q") || undefined,
          title: params.get("title") || undefined,
          description: params.get("description") || undefined,
          uploader: params.get("uploader") || undefined,
          customTag: params.get("customTag") || undefined,
          systemTag: params.get("systemTag") || undefined,
          from: toIntOrNull(params.get("from")),
          to: toIntOrNull(params.get("to"))
        });
        const data = paginate(items, params.get("page"), params.get("pageSize"));
        return ok(data);
      }

      if (method === "POST" && path === "/videos/batch/folders") {
        const mode = body.mode === "move" ? "move" : body.mode === "copy" ? "copy" : "";
        const folderId = toInt(body.folderId);
        const targetFolder = state.folders.find((row) => row.id === folderId && row.deletedAt === null);
        if (!targetFolder) return fail(400, "Target folder is invalid");
        if (!mode) return fail(400, "mode must be move or copy");

        const sourceFolderId = params.get("sourceFolderId") ? toInt(params.get("sourceFolderId")) : null;
        const videoIds = Array.isArray(body.videoIds) ? body.videoIds.map((id) => toInt(id)) : [];
        let affected = 0;

        for (const videoId of videoIds) {
          const video = state.videos.find((row) => row.id === videoId && row.deletedAt === null);
          if (!video) continue;

          if (mode === "move") {
            if (sourceFolderId) {
              state.folderItems = state.folderItems.filter(
                (item) => !(item.videoId === videoId && item.folderId === sourceFolderId)
              );
            }

            if (!folderItemExists(state, folderId, videoId)) {
              state.folderItems.push({
                id: state.counters.folderItem++,
                folderId,
                videoId,
                addedAt: now()
              });
            }

            video.updatedAt = now();
            affected += 1;
            continue;
          }

          const clonedAt = now();
          const cloneSuffix = `${clonedAt}_${Math.random().toString(36).slice(2, 8)}`;
          const copiedBvid = `${normalizeOutputBvid(video.bvid)}__copy__${cloneSuffix}`;
          const clonedVideo: VideoRecord = {
            id: state.counters.video++,
            bvid: copiedBvid,
            title: video.title,
            coverUrl: video.coverUrl,
            uploader: video.uploader,
            description: video.description,
            publishAt: video.publishAt,
            bvidUrl: video.bvidUrl,
            isInvalid: video.isInvalid,
            deletedAt: null,
            createdAt: clonedAt,
            updatedAt: clonedAt
          };
          state.videos.push(clonedVideo);

          state.folderItems.push({
            id: state.counters.folderItem++,
            folderId,
            videoId: clonedVideo.id,
            addedAt: clonedAt
          });

          const sourceTagRows = state.videoTags.filter((edge) => edge.videoId === video.id);
          for (const sourceTag of sourceTagRows) {
            state.videoTags.push({
              id: state.counters.videoTag++,
              videoId: clonedVideo.id,
              tagId: sourceTag.tagId
            });
          }

          affected += 1;
        }

        if (mode === "move") {
          markOrphanVideosDeleted(state);
        }
        return ok({ ok: true, affected });
      }

      if (method === "POST" && path === "/videos/batch/delete") {
        const mode = body.mode === "folderOnly" ? "folderOnly" : body.mode === "global" ? "global" : "";
        if (!mode) return fail(400, "mode is invalid");

        const videoIds = Array.isArray(body.videoIds) ? body.videoIds.map((id) => toInt(id)) : [];
        let affected = 0;

        if (mode === "folderOnly") {
          const folderId = toInt(body.folderId);
          if (!folderId) return fail(400, "folderId is required");
          state.folderItems = state.folderItems.filter((item) => {
            const shouldRemove = item.folderId === folderId && videoIds.includes(item.videoId);
            if (shouldRemove) affected += 1;
            return !shouldRemove;
          });
          markOrphanVideosDeleted(state);
        } else {
          for (const video of state.videos) {
            if (!videoIds.includes(video.id)) continue;
            if (video.deletedAt === null) {
              video.deletedAt = now();
              video.updatedAt = now();
              affected += 1;
            }
          }
        }

        return ok({ ok: true, affected });
      }

      if (method === "GET" && path === "/tags") {
        const page = params.get("page");
        const pageSize = params.get("pageSize");
        const type = params.get("type");
        const search = normalizeText(params.get("search"));

        const items = state.tags
          .filter((tag) => tag.archivedAt === null)
          .filter((tag) => (type === "system" || type === "custom" ? tag.type === type : true))
          .filter((tag) => (search ? includesIgnoreCase(tag.name, search) : true))
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((tag) => {
            const linkedVideoIds = state.videoTags
              .filter((edge) => edge.tagId === tag.id)
              .map((edge) => edge.videoId);
            const usageCount = state.videos.filter(
              (video) => video.deletedAt === null && linkedVideoIds.includes(video.id)
            ).length;
            return {
              id: tag.id,
              name: tag.name,
              type: tag.type,
              usageCount,
              createdAt: tag.createdAt
            };
          });

        const data = paginate(items, page, pageSize);
        return ok(data);
      }

      if (method === "POST" && path === "/tags") {
        const name = normalizeText(body.name);
        const type = body.type === "system" ? "system" : "custom";
        if (!name) return fail(400, "Tag name is required");

        const existing = state.tags.find(
          (tag) =>
            tag.archivedAt === null &&
            tag.type === type &&
            normalizeKey(tag.name) === normalizeKey(name)
        );

        if (existing) {
          return ok({
            id: existing.id,
            name: existing.name,
            type: existing.type,
            usageCount: 0,
            createdAt: existing.createdAt
          });
        }

        const created: TagRecord = {
          id: state.counters.tag++,
          name,
          type,
          createdAt: now(),
          archivedAt: null
        };
        state.tags.push(created);
        return ok(
          {
            id: created.id,
            name: created.name,
            type: created.type,
            usageCount: 0,
            createdAt: created.createdAt
          },
          201
        );
      }

      const tagMatch = path.match(/^\/tags\/(\d+)$/);
      if (tagMatch && method === "PATCH") {
        const tagId = toInt(tagMatch[1]);
        const tag = state.tags.find((row) => row.id === tagId && row.archivedAt === null);
        if (!tag) return fail(404, "Tag not found");

        const nextName = normalizeText(body.name);
        if (!nextName) return fail(400, "Tag name is required");

        const mergedTarget = state.tags.find(
          (row) =>
            row.id !== tag.id &&
            row.archivedAt === null &&
            row.type === tag.type &&
            normalizeKey(row.name) === normalizeKey(nextName)
        );

        if (mergedTarget) {
          for (const edge of state.videoTags.filter((row) => row.tagId === tag.id)) {
            ensureVideoTag(state, edge.videoId, mergedTarget.id);
          }
          state.videoTags = state.videoTags.filter((row) => row.tagId !== tag.id);
          tag.archivedAt = now();

          return ok({
            id: mergedTarget.id,
            name: mergedTarget.name,
            type: mergedTarget.type,
            usageCount: 0,
            createdAt: mergedTarget.createdAt
          });
        }

        tag.name = nextName;
        return ok({
          id: tag.id,
          name: tag.name,
          type: tag.type,
          usageCount: 0,
          createdAt: tag.createdAt
        });
      }

      if (tagMatch && method === "DELETE") {
        const tagId = toInt(tagMatch[1]);
        const tag = state.tags.find((row) => row.id === tagId && row.archivedAt === null);
        if (!tag) return fail(404, "Tag not found");
        tag.archivedAt = now();
        state.videoTags = state.videoTags.filter((edge) => edge.tagId !== tagId);
        return ok(undefined, 204);
      }

      if (method === "GET" && path === "/trash/videos") {
        const items = filterVideoList(state, { includeDeleted: true })
          .filter((video) => video.deletedAt !== null)
          .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
        const data = paginate(items, params.get("page"), params.get("pageSize"));
        return ok(data);
      }

      const restoreVideoMatch = path.match(/^\/trash\/videos\/(\d+)\/restore$/);
      if (restoreVideoMatch && method === "POST") {
        const videoId = toInt(restoreVideoMatch[1]);
        const video = state.videos.find((row) => row.id === videoId && row.deletedAt !== null);
        if (!video) return fail(404, "Video not found");
        video.deletedAt = null;
        video.updatedAt = now();
        return ok({ ok: true });
      }

      const purgeVideoMatch = path.match(/^\/trash\/videos\/(\d+)$/);
      if (purgeVideoMatch && method === "DELETE") {
        const videoId = toInt(purgeVideoMatch[1]);
        const video = state.videos.find((row) => row.id === videoId && row.deletedAt !== null);
        if (!video) return fail(404, "Video not found");
        removeVideoCompletely(state, videoId);
        return ok(undefined, 204);
      }

      return fail(404, `Route not found: ${method} ${path}`);
    }, method !== "GET");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return fail(500, message);
  }
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;

    const request = (message.request || {}) as LocalApiRequest;
    handleApi(request).then(sendResponse).catch((error) => {
      sendResponse(
        fail(500, error instanceof Error ? error.message : "Internal server error")
      );
    });
    return true;
  });
});
