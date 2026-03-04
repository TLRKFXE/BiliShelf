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
  uploaderSpaceUrl: string | null;
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

type TagEnrichmentMeta = {
  paused: boolean;
  cursorAfterVideoId: number;
  totalMissing: number;
  lastBatchProcessed: number;
  lastBatchBound: number;
  lastRunAt: number | null;
  lastError: string | null;
};

type SyncMeta = {
  tagEnrichment: TagEnrichmentMeta;
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
  syncMeta: SyncMeta;
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
const TAG_ENRICH_ALARM = "bilishelf-tag-enrich";
const TAG_ENRICH_BATCH_SIZE = 3;
const TAG_ENRICH_RETRY_DELAY_MINUTES = 1;
const TAG_ENRICH_RISK_DELAY_MINUTES = 15;
const TAG_SYNC_ENABLED = false;
const BILI_FETCH_TIMEOUT_MS = 18_000;
const BILI_META_API_GAP_MS = 280;
const BILI_META_API_GAP_JITTER_MS = 100;
const REMOTE_FOLDERS_CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOW_PAGE_CONTEXT_FALLBACK = false;
const FAVORITES_COOLDOWN_EVERY_VIDEOS = 400;
const FAVORITES_COOLDOWN_MS = 30_000;
const FAVORITES_PAGE_GAP_MS = 650;
const FAVORITES_PAGE_GAP_JITTER_MS = 120;

type SyncFetchStage = "nav" | "folders" | "folderVideos";
type FetchSource = "extension" | "page";

type TabBridgePayload = {
  ok: boolean;
  status: number;
  payload?: unknown;
  error?: string;
};

type FavoritesSyncSummaryStatus = {
  foldersDetected: number;
  foldersSynced: number;
  videosProcessed: number;
  videosUpserted: number;
  folderLinksAdded: number;
  tagsBound: number;
  errorCount: number;
};

type FavoritesSyncStatus = {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  total: number;
  current: number;
  folderTitle: string;
  folderIndex: number;
  folderTotal: number;
  message: string;
  lastError: string | null;
  riskBlocked: boolean;
  resumePageByFolder: Record<string, number>;
  summary: FavoritesSyncSummaryStatus;
  errors: Array<{ folder: string; message: string }>;
};

type FavoritesSyncProgress = {
  total: number;
  current: number;
  folderTitle: string;
  folderIndex: number;
  folderTotal: number;
  message: string;
};

const defaultTagEnrichmentMeta = (): TagEnrichmentMeta => ({
  paused: false,
  cursorAfterVideoId: 0,
  totalMissing: 0,
  lastBatchProcessed: 0,
  lastBatchBound: 0,
  lastRunAt: null,
  lastError: null
});

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
  videoTags: [],
  syncMeta: {
    tagEnrichment: defaultTagEnrichmentMeta()
  }
});

const emptyFavoritesSyncSummary = (): FavoritesSyncSummaryStatus => ({
  foldersDetected: 0,
  foldersSynced: 0,
  videosProcessed: 0,
  videosUpserted: 0,
  folderLinksAdded: 0,
  tagsBound: 0,
  errorCount: 0
});

const defaultFavoritesSyncStatus = (): FavoritesSyncStatus => ({
  running: false,
  startedAt: null,
  finishedAt: null,
  total: 0,
  current: 0,
  folderTitle: "",
  folderIndex: 0,
  folderTotal: 0,
  message: "",
  lastError: null,
  riskBlocked: false,
  resumePageByFolder: {},
  summary: emptyFavoritesSyncSummary(),
  errors: []
});

let dbPromise: Promise<IDBDatabase> | null = null;
let stateQueue: Promise<void> = Promise.resolve();
let tagEnrichmentTask: Promise<void> | null = null;
let biliCookieHeaderCache: { value: string; expiresAt: number } | null = null;
let nextBiliRequestAt = 0;
let biliRequestThrottleQueue: Promise<void> = Promise.resolve();
let favoritesSyncTask: Promise<void> | null = null;
let favoritesSyncStatus: FavoritesSyncStatus = defaultFavoritesSyncStatus();

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
        videos: (raw.videos ?? []).map((video) => ({
          ...video,
          uploaderSpaceUrl: normalizeBiliSpaceUrl(
            (video as Partial<VideoRecord>).uploaderSpaceUrl
          )
        })),
        folderItems: raw.folderItems ?? [],
        tags: raw.tags ?? [],
        videoTags: raw.videoTags ?? [],
        syncMeta: {
          tagEnrichment: {
            paused: Boolean(raw.syncMeta?.tagEnrichment?.paused),
            cursorAfterVideoId: toInt(raw.syncMeta?.tagEnrichment?.cursorAfterVideoId, 0),
            totalMissing: toInt(raw.syncMeta?.tagEnrichment?.totalMissing, 0),
            lastBatchProcessed: toInt(raw.syncMeta?.tagEnrichment?.lastBatchProcessed, 0),
            lastBatchBound: toInt(raw.syncMeta?.tagEnrichment?.lastBatchBound, 0),
            lastRunAt: toIntOrNull(raw.syncMeta?.tagEnrichment?.lastRunAt),
            lastError: normalizeText(raw.syncMeta?.tagEnrichment?.lastError) || null
          }
        }
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBiliRequestGap(stage: SyncFetchStage) {
  if (stage === "folderVideos") {
    // Page loop already waits 500ms between pages, keep extra gap at 0.
    return 0;
  }
  return BILI_META_API_GAP_MS + Math.floor(Math.random() * BILI_META_API_GAP_JITTER_MS);
}

