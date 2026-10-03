import type {
  AiCategoryKey,
  AiOrganizerConfig,
  AiOrganizerPreviewItem,
  AiOrganizerStatus,
  AiProvider,
  AiSettings,
  AiSettingsModelsResponse,
  CreateVideoPayload,
  FavoriteArticle,
  FavoriteComment,
  FollowingUpImportStatus,
  FollowedUp,
  FolderAiCategories,
  Folder,
  HistoryModelSyncStatus,
  Pagination,
  Tag,
  Video,
  VideoFilter,
} from "../types";
import {
  resolveExtensionRuntime,
  sendExtensionRuntimeMessage,
} from "./extension-runtime.js";

const API_BASE = "/api";
const LOCAL_API_MESSAGE = "BILISHELF_LOCAL_API";
const EXTENSION_REQUEST_TIMEOUT_DEFAULT_MS = 30_000;
const EXTENSION_REQUEST_TIMEOUT_SYNC_MS = 900_000;
const EXTENSION_REQUEST_TIMEOUT_SYNC_FOLDERS_MS = 90_000;
const EXTENSION_REQUEST_TIMEOUT_TAG_ENRICH_MS = 60_000;
const EXTENSION_REQUEST_TIMEOUT_WEBDAV_MS = 180_000;
const EXTENSION_REQUEST_TIMEOUT_AI_CATEGORIES_MS = 180_000;

type LocalApiRequest = {
  method: string;
  path: string;
  body?: unknown;
};

type LocalApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

export type ExtensionUpdateStatus = {
  currentVersion: string;
  channel: "chrome" | "edge" | "firefox";
  checkedAt: number | null;
  lastError: string | null;
  storeVersion: string | null;
  storeUrl: string | null;
  githubVersion: string | null;
  githubLabel: string | null;
  githubUrl: string;
  latestVersion: string;
  latestLabel: string;
  updateAvailable: boolean;
  storeUpdateAvailable: boolean;
  githubUpdateAvailable: boolean;
  storePending: boolean;
  preferredSource: "store" | "github";
  preferredUrl: string;
  repositoryUrl: string;
  releasesUrl: string;
  notice: {
    previousVersion: string;
    currentVersion: string;
    installedAt: number;
  } | null;
};

function shouldUseLocalExtensionApi() {
  if (import.meta.env.VITE_RUNTIME_TARGET === "extension") return true;
  const runtime = resolveExtensionRuntime();
  if (!runtime) return false;
  return (
    window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "moz-extension:"
  );
}

export function isExtensionLocalApiRuntime() {
  return shouldUseLocalExtensionApi();
}

function parseRequestBody(init?: RequestInit): unknown {
  if (!init?.body) return undefined;
  if (typeof init.body === "string") {
    try {
      return JSON.parse(init.body);
    } catch {
      return init.body;
    }
  }
  return init.body;
}

function resolveExtensionRequestTimeout(path: string, method: string) {
  if (
    method === "POST" &&
    /^\/folders\/\d+\/ai-(categories|analysis)$/.test(path)
  ) {
    return EXTENSION_REQUEST_TIMEOUT_AI_CATEGORIES_MS;
  }
  if (path === "/sync/bilibili" && method === "POST") {
    return EXTENSION_REQUEST_TIMEOUT_SYNC_MS;
  }
  if (path === "/sync/bilibili/folders" && method === "POST") {
    return EXTENSION_REQUEST_TIMEOUT_SYNC_FOLDERS_MS;
  }
  if (path.startsWith("/sync/bilibili/tag-enrichment/")) {
    return EXTENSION_REQUEST_TIMEOUT_TAG_ENRICH_MS;
  }
  if (path.startsWith("/backup/webdav/")) {
    return EXTENSION_REQUEST_TIMEOUT_WEBDAV_MS;
  }
  return EXTENSION_REQUEST_TIMEOUT_DEFAULT_MS;
}

