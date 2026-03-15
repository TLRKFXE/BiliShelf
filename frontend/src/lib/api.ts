import type {
  CreateVideoPayload,
  Folder,
  Pagination,
  Tag,
  Video,
  VideoFilter,
} from "../types";

const API_BASE = "/api";
const LOCAL_API_MESSAGE = "BILISHELF_LOCAL_API";
const EXTENSION_REQUEST_TIMEOUT_DEFAULT_MS = 30_000;
const EXTENSION_REQUEST_TIMEOUT_SYNC_MS = 900_000;
const EXTENSION_REQUEST_TIMEOUT_SYNC_FOLDERS_MS = 90_000;
const EXTENSION_REQUEST_TIMEOUT_TAG_ENRICH_MS = 60_000;
const EXTENSION_REQUEST_TIMEOUT_WEBDAV_MS = 180_000;

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

type ChromeLikeRuntime = {
  id?: string;
  sendMessage: (
    message: unknown,
    callback?: (response?: unknown) => void
  ) => Promise<unknown> | void;
};

function getRuntime(): ChromeLikeRuntime | null {
  const chromeRuntime = (
    globalThis as { chrome?: { runtime?: ChromeLikeRuntime } }
  ).chrome?.runtime;
  if (chromeRuntime?.id && typeof chromeRuntime.sendMessage === "function") {
    return chromeRuntime;
  }

  const browserRuntime = (
    globalThis as { browser?: { runtime?: ChromeLikeRuntime } }
  ).browser?.runtime;
  if (browserRuntime?.id && typeof browserRuntime.sendMessage === "function") {
    return browserRuntime;
  }

  return null;
}

function shouldUseLocalExtensionApi() {
  if (import.meta.env.VITE_RUNTIME_TARGET === "extension") return true;
  const runtime = getRuntime();
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
  const runtime = getRuntime();
  if (!runtime) {
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

    const callback = (response?: unknown) => {
      const runtimeLastError = (
        globalThis as {
          chrome?: { runtime?: { lastError?: { message?: string } } };
        }
      ).chrome?.runtime?.lastError?.message;
      if (runtimeLastError) {
        finish(() => reject(new Error(runtimeLastError)));
        return;
      }

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

    try {
      const maybePromise = runtime.sendMessage(message, callback);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<unknown>).then === "function"
      ) {
        (maybePromise as Promise<unknown>)
          .then((response) => callback(response))
          .catch((error) => finish(() => reject(error)));
      }
    } catch (error) {
      finish(() => reject(error));
    }
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

export async function createFolder(payload: {
  name: string;
  description?: string;
}) {
  return request<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFolder(
  id: number,
  payload: { name?: string; description?: string | null }
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
    folderLinksAdded: number;
    tagsBound: number;
    errorCount: number;
  };
  hasMore?: boolean;
  nextOffset?: number | null;
  hasMorePage?: boolean;
  nextPage?: number | null;
  riskBlocked?: boolean;
  errors: Array<{ folder: string; message: string }>;
  errorsOmitted?: number;
  syncedAt: number;
};

export type SyncRemoteFolder = {
  remoteId: number;
  title: string;
  mediaCount: number;
};

export type HistoryModelSyncStatus = {
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
  resumePageByFolder?: Record<string, number>;
  summary: {
    foldersDetected: number;
    foldersSynced: number;
    videosProcessed: number;
    videosUpserted: number;
    folderLinksAdded: number;
    tagsBound: number;
    errorCount: number;
  };
  errors: Array<{ folder: string; message: string }>;
};

export type TagEnrichmentStatus = {
  paused: boolean;
  running: boolean;
  cursorAfterVideoId: number;
  totalMissing: number;
  lastBatchProcessed: number;
  lastBatchBound: number;
  lastRunAt: number | null;
  lastError: string | null;
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

export async function fetchTagEnrichmentStatus() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/status");
}

export async function pauseTagEnrichment() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/pause", {
    method: "POST",
  });
}

export async function resumeTagEnrichment() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/resume", {
    method: "POST",
  });
}

export async function runTagEnrichmentNow() {
  return request<TagEnrichmentStatus>("/sync/bilibili/tag-enrichment/run", {
    method: "POST",
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

export async function fetchWebDavSettings() {
  return request<WebDavSettings>("/backup/webdav/settings");
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
      summary: { folders: number; videos: number; tags: number };
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