async function throttleBiliRequest(stage: SyncFetchStage) {
  const waitForTurn = biliRequestThrottleQueue;
  let release!: () => void;
  biliRequestThrottleQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await waitForTurn;
  try {
    const nowTs = Date.now();
    const waitMs = Math.max(0, nextBiliRequestAt - nowTs);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    nextBiliRequestAt = Date.now() + getBiliRequestGap(stage);
  } finally {
    release();
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Bilibili API request timeout (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
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
  uploaderSpaceUrl: string | null;
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
      uploaderSpaceUrl: normalizeBiliSpaceUrl(row.uploaderSpaceUrl),
      description: normalizeText(row.description),
      publishAt: parseTimestampInput(row.publishAt),
      bvidUrl,
      isInvalid: Boolean(row.isInvalid),
      addedAt: parseTimestampInput(row.addedAt) ?? nowTs,
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

      const addedAt = parseTimestampInput(relation.addedAt ?? relation.addedAtText);
      if (addedAt && addedAt > 0) {
        const prev = addedAtByVideoId.get(key) ?? 0;
        if (addedAt > prev) addedAtByVideoId.set(key, addedAt);
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
      const favoriteAt =
        addedAtByVideoId.get(key) ??
        parseTimestampInput(
          video.favoriteAt ??
            video.favoriteAtText ??
            video.addedAt ??
            video.addedAtText
        ) ??
        nowTs;
      pushRow({
        bvid: video.bvid,
        title: video.title,
        coverUrl: video.coverUrl,
        uploader: video.uploader,
        uploaderSpaceUrl: normalizeText(video.uploaderSpaceUrl || video.uploaderUrl),
        description: video.description,
        publishAt: parseTimestampInput(video.publishAt ?? video.publishAtText),
        bvidUrl: video.bvidUrl,
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
        ) ?? nowTs,
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

async function getBiliCookieHeader(forceRefresh = false) {
  const nowTs = Date.now();
  if (!forceRefresh && biliCookieHeaderCache && biliCookieHeaderCache.expiresAt > nowTs) {
    return biliCookieHeaderCache.value;
  }

  if (!chrome.cookies?.getAll) {
    return "";
  }

  const cookies = await chrome.cookies.getAll({ domain: "bilibili.com" });
  const validPairs = cookies
    .map((item) => ({
      name: normalizeText(item.name),
      value: normalizeText(item.value)
    }))
    .filter((item) => item.name && item.value);
  const hasSessData = validPairs.some((item) => item.name === "SESSDATA");
  if (!hasSessData) {
    return "";
  }

  const header = validPairs.map((item) => `${item.name}=${item.value}`).join("; ");
  biliCookieHeaderCache = {
    value: header,
    expiresAt: nowTs + 90_000
  };
  return header;
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
  const tabs = await chrome.tabs.query({
    url: ["https://*.bilibili.com/*", "http://*.bilibili.com/*"]
  });
  const activeTab = tabs.find((tab) => tab.active && typeof tab.id === "number");
  if (activeTab?.id) return activeTab.id;
  const fallback = tabs.find((tab) => typeof tab.id === "number");
  return fallback?.id ?? null;
}

async function fetchBiliJsonViaPageContext<T>(url: string, stage: SyncFetchStage): Promise<T> {
  const tabId = await findBilibiliTabId();
  if (!tabId) {
    throw new BiliRequestError({
      status: 428,
      stage,
      source: "page",
      url,
      message: "No Bilibili tab found for page-context request. Open any Bilibili page and retry."
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
      throw new BiliRequestError({
        status: 403,
        stage,
        source: "page",
        url,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    try {
      await injectSyncBridgeScript(tabId);
    } catch (injectError) {
      throw new BiliRequestError({
        status: 403,
        stage,
        source: "page",
        url,
        message:
          injectError instanceof Error
            ? injectError.message
            : "Failed to inject page bridge script"
      });
    }
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
  const maxAttempts = 3;
  let lastError: BiliRequestError | null = null;
  let manualCookieHeader = await getBiliCookieHeader();
  if (!manualCookieHeader) {
    throw new BiliRequestError({
      status: 401,
      stage,
      source: "extension",
      url,
      message: "SESSDATA cookie is missing. Please login to Bilibili in this browser."
    });
  }
  let allowManualCookieHeader = true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        Referer: `${BILI_ORIGIN}/`,
        Origin: BILI_ORIGIN
      };
      if (allowManualCookieHeader && manualCookieHeader) {
        headers.Cookie = manualCookieHeader;
      }
      await throttleBiliRequest(stage);
      const response = await fetchWithTimeout(
        url,
        {
        credentials: "include",
        headers
        },
        BILI_FETCH_TIMEOUT_MS
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Login/session may have rotated, refresh cached cookie once.
          manualCookieHeader = await getBiliCookieHeader(true);
        }
        if (response.status === 412) {
          throw new BiliRequestError({
            status: response.status,
            stage,
            source: "extension",
            url,
            message: `Bilibili API request failed (${response.status})`
          });
        }
        if (attempt < maxAttempts && isRetryableStatus(response.status)) {
          const backoff = 420 * attempt + Math.floor(Math.random() * 240);
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
      const rawMessage = error instanceof Error ? error.message : String(error ?? "");
      if (
        allowManualCookieHeader &&
        rawMessage.toLowerCase().includes("unsafe header") &&
        rawMessage.toLowerCase().includes("cookie")
      ) {
        allowManualCookieHeader = false;
        if (attempt < maxAttempts) continue;
      }
      const timeoutLike = rawMessage.toLowerCase().includes("timeout");
      lastError = timeoutLike
        ? new BiliRequestError({
            status: 504,
            stage,
            source: "extension",
            url,
            message: "Bilibili API request timeout"
          })
        : toBiliRequestError(error, stage, "extension", url);
      if (lastError.status === 412) {
        break;
      }
      if (attempt < maxAttempts) {
        const backoff = 420 * attempt + Math.floor(Math.random() * 240);
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
  let extErr: BiliRequestError | null = null;
  try {
    return await fetchBiliJsonByExtension<T>(url, stage);
  } catch (extensionError) {
    extErr = toBiliRequestError(extensionError, stage, "extension", url);
  }

  if (!ALLOW_PAGE_CONTEXT_FALLBACK) {
    throw (
      extErr ||
      new BiliRequestError({
        status: 500,
        stage,
        source: "extension",
        url,
        message: "Bilibili API request failed"
      })
    );
  }
  if (extErr.status === 412 || extErr.status === 401) {
    throw extErr;
  }

  try {
    return await fetchBiliJsonViaPageContext<T>(url, stage);
  } catch (pageError) {
    const pageErr = toBiliRequestError(pageError, stage, "page", url);
    if (!extErr) {
      throw pageErr;
    }
    throw new BiliRequestError({
      status: pageErr.status || extErr.status,
      stage,
      source: pageErr.source,
      url,
      message: `${formatBiliRequestError(extErr)} | fallback failed: ${formatBiliRequestError(pageErr)}`
    });
  }
}

type RemoteFolder = { remoteId: number; title: string; mediaCount: number };
let remoteFoldersCache: { expiresAt: number; items: RemoteFolder[] } | null = null;

function pickRemoteFolderId(raw: Record<string, unknown>) {
  const id = toInt(raw.id ?? raw.media_id ?? 0, 0);
  return id > 0 ? id : 0;
}

async function fetchRemoteFoldersFromBilibili(forceRefresh = false) {
  const nowTs = Date.now();
  if (!forceRefresh && remoteFoldersCache && remoteFoldersCache.expiresAt > nowTs) {
    return remoteFoldersCache.items;
  }

  const nav = await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(BILI_NAV_API, "nav");
  const mid = toInt(nav.mid ?? 0, 0);
  if (!nav.isLogin || mid <= 0) {
    throw new Error("Please login to Bilibili in current browser first");
  }

  const folderData = await fetchBiliJson<{ list?: Array<Record<string, unknown>> }>(
    `${BILI_FOLDERS_API}?up_mid=${mid}`,
    "folders"
  );
  const items = (folderData.list ?? [])
    .map((item) => ({
      remoteId: pickRemoteFolderId(item),
      title: normalizeText(item.title),
      mediaCount: toInt((item as { media_count?: unknown }).media_count ?? 0, 0)
    }))
    .filter((item) => item.remoteId > 0 && item.title && item.mediaCount > 0) as RemoteFolder[];
  remoteFoldersCache = {
    items,
    expiresAt: nowTs + REMOTE_FOLDERS_CACHE_TTL_MS
  };
  return items;
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

function getSystemTagIdSet(state: LocalState) {
  return new Set(
    state.tags
      .filter((tag) => tag.archivedAt === null && tag.type === "system")
      .map((tag) => tag.id)
  );
}

function getVideoIdSetWithSystemTags(state: LocalState) {
  const systemTagIds = getSystemTagIdSet(state);
  return new Set(
    state.videoTags
      .filter((relation) => systemTagIds.has(relation.tagId))
      .map((relation) => relation.videoId)
  );
}

function ensureTagEnrichmentMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = { tagEnrichment: defaultTagEnrichmentMeta() };
  }
  if (!state.syncMeta.tagEnrichment) {
    state.syncMeta.tagEnrichment = defaultTagEnrichmentMeta();
  }
  return state.syncMeta.tagEnrichment;
}

function collectMissingSystemTagCandidates(
  state: LocalState,
  limit: number,
  cursorAfterVideoId = 0
) {
  const hasSystemTagVideoIds = getVideoIdSetWithSystemTags(state);
  const missingVideos = state.videos
    .filter((video) => video.deletedAt === null && !hasSystemTagVideoIds.has(video.id))
    .sort((a, b) => a.id - b.id);
  const threshold = Math.max(0, cursorAfterVideoId);
  const preferred = missingVideos.filter((video) => video.id > threshold);
  const chosen = (preferred.length > 0 ? preferred : missingVideos).slice(0, Math.max(1, limit));
  return {
    total: missingVideos.length,
    items: chosen
  };
}

function collectMissingSystemTagCandidateDtos(
  state: LocalState,
  limit: number,
  cursorAfterVideoId = 0
) {
  const batch = collectMissingSystemTagCandidates(state, limit, cursorAfterVideoId);
  return {
    total: batch.total,
    items: batch.items
      .map((video) => ({ id: video.id, bvid: video.bvid }))
  };
}

function countMissingSystemTagVideos(state: LocalState) {
  const hasSystemTagVideoIds = getVideoIdSetWithSystemTags(state);
  return state.videos.filter((video) => video.deletedAt === null && !hasSystemTagVideoIds.has(video.id)).length;
}

function bindSystemTagsToVideo(state: LocalState, videoId: number, tagNames: string[]) {
  let boundCount = 0;
  for (const tagName of tagNames) {
    const tag = ensureSystemTagByName(state, tagName);
    if (!tag) continue;
    const exists = state.videoTags.some(
      (relation) => relation.videoId === videoId && relation.tagId === tag.id
    );
    if (exists) continue;
    state.videoTags.push({
      id: state.counters.videoTag++,
      videoId,
      tagId: tag.id
    });
    boundCount += 1;
  }
  return boundCount;
}

function scheduleTagEnrichment(minutes: number) {
  if (!chrome.alarms?.create) return;
  chrome.alarms.create(TAG_ENRICH_ALARM, {
    delayInMinutes: Math.max(1, Math.ceil(minutes))
  });
}

async function runTagEnrichmentBatch(trigger: "sync" | "alarm" | "startup") {
  const plan = await withState((state) => {
    const meta = ensureTagEnrichmentMeta(state);
    const batch = collectMissingSystemTagCandidateDtos(
      state,
      TAG_ENRICH_BATCH_SIZE,
      meta.cursorAfterVideoId
    );
    meta.totalMissing = batch.total;
    meta.lastBatchProcessed = 0;
    meta.lastBatchBound = 0;
    if (meta.paused) {
      return {
        paused: true as const,
        candidates: [] as Array<{ id: number; bvid: string }>,
        cursorAfterVideoId: meta.cursorAfterVideoId,
        totalMissing: batch.total
      };
    }
    return {
      paused: false as const,
      candidates: batch.items,
      cursorAfterVideoId: meta.cursorAfterVideoId,
      totalMissing: batch.total
    };
  }, true);

  if (plan.paused) return;
  if (plan.candidates.length === 0) {
    if (chrome.alarms?.clear) chrome.alarms.clear(TAG_ENRICH_ALARM);
    return;
  }

  const fetchedTagMap = new Map<number, string[]>();
  let riskBlocked = false;
  let lastProcessedVideoId = plan.cursorAfterVideoId;
  let lastErrorMessage: string | null = null;
  for (const candidate of plan.candidates) {
    lastProcessedVideoId = candidate.id;
    const bvid = normalizeText(candidate.bvid);
    if (!bvid) continue;
    try {
      const names = await fetchArchiveTagNames(bvid);
      if (names.length > 0) {
        fetchedTagMap.set(candidate.id, names);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastErrorMessage = message;
      if ((error instanceof BiliRequestError && error.status === 412) || isRiskControlError(message)) {
        riskBlocked = true;
        break;
      }
    }
    await sleep(850 + Math.floor(Math.random() * 260));
  }

  const result = await withState((state) => {
    const meta = ensureTagEnrichmentMeta(state);
    let bound = 0;
    if (fetchedTagMap.size > 0) {
      for (const [videoId, tagNames] of fetchedTagMap) {
        const video = state.videos.find((item) => item.id === videoId && item.deletedAt === null);
        if (!video) continue;
        bound += bindSystemTagsToVideo(state, video.id, tagNames);
      }
    }

    meta.lastRunAt = now();
    meta.lastBatchProcessed = plan.candidates.length;
    meta.lastBatchBound = bound;
    meta.totalMissing = countMissingSystemTagVideos(state);
    meta.cursorAfterVideoId = lastProcessedVideoId;
    meta.lastError = riskBlocked ? lastErrorMessage || "Risk-control blocked (412)" : null;
    if (meta.totalMissing <= 0) {
      meta.cursorAfterVideoId = 0;
      meta.lastError = null;
    }

    return {
      missing: meta.totalMissing
    };
  }, true);

  if (riskBlocked) {
    scheduleTagEnrichment(TAG_ENRICH_RISK_DELAY_MINUTES);
    return;
  }
  if (result.missing > 0) {
    scheduleTagEnrichment(TAG_ENRICH_RETRY_DELAY_MINUTES);
    return;
  }

  if (trigger === "startup" && result.missing === 0 && chrome.alarms?.clear) {
    chrome.alarms.clear(TAG_ENRICH_ALARM);
  }
}

function triggerTagEnrichment(trigger: "sync" | "alarm" | "startup") {
  if (tagEnrichmentTask) return tagEnrichmentTask;
  tagEnrichmentTask = runTagEnrichmentBatch(trigger)
    .catch((error) => {
      console.warn("[tag-enrich] failed:", error);
      scheduleTagEnrichment(TAG_ENRICH_RETRY_DELAY_MINUTES);
    })
    .finally(() => {
      tagEnrichmentTask = null;
    });
  return tagEnrichmentTask;
}

function getTagEnrichmentStatus(state: LocalState) {
  if (!TAG_SYNC_ENABLED) {
    return {
      paused: true,
      running: false,
      cursorAfterVideoId: 0,
      totalMissing: 0,
      lastBatchProcessed: 0,
      lastBatchBound: 0,
      lastRunAt: null,
      lastError: "Tag sync is disabled"
    };
  }
  const meta = ensureTagEnrichmentMeta(state);
  return {
    paused: meta.paused,
    running: Boolean(tagEnrichmentTask),
    cursorAfterVideoId: meta.cursorAfterVideoId,
    totalMissing: meta.totalMissing,
    lastBatchProcessed: meta.lastBatchProcessed,
    lastBatchBound: meta.lastBatchBound,
    lastRunAt: meta.lastRunAt,
    lastError: meta.lastError
  };
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
    selectedRemoteFolderIds?: number[];
    resumePageByFolder?: Record<string, number>;
    onProgress?: (progress: FavoritesSyncProgress) => void;
  }
) {
  const selectedIdSet = new Set(
    (options.selectedRemoteFolderIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
  const remoteFolders = await fetchRemoteFoldersFromBilibili();
  const foldersToSync =
    selectedIdSet.size > 0
      ? Array.from(selectedIdSet)
          .map((remoteId) => {
            const remoteFolder = remoteFolders.find((item) => item.remoteId === remoteId);
            if (remoteFolder) return remoteFolder;
            const localFolder = state.folders.find(
              (folder) => folder.deletedAt === null && folder.remoteMediaId === remoteId
            );
            return {
              remoteId,
              title: localFolder?.name || `Bilibili Favorite ${remoteId}`,
              mediaCount: 0
            } as RemoteFolder;
          })
          .filter((item) => item.remoteId > 0)
      : remoteFolders;
  const totalEstimate = foldersToSync.reduce(
    (sum, folder) => sum + Math.max(0, Number(folder.mediaCount || 0)),
    0
  );

  let foldersSynced = 0;
  let videosProcessed = 0;
  let videosUpserted = 0;
  let folderLinksAdded = 0;
  let tagsBound = 0;
  let riskBlocked = false;
  const errors: Array<{ folder: string; message: string }> = [];
  let progressCurrent = 0;
  let videosSinceCooldown = 0;
  const resumePageByFolder: Record<string, number> = {};
  for (const [remoteIdRaw, pageRaw] of Object.entries(options.resumePageByFolder ?? {})) {
    const remoteId = toInt(remoteIdRaw);
    const page = toInt(pageRaw);
    if (remoteId > 0 && page > 1) {
      resumePageByFolder[String(remoteId)] = page;
    }
  }
  const emitProgress = (progress: Omit<FavoritesSyncProgress, "total" | "current">) => {
    options.onProgress?.({
      total: totalEstimate,
      current: progressCurrent,
      ...progress
    });
  };

  for (const remoteFolder of foldersToSync) {
    try {
      const localFolder = ensureLocalFolderByRemoteId(state, remoteFolder);
      foldersSynced += 1;
      emitProgress({
        folderTitle: remoteFolder.title,
        folderIndex: foldersSynced,
        folderTotal: foldersToSync.length,
        message: `Syncing: ${remoteFolder.title}`
      });
      const pageSize = 20;
      let page = Math.max(1, toInt(resumePageByFolder[String(remoteFolder.remoteId)] || 1));
      if (page > 1) {
        emitProgress({
          folderTitle: remoteFolder.title,
          folderIndex: foldersSynced,
          folderTotal: foldersToSync.length,
          message: `Resuming from page ${page}: ${remoteFolder.title}`
        });
      }
      let folderFailed = false;
      const remoteBvidKeys = new Set<string>();
      while (true) {
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

        let folderMediaData: BiliFolderMediaListData;
        try {
          folderMediaData = await fetchBiliJson<BiliFolderMediaListData>(
            `${BILI_FOLDER_VIDEOS_API}?${query.toString()}`,
            "folderVideos"
          );
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
          const isRisk = isBiliRequestError(error)
            ? error.status === 412 || isRiskControlError(message)
            : isRiskControlError(message);
          if (isRisk) {
            riskBlocked = true;
          }
          folderFailed = true;
          break;
        }

        const medias = folderMediaData.medias ?? [];
        if (medias.length === 0) {
          break;
        }

        for (const media of medias) {
          const bvid = normalizeText(media.bvid ?? media.bv_id);
          if (!bvid) continue;
          remoteBvidKeys.add(normalizeKey(bvid));
          videosProcessed += 1;
          videosSinceCooldown += 1;
          const timestamp = now();
          const publishAt = toMillis(media.pubtime ?? media.ctime, timestamp);
          const favAt = toMillis(media.fav_time, timestamp);
          const existing = state.videos.find(
            (video) => normalizeKey(video.bvid) === normalizeKey(bvid)
          );
          const basePayload = {
            bvid,
            title: normalizeText(media.title) || bvid,
            coverUrl: normalizeCoverUrl(media.cover),
            uploader:
              normalizeText((media.upper as { name?: string } | undefined)?.name) ||
              "Unknown uploader",
            uploaderSpaceUrl: normalizeBiliSpaceUrl(
              (media.upper as { space?: string; mid?: number } | undefined)?.space,
              (media.upper as { mid?: number } | undefined)?.mid
            ),
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
          video.uploaderSpaceUrl = basePayload.uploaderSpaceUrl;
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
        }
        progressCurrent += medias.length;
        emitProgress({
          folderTitle: remoteFolder.title,
          folderIndex: foldersSynced,
          folderTotal: foldersToSync.length,
          message: `Syncing page ${page}: ${remoteFolder.title}`
        });

        const remoteHasMore = resolveFolderHasMore(
          folderMediaData,
          page,
          pageSize,
          medias.length
        );
        if (videosSinceCooldown >= FAVORITES_COOLDOWN_EVERY_VIDEOS) {
          videosSinceCooldown = 0;
          await sleep(FAVORITES_COOLDOWN_MS);
        }
        if (!remoteHasMore) {
          delete resumePageByFolder[String(remoteFolder.remoteId)];
          break;
        }
        page += 1;
        resumePageByFolder[String(remoteFolder.remoteId)] = page;
        await sleep(FAVORITES_PAGE_GAP_MS + Math.floor(Math.random() * FAVORITES_PAGE_GAP_JITTER_MS));
      }

      if (!folderFailed) {
        const folderVideoIdSet = new Set(
          state.videos
            .filter((video) => remoteBvidKeys.has(normalizeKey(video.bvid)))
            .map((video) => video.id)
        );
        state.folderItems = state.folderItems.filter((item) => {
          if (item.folderId !== localFolder.id) return true;
          return folderVideoIdSet.has(item.videoId);
        });
        markOrphanVideosDeleted(state);
      }

      if (riskBlocked) {
        errors.push({
          folder: "__sync__",
          message: "Bilibili risk-control (412) detected. Stop and retry later."
        });
        break;
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
        riskBlocked = true;
        errors.push({
          folder: "__sync__",
          message: "Bilibili risk-control (412) detected. Stop and retry later."
        });
        break;
      }
    }
  }

  const summary: SyncSummary = {
    foldersDetected: foldersToSync.length,
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
    hasMore: false,
    nextOffset: null,
    hasMorePage: false,
    nextPage: null,
    riskBlocked,
    resumePageByFolder,
    errors: returnedErrors,
    errorsOmitted,
    syncedAt: now()
  };
}

function getFavoritesSyncStatus() {
  return {
    ...favoritesSyncStatus,
    resumePageByFolder: { ...favoritesSyncStatus.resumePageByFolder },
    summary: { ...favoritesSyncStatus.summary },
    errors: favoritesSyncStatus.errors.slice(0, 30)
  };
}

function updateFavoritesSyncStatus(patch: Partial<FavoritesSyncStatus>) {
  favoritesSyncStatus = {
    ...favoritesSyncStatus,
    ...patch,
    resumePageByFolder: patch.resumePageByFolder
      ? { ...patch.resumePageByFolder }
      : { ...favoritesSyncStatus.resumePageByFolder },
    summary: patch.summary
      ? { ...patch.summary }
      : { ...favoritesSyncStatus.summary },
    errors: patch.errors ? [...patch.errors] : [...favoritesSyncStatus.errors]
  };
}

function startFavoritesSyncTask(params: {
  selectedRemoteFolderIds: number[];
  resumePageByFolder?: Record<string, number>;
}) {
  if (favoritesSyncTask) {
    return false;
  }

  const resumePageByFolder: Record<string, number> = {};
  for (const [remoteIdRaw, pageRaw] of Object.entries(params.resumePageByFolder ?? {})) {
    const remoteId = toInt(remoteIdRaw);
    const page = toInt(pageRaw);
    if (remoteId > 0 && page > 1) {
      resumePageByFolder[String(remoteId)] = page;
    }
  }

  const startedAt = now();
  updateFavoritesSyncStatus({
    running: true,
    startedAt,
    finishedAt: null,
    total: 0,
    current: 0,
    folderTitle: "",
    folderIndex: 0,
    folderTotal: 0,
    message: "Starting favorites sync...",
    lastError: null,
    riskBlocked: false,
    resumePageByFolder,
    summary: emptyFavoritesSyncSummary(),
    errors: []
  });

  favoritesSyncTask = withState(
    async (state) =>
      syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: params.selectedRemoteFolderIds,
        resumePageByFolder,
        onProgress: (progress) => {
          updateFavoritesSyncStatus({
            total: progress.total,
            current: progress.current,
            folderTitle: progress.folderTitle,
            folderIndex: progress.folderIndex,
            folderTotal: progress.folderTotal,
            message: progress.message
          });
        }
      }),
    true
  )
    .then((result) => {
      updateFavoritesSyncStatus({
        running: false,
        finishedAt: now(),
        total: Math.max(favoritesSyncStatus.total, result.summary.videosProcessed),
        current: result.summary.videosProcessed,
        message: "Favorites sync completed",
        lastError:
          result.errors.length > 0
            ? result.errors[result.errors.length - 1]?.message || null
            : null,
        riskBlocked: Boolean(result.riskBlocked),
        resumePageByFolder: result.resumePageByFolder ?? {},
        summary: result.summary,
        errors: result.errors
      });
    })
    .catch((error) => {
      const message = isBiliRequestError(error)
        ? formatBiliRequestError(error)
        : error instanceof Error
          ? error.message
          : String(error);
      updateFavoritesSyncStatus({
        running: false,
        finishedAt: now(),
        message: "Favorites sync failed",
        lastError: message
      });
    })
    .finally(() => {
      favoritesSyncTask = null;
    });

  return true;
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

function handleReadOnlyApi(
  state: LocalState,
  path: string,
  params: URLSearchParams
): ApiResult | null {
  if (path === "/health") {
    return ok({ ok: true });
  }

  if (path === "/folders") {
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

  if (path === "/trash/folders") {
    const items = state.folders
      .filter((folder) => folder.deletedAt !== null)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))
      .map((folder) => {
        const itemCount = state.folderItems.filter((item) => item.folderId === folder.id).length;
        return { ...folder, itemCount };
      });
    return ok({ items });
  }

  if (path === "/videos") {
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

  if (path === "/videos/search") {
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

  if (path === "/tags") {
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

  if (path === "/trash/videos") {
    const items = filterVideoList(state, { includeDeleted: true })
      .filter((video) => video.deletedAt !== null)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    const data = paginate(items, params.get("page"), params.get("pageSize"));
    return ok(data);
  }

  return null;
}

async function handleApi(request: LocalApiRequest): Promise<ApiResult> {
  const method = normalizeText(request.method || "GET").toUpperCase();
  const fullPath = normalizeText(request.path);
  const url = new URL(fullPath.startsWith("/") ? `https://local${fullPath}` : `https://local/${fullPath}`);
  const path = url.pathname;
  const params = url.searchParams;
  const body = (request.body ?? {}) as Record<string, unknown>;

  // Fast-path status endpoints must bypass withState queue, otherwise
  // long-running sync tasks block polling and trigger frontend timeouts.
  if (method === "GET" && path === "/sync/bilibili/history-model/status") {
    return ok(getFavoritesSyncStatus());
  }

  if (method === "POST" && path === "/sync/bilibili/history-model/start") {
    const selectedRemoteFolderIds = Array.isArray(body.selectedRemoteFolderIds)
      ? body.selectedRemoteFolderIds
          .map((item) => toInt(item))
          .filter((item) => item > 0)
      : [];
    const resumePageByFolderRaw =
      body.resumePageByFolder && typeof body.resumePageByFolder === "object"
        ? (body.resumePageByFolder as Record<string, unknown>)
        : {};
    const resumePageByFolder: Record<string, number> = {};
    for (const [remoteIdRaw, pageRaw] of Object.entries(resumePageByFolderRaw)) {
      const remoteId = toInt(remoteIdRaw);
      const page = toInt(pageRaw);
      if (remoteId > 0 && page > 1) {
        resumePageByFolder[String(remoteId)] = page;
      }
    }
    const started = startFavoritesSyncTask({
      selectedRemoteFolderIds,
      resumePageByFolder
    });
    return ok({
      ok: true,
      started,
      status: getFavoritesSyncStatus()
    });
  }

  if (method === "GET") {
    const snapshot = await readState();
    const fastReadResult = handleReadOnlyApi(snapshot, path, params);
    if (fastReadResult) return fastReadResult;
  }

  try {
    return await withState(async (state) => {
      if (method === "GET" && path === "/health") {
        return ok({ ok: true });
      }

      if (method === "GET" && path === "/sync/bilibili/tag-enrichment/status") {
        return ok(getTagEnrichmentStatus(state));
      }

      if (method === "POST" && path === "/sync/bilibili/tag-enrichment/pause") {
        if (!TAG_SYNC_ENABLED) {
          return ok({
            ok: true,
            ...getTagEnrichmentStatus(state)
          });
        }
        const meta = ensureTagEnrichmentMeta(state);
        meta.paused = true;
        meta.lastError = null;
        if (chrome.alarms?.clear) {
          chrome.alarms.clear(TAG_ENRICH_ALARM);
        }
        return ok({
          ok: true,
          ...getTagEnrichmentStatus(state)
        });
      }

      if (method === "POST" && path === "/sync/bilibili/tag-enrichment/resume") {
        if (!TAG_SYNC_ENABLED) {
          return ok({
            ok: true,
            ...getTagEnrichmentStatus(state)
          });
        }
        const meta = ensureTagEnrichmentMeta(state);
        meta.paused = false;
        meta.lastError = null;
        scheduleTagEnrichment(1);
        void triggerTagEnrichment("sync");
        return ok({
          ok: true,
          ...getTagEnrichmentStatus(state)
        });
      }

      if (method === "POST" && path === "/sync/bilibili/tag-enrichment/run") {
        if (!TAG_SYNC_ENABLED) {
          return ok({
            ok: true,
            ...getTagEnrichmentStatus(state)
          });
        }
        const meta = ensureTagEnrichmentMeta(state);
        if (!meta.paused) {
          scheduleTagEnrichment(1);
          void triggerTagEnrichment("sync");
        }
        return ok({
          ok: true,
          ...getTagEnrichmentStatus(state)
        });
      }

      if (method === "POST" && path === "/sync/bilibili") {
        const selectedRemoteFolderIds = Array.isArray(body.selectedRemoteFolderIds)
          ? body.selectedRemoteFolderIds
              .map((item) => toInt(item))
              .filter((item) => item > 0)
          : [];

        try {
          const data = await syncFromBilibiliToState(state, {
            selectedRemoteFolderIds
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
          const forceRefresh = Boolean(body.forceRefresh);
          const items = await fetchRemoteFoldersFromBilibili(forceRefresh);
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
              uploaderSpaceUrl: normalizeBiliSpaceUrl(row.uploaderSpaceUrl),
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
            video.uploaderSpaceUrl = normalizeBiliSpaceUrl(row.uploaderSpaceUrl);
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
          const exportVideos = state.videos.map((video) => ({
            ...video,
            publishAtText: formatTimestamp(video.publishAt),
            favoriteAt: latestAddedAtByVideo.get(video.id) ?? null,
            favoriteAtText: formatTimestamp(latestAddedAtByVideo.get(video.id) ?? null)
          }));
          const exportFolderItems = state.folderItems.map((item) => ({
            ...item,
            addedAtText: formatTimestamp(item.addedAt)
          }));
          const content = JSON.stringify(
            {
              meta: {
                version: "v1",
                exportedAt,
                exportedAtText: formatTimestamp(exportedAt),
                source: "bilishelf-extension-local"
              },
              folders: state.folders,
              videos: exportVideos,
              folderItems: exportFolderItems,
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

        for (const video of state.videos) {
          const favoriteAtMs = latestAddedAtByVideo.get(video.id) ?? "";
          const addedAtMs = latestAddedAtByVideo.get(video.id) ?? "";
          const publishAtMs = video.publishAt ?? "";
          const row = [
            video.bvid,
            video.title,
            video.uploader,
            video.uploaderSpaceUrl ?? "",
            video.description,
            video.coverUrl,
            video.bvidUrl,
            "",
            formatTimestamp(video.publishAt),
            publishAtMs,
            formatTimestamp(typeof favoriteAtMs === "number" ? favoriteAtMs : null),
            favoriteAtMs,
            formatTimestamp(typeof addedAtMs === "number" ? addedAtMs : null),
            addedAtMs,
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
          uploaderSpaceUrl: normalizeBiliSpaceUrl(body.uploaderSpaceUrl),
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
        video.uploaderSpaceUrl = normalizeBiliSpaceUrl(body.uploaderSpaceUrl);
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

      if (videoByIdMatch && method === "PATCH") {
        const videoId = toInt(videoByIdMatch[1]);
        const video = state.videos.find((row) => row.id === videoId && row.deletedAt === null);
        if (!video) return fail(404, "Video not found");

        const hasAnyPatchField = [
          "title",
          "coverUrl",
          "uploader",
          "uploaderSpaceUrl",
          "description",
          "publishAt",
          "bvidUrl",
          "isInvalid",
          "customTags",
          "systemTags"
        ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
        if (!hasAnyPatchField) return fail(400, "At least one field is required");

        if (Object.prototype.hasOwnProperty.call(body, "title")) {
          const title = normalizeText(body.title);
          if (!title) return fail(400, "title cannot be empty");
          video.title = title;
        }
        if (Object.prototype.hasOwnProperty.call(body, "coverUrl")) {
          video.coverUrl = normalizeCoverUrl(body.coverUrl);
        }
        if (Object.prototype.hasOwnProperty.call(body, "uploader")) {
          const uploader = normalizeText(body.uploader);
          if (!uploader) return fail(400, "uploader cannot be empty");
          video.uploader = uploader;
        }
        if (Object.prototype.hasOwnProperty.call(body, "uploaderSpaceUrl")) {
          video.uploaderSpaceUrl = normalizeBiliSpaceUrl(body.uploaderSpaceUrl);
        }
        if (Object.prototype.hasOwnProperty.call(body, "description")) {
          video.description = normalizeText(body.description);
        }
        if (Object.prototype.hasOwnProperty.call(body, "publishAt")) {
          video.publishAt = parseTimestampInput(body.publishAt);
        }
        if (Object.prototype.hasOwnProperty.call(body, "bvidUrl")) {
          video.bvidUrl = normalizeBiliVideoUrl(body.bvidUrl, video.bvid);
        }
        if (Object.prototype.hasOwnProperty.call(body, "isInvalid")) {
          video.isInvalid = Boolean(body.isInvalid);
        }

        if (Object.prototype.hasOwnProperty.call(body, "customTags")) {
          const customTagIds = new Set(
            state.videoTags
              .filter((edge) => edge.videoId === videoId)
              .filter((edge) => {
                const tag = state.tags.find((row) => row.id === edge.tagId);
                return !!tag && tag.archivedAt === null && tag.type === "custom";
              })
              .map((edge) => edge.tagId)
          );

          if (customTagIds.size > 0) {
            state.videoTags = state.videoTags.filter(
              (edge) => !(edge.videoId === videoId && customTagIds.has(edge.tagId))
            );
          }

          const customTagNames = uniqueTextList(Array.isArray(body.customTags) ? body.customTags : []);
          for (const tagName of customTagNames) {
            const tag = ensureTag(state, tagName, "custom");
            if (!tag) continue;
            ensureVideoTag(state, videoId, tag.id);
          }
        }

        if (Object.prototype.hasOwnProperty.call(body, "systemTags")) {
          const systemTagIds = new Set(
            state.videoTags
              .filter((edge) => edge.videoId === videoId)
              .filter((edge) => {
                const tag = state.tags.find((row) => row.id === edge.tagId);
                return !!tag && tag.archivedAt === null && tag.type === "system";
              })
              .map((edge) => edge.tagId)
          );

          if (systemTagIds.size > 0) {
            state.videoTags = state.videoTags.filter(
              (edge) => !(edge.videoId === videoId && systemTagIds.has(edge.tagId))
            );
          }

          const systemTagNames = uniqueTextList(Array.isArray(body.systemTags) ? body.systemTags : []).filter(
            (tagName) => !BLOCKED_SYSTEM_TAGS.has(normalizeKey(tagName))
          );
          for (const tagName of systemTagNames) {
            const tag = ensureTag(state, tagName, "system");
            if (!tag) continue;
            ensureVideoTag(state, videoId, tag.id);
          }
        }

        video.updatedAt = now();

        return ok(mapVideo(state, video));
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
            uploaderSpaceUrl: video.uploaderSpaceUrl,
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
  if (TAG_SYNC_ENABLED && chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== TAG_ENRICH_ALARM) return;
      void triggerTagEnrichment("alarm");
    });
  }

  if (TAG_SYNC_ENABLED) {
    void triggerTagEnrichment("startup");
  }

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