function requestThroughExtension<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const transport = resolveExtensionRuntime();
  if (!transport) {
    throw new Error("Extension runtime is unavailable");
  }

  const payload: LocalApiRequest = {
    method: (init?.method || "GET").toUpperCase(),
    path,
    body: parseRequestBody(init),
  };

  const message = {
    type: LOCAL_API_MESSAGE,
    request: payload,
  };
  const timeoutMs = resolveExtensionRequestTimeout(path, payload.method);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      handler();
    };
    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(`Extension API request timeout (${payload.method} ${path})`)
        )
      );
    }, timeoutMs);

    const handleResponse = (response?: unknown) => {
      const result = (response ?? {}) as LocalApiResponse<T>;
      if (result.ok) {
        finish(() => resolve(result.data as T));
        return;
      }

      finish(() =>
        reject(
          new Error(result.error || `Request failed: ${result.status ?? 500}`)
        )
      );
    };

    sendExtensionRuntimeMessage(transport, message)
      .then(handleResponse)
      .catch((error) => finish(() => reject(error)));
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (shouldUseLocalExtensionApi()) {
    return requestThroughExtension<T>(path, init);
  }

  const headers = new Headers(init?.headers ?? {});
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      extractErrorMessage(text) || `Request failed: ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function extractErrorMessage(rawText: string) {
  if (!rawText) return "Request failed";

  try {
    const parsed = JSON.parse(rawText) as { message?: string };
    return parsed.message ?? rawText;
  } catch {
    return rawText;
  }
}

export async function fetchFolders() {
  const data = await request<{ items: Folder[] }>("/folders");
  return data.items;
}

export async function fetchArticleFolders() {
  const data = await request<{ items: Folder[] }>("/article-folders");
  return data.items;
}

export async function fetchFollowingUps() {
  const data = await request<{ items: FollowedUp[] }>("/following-ups");
  return data.items;
}

export async function fetchFavoriteComments(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 20));
  return request<{ items: FavoriteComment[]; pagination: Pagination }>(
    `/comments?${params.toString()}`
  );
}

export async function deleteFavoriteComment(id: number) {
  return request<{ ok: true }>(`/comments/${id}`, { method: "DELETE" });
}

export async function fetchTrashComments(options?: {
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 20));
  return request<{ items: FavoriteComment[]; pagination: Pagination }>(
    `/trash/comments?${params.toString()}`,
  );
}

export async function restoreTrashComment(id: number) {
  return request<{ ok: true }>(`/trash/comments/${id}/restore`, { method: "POST" });
}

export async function purgeTrashComment(id: number) {
  return request<void>(`/trash/comments/${id}`, { method: "DELETE" });
}

export async function fetchFavoriteArticles(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
  folderId?: number;
}) {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 20));
  if (options?.folderId) params.set("folderId", String(options.folderId));
  return request<{ items: FavoriteArticle[]; pagination: Pagination }>(
    `/articles?${params.toString()}`
  );
}

export async function deleteFavoriteArticle(id: number) {
  return request<{ ok: true }>(`/articles/${id}`, { method: "DELETE" });
}

export async function fetchTrashArticles(options?: {
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 20));
  return request<{ items: FavoriteArticle[]; pagination: Pagination }>(
    `/trash/articles?${params.toString()}`,
  );
}

export async function restoreTrashArticle(id: number) {
  return request<{ ok: true }>(`/trash/articles/${id}/restore`, { method: "POST" });
}

export async function purgeTrashArticle(id: number) {
  return request<void>(`/trash/articles/${id}`, { method: "DELETE" });
}

export async function updateFavoriteArticleFolders(id: number, folderIds: number[]) {
  return request<FavoriteArticle>(`/articles/${id}/folders`, {
    method: "PATCH",
    body: JSON.stringify({ folderIds }),
  });
}

export async function createArticleFolder(payload: {
  name: string;
  description?: string;
  groupName?: string | null;
}) {
  return request<Folder>("/article-folders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateArticleFolder(
  id: number,
  payload: { name?: string; description?: string | null; groupName?: string | null },
) {
  return request<Folder>(`/article-folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteArticleFolder(id: number) {
  return request<void>(`/article-folders/${id}`, { method: "DELETE" });
}

export async function reorderArticleFolders(folderIds: number[]) {
  return request<{ ok: true; orderedIds: number[] }>("/article-folders/order", {
    method: "PATCH",
    body: JSON.stringify({ folderIds }),
  });
}

export async function startFollowingUpImport(payload?: Record<string, never>) {
  return request<{
    ok: true;
    started: boolean;
    status: FollowingUpImportStatus;
  }>("/sync/bilibili/following-ups/start", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchFollowingUpImportStatus() {
  return request<FollowingUpImportStatus>("/sync/bilibili/following-ups/status");
}

export async function createFolder(payload: {
  name: string;
  description?: string;
  groupName?: string | null;
}) {
  return request<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFolder(
  id: number,
  payload: { name?: string; description?: string | null; groupName?: string | null }
) {
  return request<Folder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteFolder(id: number) {
  return request<void>(`/folders/${id}`, {
    method: "DELETE",
  });
}

export async function reorderFolders(folderIds: number[]) {
  return request<{ ok: true; orderedIds: number[] }>("/folders/order", {
    method: "PATCH",
    body: JSON.stringify({ folderIds }),
  });
}

export async function fetchTrashFolders() {
  const data = await request<{ items: Folder[] }>("/trash/folders");
  return data.items;
}

export async function restoreTrashFolder(id: number, restoreVideos = true) {
  return request<{ ok: true }>(`/trash/folders/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({ restoreVideos }),
  });
}

export async function purgeTrashFolder(id: number) {
  return request<void>(`/trash/folders/${id}`, {
    method: "DELETE",
  });
}

export async function createVideo(payload: CreateVideoPayload) {
  return request<Video>("/videos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchVideoById(id: number) {
  return request<
    Video & {
      folders?: Array<{ id: number; name: string }>;
      tags?: Array<{ id: number; name: string; type: "system" | "custom" }>;
      aiAnalysis?: {
        category: AiCategoryKey;
        analyzedAt: number | null;
        provider: string;
        model: string;
      };
    }
  >(`/videos/${id}`);
}

export async function updateVideo(
  id: number,
  payload: {
    title?: string;
    coverUrl?: string;
    uploader?: string;
    uploaderSpaceUrl?: string | null;
    description?: string;
    partition?: string;
    publishAt?: number | null;
    bvidUrl?: string;
    isInvalid?: boolean;
    customTags?: string[];
    systemTags?: string[];
  }
) {
  return request<Video>(`/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type FolderPlaybackSession = {
  folderId: number;
  currentIndex: number;
  createdAt: number;
  updatedAt: number;
  queue: Array<{
    id: number | null;
    videoId: number | null;
    bvid: string | null;
    title: string | null;
    url: string | null;
    coverUrl: string | null;
    isInvalid: boolean;
  }>;
};

export type StartFolderPlaybackResult = {
  folderId: number;
  session: FolderPlaybackSession | null;
  firstItem: FolderPlaybackSession["queue"][number] | null;
  playable: number;
  skippedInvalid: number;
  truncated: boolean;
  opened: boolean;
};

export async function startFolderPlaybackSession(payload: {
  folderId: number;
  q?: string;
  tags?: string[];
  filters?: VideoFilter;
  openTab?: boolean;
}) {
  return request<StartFolderPlaybackResult>("/playback/folder-session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchVideos(options: {
  page?: number;
  pageSize?: number;
  folderId?: number;
  tags?: string[];
  filters?: VideoFilter;
}) {
  const searchParams = new URLSearchParams();
  if (options.page) searchParams.set("page", String(options.page));
  if (options.pageSize) searchParams.set("pageSize", String(options.pageSize));
  if (options.folderId) searchParams.set("folderId", String(options.folderId));
  if (options.tags && options.tags.length > 0) {
    searchParams.set("tags", options.tags.join(","));
  }
  if (options.filters?.title) searchParams.set("title", options.filters.title);
  if (options.filters?.description)
    searchParams.set("description", options.filters.description);
  if (options.filters?.uploader)
    searchParams.set("uploader", options.filters.uploader);
  if (options.filters?.customTag)
    searchParams.set("customTag", options.filters.customTag);
  if (options.filters?.systemTag)
    searchParams.set("systemTag", options.filters.systemTag);
  if (options.filters?.from)
    searchParams.set("from", String(options.filters.from));
  if (options.filters?.to) searchParams.set("to", String(options.filters.to));

  return request<{ items: Video[]; pagination: Pagination }>(
    `/videos?${searchParams.toString()}`
  );
}

export async function searchVideos(options: {
  q: string;
  page?: number;
  pageSize?: number;
  folderId?: number;
  tags?: string[];
  filters?: VideoFilter;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("q", options.q);
  if (options.page) searchParams.set("page", String(options.page));
  if (options.pageSize) searchParams.set("pageSize", String(options.pageSize));
  if (options.folderId) searchParams.set("folderId", String(options.folderId));
  if (options.tags && options.tags.length > 0) {
    searchParams.set("tags", options.tags.join(","));
  }
  if (options.filters?.title) searchParams.set("title", options.filters.title);
  if (options.filters?.description)
    searchParams.set("description", options.filters.description);
  if (options.filters?.uploader)
    searchParams.set("uploader", options.filters.uploader);
  if (options.filters?.customTag)
    searchParams.set("customTag", options.filters.customTag);
  if (options.filters?.systemTag)
    searchParams.set("systemTag", options.filters.systemTag);
  if (options.filters?.from)
    searchParams.set("from", String(options.filters.from));
  if (options.filters?.to) searchParams.set("to", String(options.filters.to));

  return request<{ items: Video[]; pagination: Pagination }>(
    `/videos/search?${searchParams.toString()}`
  );
}

export async function fetchTags(options?: {
  search?: string;
  type?: "system" | "custom";
}) {
  const baseParams = new URLSearchParams();
  if (options?.search) baseParams.set("search", options.search);
  if (options?.type) baseParams.set("type", options.type);

  const pageSize = 100;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  const allTags: Tag[] = [];

  while (allTags.length < total) {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const data = await request<{ items: Tag[]; pagination?: Pagination }>(
      `/tags?${params.toString()}`
    );
    const items = data.items ?? [];
    allTags.push(...items);

    if (data.pagination?.total !== undefined) {
      total = data.pagination.total;
    } else {
      total = allTags.length;
    }

    if (items.length === 0) break;
    page += 1;
    if (page > 200) break;
  }

  return allTags;
}

export async function createTag(payload: {
  name: string;
  type?: "system" | "custom";
}) {
  return request<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTag(id: number, payload: { name: string }) {
  return request<Tag>(`/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTag(id: number) {
  return request<void>(`/tags/${id}`, {
    method: "DELETE",
  });
}

export async function batchMoveOrCopyVideos(payload: {
  videoIds: number[];
  folderId: number;
  sourceFolderId?: number;
  mode: "move" | "copy";
}) {
  const query = payload.sourceFolderId
    ? `?sourceFolderId=${payload.sourceFolderId}`
    : "";
  return request<{ ok: true; affected: number }>(
    `/videos/batch/folders${query}`,
    {
      method: "POST",
      body: JSON.stringify({
        videoIds: payload.videoIds,
        folderId: payload.folderId,
        mode: payload.mode,
      }),
    }
  );
}

export async function batchDeleteVideos(payload: {
  videoIds: number[];
  mode: "folderOnly" | "global";
  folderId?: number;
}) {
  return request<{ ok: true; affected: number }>("/videos/batch/delete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchTrashVideos(options?: {
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();
  if (options?.page) searchParams.set("page", String(options.page));
  if (options?.pageSize) searchParams.set("pageSize", String(options.pageSize));

  return request<{ items: Video[]; pagination: Pagination }>(
    `/trash/videos?${searchParams.toString()}`
  );
}

export async function restoreTrashVideo(id: number) {
  return request<{ ok: true }>(`/trash/videos/${id}/restore`, {
    method: "POST",
  });
}

export async function purgeTrashVideo(id: number) {
  return request<void>(`/trash/videos/${id}`, {
    method: "DELETE",
  });
}

export type SyncFromBilibiliPayload = {
  cookie?: string;
  selectedRemoteFolderIds?: number[];
  offset?: number;
  startPage?: number;
  includeTagEnrichment?: boolean;
  maxFolders?: number;
  maxPagesPerFolder?: number;
  maxVideosPerFolder?: number;
};

export type SyncFromBilibiliResult = {
  ok: boolean;
  summary: {
    foldersDetected: number;
    foldersSynced: number;
    videosProcessed: number;
    videosUpserted: number;
    skippedMissingBvid: number;
    unresolvedMissingBvid: number;
    incompleteFolders: number;
    folderLinksAdded: number;
    folderLinksRemoved: number;
    tagsBound: number;
    errorCount: number;
  };
  hasMore?: boolean;
  nextOffset?: number | null;
  hasMorePage?: boolean;
  nextPage?: number | null;
  riskBlocked?: boolean;
  invalidVideosDetected?: number;
  invalidVideoIds?: number[];
  unresolvedItems: Array<{
    remoteFolderId: number;
    folder: string;
    aid: number | null;
    title: string;
    reason: string;
  }>;
  incompleteFolders: Array<{
    remoteFolderId: number;
    folder: string;
    expected: number;
    observed: number;
    reason: string;
  }>;
  errors: Array<{ folder: string; message: string }>;
  errorsOmitted?: number;
  syncedAt: number;
};

export type InvalidVideoRecoveryStatus = {
  running: boolean;
  total: number;
  current: number;
  recovered: number;
  notFound: number;
  failed: number;
  lastError: string | null;
};

export async function startInvalidVideoRecovery(videoIds: number[]) {
  return request<{
    ok: true;
    started: boolean;
    status: InvalidVideoRecoveryStatus;
  }>("/sync/bilibili/invalid-video-recovery/start", {
    method: "POST",
    body: JSON.stringify({ videoIds }),
  });
}

export async function fetchInvalidVideoRecoveryStatus() {
  return request<InvalidVideoRecoveryStatus>(
    "/sync/bilibili/invalid-video-recovery/status"
  );
}

export type SyncRemoteFolder = {
  remoteId: number;
  title: string;
  mediaCount: number;
};

export type { HistoryModelSyncStatus } from "../types";

export type TagEnrichmentStatus = {
  phase: "idle" | "running" | "waiting" | "paused" | "completed" | "failed";
  paused: boolean;
  running: boolean;
  dismissedAt: number | null;
  selectedFolderIds: number[];
  scopeVideoCount: number;
  waitingForVideoSync: boolean;
  batchSize: number;
  intervalSeconds: number;
  batchSizeMin: number;
  batchSizeMax: number;
  intervalSecondsMin: number;
  intervalSecondsMax: number;
  cursorAfterVideoId: number;
  total: number;
  totalMissing: number;
  processed: number;
  succeeded: number;
  empty: number;
  failed: number;
  tagsBound: number;
  lastBatchProcessed: number;
  lastBatchSucceeded: number;
  lastBatchEmpty: number;
  lastBatchFailed: number;
  lastBatchBound: number;
  startedAt: number | null;
  finishedAt: number | null;
  nextRunAt: number | null;
  retryAttempt: number;
  riskCount: number;
  lastRunAt: number | null;
  updatedAt: number;
  lastError: string | null;
  errors: Array<{
    videoId: number;
    bvid: string;
    message: string;
    occurredAt: number;
  }>;
};

export type BidirectionalSyncSettings = {
  biliToLocalEnabled: boolean;
  localToBiliEnabled: boolean;
  updatedAt: number;
};

export type WebDavSettings = {
  enabled: boolean;
  baseUrl: string;
  username: string;
  passwordSet: boolean;
  remotePath: string;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  lastBackupAt: number | null;
  lastBackupFile: string | null;
  lastRestoreAt: number | null;
  updatedAt: number;
};

export type ExportLibraryResult = {
  format: "json" | "csv";
  filename: string;
  mimeType: string;
  content: string;
  summary: {
    folders: number;
    videos: number;
    tags: number;
    comments: number;
    articles: number;
    followedUps: number;
  };
};

export type ImportLibraryPayload = {
  format: "json" | "csv";
  content: string;
};

export type ImportLibraryResult = {
  ok: true;
  summary: {
    videosUpserted: number;
    folderLinksAdded: number;
    tagsBound: number;
    foldersCreated: number;
    tagsCreated: number;
    rowsSkipped: number;
    commentsUpserted: number;
    commentsSkipped: number;
    articlesUpserted: number;
    articlesSkipped: number;
    followedUpsUpserted: number;
  };
  importedAt: number;
};

export async function syncFromBilibili(payload: SyncFromBilibiliPayload = {}) {
  return request<SyncFromBilibiliResult>("/sync/bilibili", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchBilibiliSyncFolders(payload?: {
  cookie?: string;
  forceRefresh?: boolean;
}) {
  return request<{ ok: true; items: SyncRemoteFolder[]; total: number }>(
    "/sync/bilibili/folders",
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }
  );
}

export async function startHistoryModelSync(payload?: {
  selectedRemoteFolderIds?: number[];
  resumePageByFolder?: Record<string, number>;
  restart?: boolean;
}) {
  return request<{
    ok: true;
    started: boolean;
    status: HistoryModelSyncStatus;
  }>("/sync/bilibili/history-model/start", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchHistoryModelSyncStatus() {
  return request<HistoryModelSyncStatus>("/sync/bilibili/history-model/status");
}

export async function stopHistoryModelSync() {
  return request<{ ok: true; status: HistoryModelSyncStatus }>(
    "/sync/bilibili/history-model/stop",
    { method: "POST" },
  );
}

export async function fetchExtensionUpdateStatus() {
  return request<ExtensionUpdateStatus>("/app/update/status");
}

export async function checkExtensionUpdate() {
  return request<ExtensionUpdateStatus>("/app/update/check", {
    method: "POST",
  });
}

export async function acknowledgeExtensionUpdateNotice() {
  return request<ExtensionUpdateStatus>("/app/update/acknowledge", {
    method: "POST",
  });
}

export async function dismissHistoryModelSyncStatus() {
  return request<{ ok: true; status: HistoryModelSyncStatus }>(
    "/sync/bilibili/history-model/dismiss",
    { method: "POST" },
  );
}

export async function fetchTagEnrichmentStatus() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/status");
}

export type TagEnrichmentSettings = Pick<
  TagEnrichmentStatus,
  | "batchSize"
  | "intervalSeconds"
  | "batchSizeMin"
  | "batchSizeMax"
  | "intervalSecondsMin"
  | "intervalSecondsMax"
>;

export async function fetchTagEnrichmentSettings() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/settings");
}

export async function updateTagEnrichmentSettings(payload: {
  batchSize: number;
  intervalSeconds: number;
}) {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function pauseTagEnrichment() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/stop", {
    method: "POST",
  });
}

export async function dismissTagEnrichmentStatus() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/dismiss", {
    method: "POST",
  });
}

export async function resumeTagEnrichment(payload?: {
  selectedFolderIds?: number[];
}) {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/start", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function runTagEnrichmentNow() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/run", {
    method: "POST",
  });
}

export async function restartTagEnrichment(payload?: {
  selectedFolderIds?: number[];
}) {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/restart", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchBidirectionalSyncSettings() {
  return request<BidirectionalSyncSettings>(
    "/sync/bilibili/bidirectional/settings"
  );
}

export async function updateBidirectionalSyncSettings(payload: {
  biliToLocalEnabled?: boolean;
  localToBiliEnabled?: boolean;
}) {
  return request<BidirectionalSyncSettings>(
    "/sync/bilibili/bidirectional/settings",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchAiSettings() {
  return request<AiSettings>("/ai/settings");
}

export async function fetchAiOrganizerStatus() {
  return request<AiOrganizerStatus>("/ai/organizer/status");
}

export async function startAiOrganizer(
  payload: Partial<AiOrganizerConfig> & { replaceExisting?: boolean }
) {
  return request<AiOrganizerStatus>("/ai/organizer/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function pauseAiOrganizer() {
  return request<AiOrganizerStatus>("/ai/organizer/pause", { method: "POST" });
}

export async function resumeAiOrganizer() {
  return request<AiOrganizerStatus>("/ai/organizer/resume", { method: "POST" });
}

export async function cancelAiOrganizer() {
  return request<AiOrganizerStatus>("/ai/organizer/cancel", { method: "POST" });
}

export async function applyAiOrganizer() {
  return request<AiOrganizerStatus>("/ai/organizer/apply", { method: "POST" });
}

export async function undoAiOrganizer() {
  return request<AiOrganizerStatus>("/ai/organizer/undo", { method: "POST" });
}

export async function fetchAiOrganizerPreview(options?: {
  page?: number;
  pageSize?: number;
  lowConfidence?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("pageSize", String(options?.pageSize ?? 30));
  if (options?.lowConfidence) params.set("lowConfidence", "1");
  return request<{
    items: AiOrganizerPreviewItem[];
    pagination: Pagination;
  }>(`/ai/organizer/preview?${params.toString()}`);
}

export async function downloadAiOrganizerBackup() {
  return request<ExportLibraryResult>("/ai/organizer/backup");
}

export async function updateAiOrganizerAssignment(payload: {
  videoId: number;
  folderKey: string;
}) {
  return request<AiOrganizerStatus>("/ai/organizer/assignments", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateAiSettings(payload: {
  provider?: AiProvider;
  customProviderName?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}) {
  return request<AiSettings>("/ai/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function testAiSettings(payload?: {
  provider?: AiProvider;
  customProviderName?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}) {
  return request<AiSettings>("/ai/settings/test", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchFolderAiCategories(folderId: number) {
  return request<FolderAiCategories | null>(`/folders/${folderId}/ai-categories`);
}

export async function runFolderAiCategories(folderId: number) {
  return request<FolderAiCategories>(`/folders/${folderId}/ai-categories`, {
    method: "POST",
  });
}

export async function fetchAiSettingsModels(payload?: {
  provider?: AiProvider;
  customProviderName?: string;
  baseUrl?: string;
  apiKey?: string;
}) {
  return request<AiSettingsModelsResponse>("/ai/settings/models", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function clearFolderAiCategories(folderId: number) {
  return request<void>(`/folders/${folderId}/ai-categories`, {
    method: "DELETE",
  });
}

export async function fetchWebDavSettings() {
  return request<WebDavSettings>("/backup/webdav/settings");
}

export async function markBackupReminderBackupCompleted(
  timestamp = Date.now(),
  options?: { migration?: boolean }
) {
  return request<{ ok: true; lastBackupAt: number; lastReminderDay: string }>(
    "/backup/reminder/backup-completed",
    {
      method: "POST",
      body: JSON.stringify({ timestamp, migration: options?.migration === true }),
    }
  );
}

export async function markBackupReminderShown() {
  return request<{ ok: true; lastBackupAt: number; lastReminderDay: string }>(
    "/backup/reminder/shown",
    { method: "POST" }
  );
}

export async function updateWebDavSettings(payload: {
  enabled?: boolean;
  baseUrl?: string;
  username?: string;
  password?: string;
  remotePath?: string;
}) {
  return request<{ ok: true } & WebDavSettings>("/backup/webdav/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function testWebDavConnection() {
  return request<{ ok: true } & WebDavSettings>("/backup/webdav/test", {
    method: "POST",
  });
}

export async function uploadWebDavBackup() {
  return request<
    {
      ok: true;
      latestFileName: string;
      snapshotFileName: string;
      summary: {
        folders: number;
        videos: number;
        tags: number;
        comments: number;
        articles: number;
        followedUps: number;
      };
    } & WebDavSettings
  >("/backup/webdav/upload", {
    method: "POST",
  });
}

export async function downloadWebDavBackup(payload?: { fileName?: string }) {
  return request<{
    ok: true;
    fileName: string;
    mimeType: string;
    content: string;
  }>("/backup/webdav/download", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function restoreWebDavBackup(payload?: { fileName?: string }) {
  return request<{
    ok: true;
    fileName: string;
    summary: {
      videosUpserted: number;
      folderLinksAdded: number;
      tagsBound: number;
      foldersCreated: number;
      tagsCreated: number;
      rowsSkipped: number;
      commentsUpserted: number;
      commentsSkipped: number;
      articlesUpserted: number;
      articlesSkipped: number;
      followedUpsUpserted: number;
    };
    restoredAt: number;
    webdav: WebDavSettings;
  }>("/backup/webdav/restore", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function exportLibrary(format: "json" | "csv") {
  const params = new URLSearchParams();
  params.set("format", format);
  return request<ExportLibraryResult>(`/export?${params.toString()}`);
}

export async function importLibrary(payload: ImportLibraryPayload) {
  return request<ImportLibraryResult>("/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
