import {
  createDefaultAiState,
  normalizeAiProvider,
  normalizeAiState,
} from "../shared/ai-state.js";
import { maskApiKeyStateForResponse } from "../shared/ai-provider.js";
import {
  applyFolderCategoryAttempt,
  buildFolderCategorizationInput,
  matchFolderAiCategoriesPath,
  normalizeFolderAiCategoriesResponse,
  runFolderAiCategories,
} from "../shared/ai-analysis.js";
import {
  listAiProviderModels,
  normalizeAiProviderBaseUrl,
} from "../shared/ai-provider-settings.js";
import {
  createFavoritesSyncThrottleState,
  resolveFavoritesFailurePolicy,
  resolveFavoritesCooldownPolicy,
  resolveFavoritesFolderGapMs,
  resolveFavoritesPageGapMs,
  resolveSuccessfulRetryAttempt,
  updateFavoritesSyncThrottleState,
} from "../shared/favorites-sync-throttle.js";
import {
  isFavoriteMediaInvalid,
  normalizeBiliSpaceUrl,
} from "../shared/library-export.js";
import {
  buildExportVideoMetadata,
  buildVideoExportMaps,
  LIBRARY_EXPORT_VIDEO_CSV_HEADER,
  normalizeVideoPartition,
} from "../shared/export-video-metadata.js";
import {
  mergeRecoveredInvalidVideoFields,
  normalizeRecoveredInvalidVideoMetadata,
} from "../shared/invalid-video-recovery.js";
import {
  mergeFollowedUpRecords,
  normalizeFollowedUpRecord,
} from "../shared/following-up.js";
import type {
  NormalizedFollowedUpRecord,
  StoredFollowedUpRecord,
} from "../shared/following-up.js";
import { reconcileRemoteFolderSortOrder } from "../shared/remote-folder-order.js";
import {
  FOLDER_PLAYBACK_STORAGE_KEY,
  buildFolderPlaybackSession,
  findPlaybackQueueIndex,
  markFolderPlaybackUrl,
  normalizePlaybackSession,
} from "../shared/folder-playback-session.js";
import {
  categorizeFolderVideo,
  requestAiJson,
} from "../shared/ai-category-runtime.js";
import { normalizeFavoriteComment } from "../shared/comment-favorite.js";
import type { NormalizedFavoriteComment } from "../shared/comment-favorite.js";
import {
  normalizeFavoriteArticle,
  normalizeStoredFavoriteArticle,
} from "../shared/article-favorite.js";
import type { FavoriteArticleRecord as SharedFavoriteArticleRecord } from "../shared/article-favorite.js";
import {
  REVIEW_FOLDER_KEY,
  applyAiOrganizerPlan,
  buildAiOrganizerClassificationPrompt,
  buildAiOrganizerTaxonomyPrompt,
  normalizeAiOrganizerAssignments,
  normalizeAiOrganizerConfig,
  normalizeAiOrganizerTaxonomy,
  resolveAiOrganizerFolderNames,
  undoAiOrganizerPlan,
} from "../shared/ai-organizer.js";
import type {
  AiOrganizerAssignment,
  AiOrganizerConfig,
  AiOrganizerTaxonomyItem,
} from "../shared/ai-organizer.js";
import type { FavoritesSyncThrottleState } from "../shared/favorites-sync-throttle.js";
import type {
  AiMeta as SharedAiMeta,
  AiProvider as SharedAiProvider,
  AiState,
  FolderAiAnalysisRecord as SharedFolderAiAnalysisRecord,
  VideoAiAnalysisRecord as SharedVideoAiAnalysisRecord,
} from "../shared/ai-state.js";
import {
  normalizeExtensionVersion,
  resolveExtensionReleaseChannel,
  resolveExtensionUpdateAvailability,
} from "../shared/extension-update.js";

type FolderRecord = {
  id: number;
  name: string;
  description: string | null;
  groupName?: string | null;
  remoteMediaId: number | null;
  sortOrder: number;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
  origin?: "ai";
  organizerId?: string;
  taxonomyKey?: string;
};

type VideoRecord = {
  id: number;
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  uploaderSpaceUrl: string | null;
  description: string;
  partition: string;
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
  origin?: "ai";
  organizerId?: string;
};

type ArticleFolderRecord = {
  id: number;
  name: string;
  description: string | null;
  groupName?: string | null;
  sortOrder: number;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
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

type FollowedUpRecord = StoredFollowedUpRecord;

type FavoriteCommentRecord = NormalizedFavoriteComment & {
  id: number;
  savedAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type FavoriteArticleRecord = SharedFavoriteArticleRecord & {
  id: number;
  deletedAt: number | null;
};

type TagEnrichmentPhase =
  | "idle"
  | "running"
  | "waiting"
  | "paused"
  | "completed"
  | "failed";

type TagEnrichmentErrorItem = {
  videoId: number;
  bvid: string;
  message: string;
  occurredAt: number;
};

type TagEnrichmentMeta = {
  phase: TagEnrichmentPhase;
  paused: boolean;
  dismissedAt: number | null;
  selectedFolderIds: number[];
  waitingForVideoSync: boolean;
  batchSize: number;
  intervalSeconds: number;
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
  checkedEmptyVideoIds: number[];
  skippedVideoIds: number[];
  errors: TagEnrichmentErrorItem[];
};

type BidirectionalSyncMeta = {
  biliToLocalEnabled: boolean;
  localToBiliEnabled: boolean;
  updatedAt: number;
};

type WebDavMeta = {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  remotePath: string;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  lastBackupAt: number | null;
  lastBackupFile: string | null;
  lastRestoreAt: number | null;
  updatedAt: number;
};

type Stage3ReconcileMeta = {
  enabled: boolean;
  intervalMinutes: number;
  cursorAfterRemoteMediaId: number;
  nextRunAt: number | null;
  running: boolean;
  lastRunAt: number | null;
  lastError: string | null;
  lastRemoteMediaId: number | null;
  lastSummary: FavoritesSyncSummaryStatus;
};

type SyncMeta = {
  tagEnrichment: TagEnrichmentMeta;
  bidirectionalSync: BidirectionalSyncMeta;
  webdav: WebDavMeta;
  stage3Reconcile: Stage3ReconcileMeta;
  favoritesJob: FavoritesSyncJobMeta;
};

type AiProvider = SharedAiProvider;
type AiMeta = SharedAiMeta;
type FolderAiAnalysisRecord = SharedFolderAiAnalysisRecord;
type VideoAiAnalysisRecord = SharedVideoAiAnalysisRecord;
type AiSettingsResponse = ReturnType<typeof maskApiKeyStateForResponse>;

type AiOrganizerStage =
  | "planning"
  | "classifying"
  | "ready"
  | "failed"
  | "cancelled"
  | "completed"
  | "undone";

type AiOrganizerApplySummary = {
  foldersCreated: number;
  folderLinksAdded: number;
  folderLinksRemoved: number;
  lowConfidence: number;
};

type AiOrganizerUndoRecord = {
  runId: string;
  previousFolders: FolderRecord[];
  previousItems: FolderItemRecord[];
  createdFolders: FolderRecord[];
  createdFolderIds: number[];
  createdItemIds: number[];
  appliedAt: number;
};

type AiOrganizerTaskRecord = {
  version: 1;
  id: string;
  stage: AiOrganizerStage;
  paused: boolean;
  config: AiOrganizerConfig;
  sourceHash: string;
  sourceVideoIds: number[];
  sourceFolderName: string | null;
  total: number;
  skippedInvalid: number;
  previousAiRelationCount: number;
  cursor: number;
  taxonomy: AiOrganizerTaxonomyItem[];
  reviewFolderName: string;
  assignments: AiOrganizerAssignment[];
  invalidResults: number;
  provider: string;
  model: string;
  baseUrl: string;
  retryAttempt: number;
  nextRunAt: number | null;
  startedAt: number;
  updatedAt: number;
  finishedAt: number | null;
  appliedAt: number | null;
  undoneAt: number | null;
  lastError: string | null;
  snapshotKey: string;
  applySummary: AiOrganizerApplySummary | null;
  undo: AiOrganizerUndoRecord | null;
};

type AiOrganizerSnapshotRecord = {
  version: 1;
  runId: string;
  createdAt: number;
  state: LocalState;
};

type LocalState = {
  counters: {
    folder: number;
    articleFolder: number;
    video: number;
    folderItem: number;
    tag: number;
    videoTag: number;
    comment: number;
    article: number;
  };
  folders: FolderRecord[];
  articleFolders: ArticleFolderRecord[];
  videos: VideoRecord[];
  folderItems: FolderItemRecord[];
  tags: TagRecord[];
  videoTags: VideoTagRecord[];
  followedUps: FollowedUpRecord[];
  comments: FavoriteCommentRecord[];
  articles: FavoriteArticleRecord[];
  syncMeta: SyncMeta;
  ai: AiState;
};

type VideoTagSummary = {
  tags: string[];
  systemTags: string[];
  customTags: string[];
};

type LocalStateIndexes = {
  activeFoldersById: Map<number, FolderRecord>;
  activeVideoIds: Set<number>;
  videosById: Map<number, VideoRecord>;
  folderItemsByVideoId: Map<number, FolderItemRecord[]>;
  activeFolderIdsByVideoId: Map<number, Set<number>>;
  activeFolderItemCountByFolderId: Map<number, number>;
  tagSummaryByVideoId: Map<number, VideoTagSummary>;
  sortedActiveVideoIds: number[];
  sortedDeletedVideoIds: number[];
  sortedActiveVideoIdsByFolderId: Map<number, number[]>;
};

type VideoListArgs = {
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

type ExtensionReleaseChannel = "chrome" | "edge" | "firefox";

type ExtensionReleaseEntry = {
  version: string | null;
  label: string | null;
  url: string | null;
};

type ExtensionReleaseDocument = {
  schemaVersion: number;
  github: ExtensionReleaseEntry;
  channels: Record<ExtensionReleaseChannel, ExtensionReleaseEntry>;
};

type ExtensionUpdateNotice = {
  previousVersion: string;
  currentVersion: string;
  installedAt: number;
};

type ExtensionUpdateState = {
  lastCheckedAt: number;
  lastError: string | null;
  release: ExtensionReleaseDocument | null;
  notice: ExtensionUpdateNotice | null;
};

type ExtensionUpdateStatus = {
  currentVersion: string;
  channel: ExtensionReleaseChannel;
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
  notice: ExtensionUpdateNotice | null;
};

type FolderPlaybackQueueItem = {
  id: number | null;
  videoId: number | null;
  bvid: string | null;
  title: string | null;
  url: string | null;
  coverUrl: string | null;
  isInvalid: boolean;
};

type FolderPlaybackSessionRecord = {
  folderId: number;
  queue: FolderPlaybackQueueItem[];
  currentIndex: number;
  createdAt: number;
  updatedAt: number;
};

type FolderPlaybackRequest = {
  folderId?: unknown;
  q?: unknown;
  tags?: unknown;
  filters?: unknown;
  openTab?: unknown;
};

type FolderPlaybackCursor = {
  videoId?: unknown;
  bvid?: unknown;
};

type StorageAreaLike = {
  get: (keys: string[] | string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[] | string) => Promise<void>;
};

const DB_NAME = "bilishelf-local-db";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const STATE_KEY = "state";
const MESSAGE_TYPE = "BILISHELF_LOCAL_API";
const BILI_NAV_API = "https://api.bilibili.com/x/web-interface/nav";
const BILI_FOLDERS_API =
  "https://api.bilibili.com/x/v3/fav/folder/created/list-all";
const BILI_FOLDER_VIDEOS_API =
  "https://api.bilibili.com/x/v3/fav/resource/list";
const BILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view";
const BILI_ARCHIVE_TAGS_API = "https://api.bilibili.com/x/tag/archive/tags";
const BILI_FOLLOWING_UPS_API = "https://api.bilibili.com/x/relation/followings";
const BILI_ORIGIN = "https://www.bilibili.com";
const BLOCKED_SYSTEM_TAGS = new Set(["uncategorized", "未分类"]);
const DEFAULT_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";
const PAGE_FETCH_MESSAGE_TYPE = "BILISHELF_PAGE_FETCH_JSON";
const TAG_ENRICH_ALARM = "bilishelf-tag-enrich";
const AI_ORGANIZER_ALARM = "bilishelf-ai-organizer";
const STAGE3_RECONCILE_ALARM = "bilishelf-stage3-reconcile";
const FAVORITES_SYNC_RETRY_ALARM = "bilishelf-favorites-sync-retry";
const BACKUP_REMINDER_ALARM = "bilishelf-backup-reminder";
const BACKUP_REMINDER_NOTIFICATION_ID = "bilishelf-backup-reminder";
const BACKUP_REMINDER_STORAGE_KEY = "bilishelf-backup-reminder-v1";
const BACKUP_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_CHECK_INTERVAL_MINUTES = 60;
const EXTENSION_UPDATE_ALARM = "bilishelf-extension-update-check";
// v3 drops cached metadata produced by the old release-channels source.
const EXTENSION_UPDATE_STATE_KEY = "extension-update-state-v3";
const EXTENSION_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const EXTENSION_UPDATE_CHECK_INTERVAL_MINUTES = 24 * 60;
const EXTENSION_UPDATE_README_URL =
  "https://raw.githubusercontent.com/TLRKFXE/BiliShelf/main/README.md";
const EXTENSION_UPDATE_README_MIRROR_URLS = [
  "https://cdn.jsdelivr.net/gh/TLRKFXE/BiliShelf@main/README.md",
  "https://fastly.jsdelivr.net/gh/TLRKFXE/BiliShelf@main/README.md",
  "https://gh-proxy.com/https://raw.githubusercontent.com/TLRKFXE/BiliShelf/main/README.md",
  EXTENSION_UPDATE_README_URL,
];
const EXTENSION_UPDATE_GITHUB_API_URL =
  "https://api.github.com/repos/TLRKFXE/BiliShelf/releases/latest";
const EXTENSION_UPDATE_GITHUB_PROXY_API_URL =
  "https://gh-proxy.com/https://api.github.com/repos/TLRKFXE/BiliShelf/releases/latest";
const EXTENSION_UPDATE_GITHUB_ATOM_URL =
  "https://github.com/TLRKFXE/BiliShelf/releases.atom";
const EXTENSION_UPDATE_GITHUB_PROXY_ATOM_URL =
  "https://gh-proxy.com/https://github.com/TLRKFXE/BiliShelf/releases.atom";
const EXTENSION_UPDATE_GITHUB_CDN_PACKAGE_URL =
  "https://cdn.jsdelivr.net/gh/TLRKFXE/BiliShelf@latest/extension/package.json";
const EXTENSION_UPDATE_REQUEST_TIMEOUT_MS = 12_000;
const GITHUB_REPOSITORY_URL = "https://github.com/TLRKFXE/BiliShelf";
const GITHUB_RELEASES_URL = `${GITHUB_REPOSITORY_URL}/releases`;
const TAG_ENRICH_BATCH_SIZE_MIN = 1;
const TAG_ENRICH_BATCH_SIZE_DEFAULT = 5;
const TAG_ENRICH_BATCH_SIZE_MAX = 10;
const TAG_ENRICH_INTERVAL_SECONDS_MIN = 20;
const TAG_ENRICH_INTERVAL_SECONDS_DEFAULT = 20;
const TAG_ENRICH_INTERVAL_SECONDS_MAX = 300;
// Kept as named defaults for compatibility with existing task diagnostics/tests.
const TAG_ENRICH_BATCH_SIZE = TAG_ENRICH_BATCH_SIZE_DEFAULT;
const TAG_ENRICH_BATCH_DELAY_MIN_MS =
  TAG_ENRICH_INTERVAL_SECONDS_DEFAULT * 1000;
const TAG_ENRICH_BATCH_DELAY_JITTER_MS = 10_000;
const TAG_ENRICH_RESTORE_DELAY_MS = 5_000;
const AI_ORGANIZER_TASK_KEY = "ai-organizer-task-v1";
const AI_ORGANIZER_SNAPSHOT_PREFIX = "ai-organizer-snapshot-v1:";
const AI_ORGANIZER_BATCH_DELAY_MS = 1_500;
const AI_ORGANIZER_MAX_RETRY_ATTEMPTS = 3;
const AI_ORGANIZER_REQUEST_TIMEOUT_MS = 90_000;
const AI_ORGANIZER_WATCHDOG_GRACE_MS = 2_000;
const STAGE3_RECONCILE_DEFAULT_INTERVAL_MINUTES = 30;
const STAGE3_RECONCILE_RETRY_DELAY_MINUTES = 5;
const STAGE3_RECONCILE_RISK_DELAY_MINUTES = 20;
const TAG_SYNC_ENABLED = true;
const AI_CATEGORIES_ENABLED = false;
const BILI_FETCH_TIMEOUT_MS = 18_000;
const BILI_META_API_GAP_MS = 280;
const BILI_META_API_GAP_JITTER_MS = 100;
const REMOTE_FOLDERS_CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOW_PAGE_CONTEXT_FALLBACK = false;
const WEBDAV_REQUEST_TIMEOUT_MS = 45_000;
const WEBDAV_LATEST_FILE_NAME = "bilishelf-latest.json";
const WEBDAV_MAX_DOWNLOAD_SIZE = 30 * 1024 * 1024;
const SLOW_API_THRESHOLD_MS = 400;
const INVALID_VIDEO_RECOVERY_API = "https://www.biliplus.com/api/view";
const INVALID_VIDEO_RECOVERY_TIMEOUT_MS = 15_000;
const INVALID_VIDEO_RECOVERY_GAP_MS = 1_200;
const BILI_FOLLOWING_UPS_PAGE_SIZE = 50;
const BILI_FOLLOWING_UPS_PAGE_GAP_MS = 900;
const REMOTE_FAVORITE_ORDER_FALLBACK_BASE_MS = 1_000_000_000_000;

type SyncFetchStage = "nav" | "folders" | "folderVideos" | "followings";
type FetchSource = "extension" | "page";

type TabBridgePayload = {
  ok: boolean;
  status: number;
  payload?: unknown;
  error?: string;
};

type BiliExtensionRequestOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

type FavoritesSyncSummaryStatus = {
  foldersDetected: number;
  foldersSynced: number;
  videosProcessed: number;
  videosUpserted: number;
  skippedMissingBvid: number;
  unresolvedMissingBvid: number;
  unavailableRemoteVideos: number;
  incompleteFolders: number;
  folderLinksAdded: number;
  folderLinksRemoved: number;
  tagsBound: number;
  errorCount: number;
};

type FavoritesSyncUnresolvedItem = {
  remoteFolderId: number;
  folder: string;
  aid: number | null;
  title: string;
  reason: string;
};

type FavoritesSyncIncompleteFolder = {
  remoteFolderId: number;
  folder: string;
  expected: number;
  observed: number;
  reason: string;
};

type FavoritesSyncUnavailableFolder = {
  remoteFolderId: number;
  folder: string;
  expected: number;
  observed: number;
  unavailable: number;
  reason: string;
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
  phase: "idle" | "running" | "paused" | "waiting" | "failed" | "completed";
  nextRetryAt: number | null;
  retryAutomatic: boolean;
  retryReason: string | null;
  retryAttempt: number;
  riskCount: number;
  selectedRemoteFolderIds: number[];
  completedRemoteFolderIds: number[];
  currentFolderRemoteId: number | null;
  currentPage: number;
  resumePageByFolder: Record<string, number>;
  invalidVideosDetected: number;
  invalidVideoIds: number[];
  summary: FavoritesSyncSummaryStatus;
  errors: Array<{ folder: string; message: string }>;
  unresolvedItems: FavoritesSyncUnresolvedItem[];
  incompleteFolders: FavoritesSyncIncompleteFolder[];
  unavailableFolders: FavoritesSyncUnavailableFolder[];
};

type FavoritesSyncJobPhase = "running" | "paused" | "waiting" | "failed";

type FavoritesSyncRetryState = {
  attempt: number;
  nextRetryAt: number | null;
  automatic: boolean;
  reason: string | null;
  riskCount: number;
};

type FavoritesSyncJob = {
  id: string;
  phase: FavoritesSyncJobPhase;
  selectedRemoteFolderIds: number[];
  currentFolderRemoteId: number | null;
  currentFolderTitle: string;
  currentFolderIndex: number;
  folderTotal: number;
  nextPage: number;
  seenBvidKeysByFolder: Record<string, string[]>;
  observedRowCountByFolder: Record<string, number>;
  deletionCandidatesByFolder: Record<string, string[]>;
  completedRemoteFolderIds: number[];
  startedAt: number;
  updatedAt: number;
  total: number;
  current: number;
  summary: FavoritesSyncSummaryStatus;
  invalidVideoIds: number[];
  errors: Array<{ folder: string; message: string }>;
  unresolvedItems: FavoritesSyncUnresolvedItem[];
  incompleteFolders: FavoritesSyncIncompleteFolder[];
  unavailableFolders: FavoritesSyncUnavailableFolder[];
  riskBlocked: boolean;
  lastError: string | null;
  retry: FavoritesSyncRetryState;
};

type FavoritesSyncJobMeta = {
  active: FavoritesSyncJob | null;
  lastStatus: FavoritesSyncStatus;
  deletionCandidatesByFolder: Record<string, string[]>;
};

type FavoritesSyncProgress = {
  total: number;
  current: number;
  folderTitle: string;
  folderIndex: number;
  folderTotal: number;
  message: string;
};

type InvalidVideoRecoveryStatus = {
  running: boolean;
  total: number;
  current: number;
  recovered: number;
  notFound: number;
  failed: number;
  lastError: string | null;
};

type FollowingUpImportStatus = {
  running: boolean;
  total: number;
  current: number;
  created: number;
  updated: number;
  failed: number;
  lastError: string | null;
};

type CookieLike = { name?: unknown; value?: unknown };
type CookiesGetAll = (
  details: { domain?: string; storeId?: string },
  callback?: (cookies: CookieLike[]) => void,
) => Promise<CookieLike[]> | void;
type CookiesApi = {
  getAll?: CookiesGetAll;
};

const defaultTagEnrichmentMeta = (): TagEnrichmentMeta => ({
  phase: "idle",
  paused: false,
  dismissedAt: null,
  selectedFolderIds: [],
  waitingForVideoSync: false,
  batchSize: TAG_ENRICH_BATCH_SIZE_DEFAULT,
  intervalSeconds: TAG_ENRICH_INTERVAL_SECONDS_DEFAULT,
  cursorAfterVideoId: 0,
  total: 0,
  totalMissing: 0,
  processed: 0,
  succeeded: 0,
  empty: 0,
  failed: 0,
  tagsBound: 0,
  lastBatchProcessed: 0,
  lastBatchSucceeded: 0,
  lastBatchEmpty: 0,
  lastBatchFailed: 0,
  lastBatchBound: 0,
  startedAt: null,
  finishedAt: null,
  nextRunAt: null,
  retryAttempt: 0,
  riskCount: 0,
  lastRunAt: null,
  updatedAt: now(),
  lastError: null,
  checkedEmptyVideoIds: [],
  skippedVideoIds: [],
  errors: [],
});

function normalizeTagEnrichmentPhase(
  value: unknown,
  paused: boolean,
): TagEnrichmentPhase {
  const phase = normalizeText(value) as TagEnrichmentPhase;
  if (
    phase === "idle" ||
    phase === "running" ||
    phase === "waiting" ||
    phase === "paused" ||
    phase === "completed" ||
    phase === "failed"
  ) {
    return paused ? "paused" : phase;
  }
  return paused ? "paused" : "idle";
}

function normalizePositiveIntList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => toInt(item)).filter((item) => item > 0)),
  ).sort((left, right) => left - right);
}

function normalizeTagEnrichmentMeta(raw: unknown): TagEnrichmentMeta {
  const source =
    raw && typeof raw === "object" ? (raw as Partial<TagEnrichmentMeta>) : {};
  const paused = Boolean(source.paused) || source.phase === "paused";
  const processed = Math.max(0, toInt(source.processed));
  const totalMissing = Math.max(0, toInt(source.totalMissing));
  const errors = Array.isArray(source.errors)
    ? source.errors
        .map((item) => {
          const candidate =
            item && typeof item === "object"
              ? (item as Partial<TagEnrichmentErrorItem>)
              : {};
          const videoId = Math.max(0, toInt(candidate.videoId));
          const message = normalizeText(candidate.message);
          if (!videoId || !message) return null;
          return {
            videoId,
            bvid: normalizeText(candidate.bvid),
            message,
            occurredAt: Math.max(0, toInt(candidate.occurredAt)),
          };
        })
        .filter((item): item is TagEnrichmentErrorItem => Boolean(item))
        .slice(-100)
    : [];

  return {
    phase: normalizeTagEnrichmentPhase(source.phase, paused),
    paused,
    dismissedAt: toIntOrNull(source.dismissedAt),
    selectedFolderIds: normalizePositiveIntList(source.selectedFolderIds),
    waitingForVideoSync: Boolean(source.waitingForVideoSync),
    batchSize: Math.min(
      TAG_ENRICH_BATCH_SIZE_MAX,
      Math.max(
        TAG_ENRICH_BATCH_SIZE_MIN,
        toInt(source.batchSize, TAG_ENRICH_BATCH_SIZE_DEFAULT),
      ),
    ),
    intervalSeconds: Math.min(
      TAG_ENRICH_INTERVAL_SECONDS_MAX,
      Math.max(
        TAG_ENRICH_INTERVAL_SECONDS_MIN,
        toInt(source.intervalSeconds, TAG_ENRICH_INTERVAL_SECONDS_DEFAULT),
      ),
    ),
    cursorAfterVideoId: Math.max(0, toInt(source.cursorAfterVideoId)),
    total: Math.max(processed + totalMissing, Math.max(0, toInt(source.total))),
    totalMissing,
    processed,
    succeeded: Math.max(0, toInt(source.succeeded)),
    empty: Math.max(0, toInt(source.empty)),
    failed: Math.max(0, toInt(source.failed)),
    tagsBound: Math.max(0, toInt(source.tagsBound)),
    lastBatchProcessed: Math.max(0, toInt(source.lastBatchProcessed)),
    lastBatchSucceeded: Math.max(0, toInt(source.lastBatchSucceeded)),
    lastBatchEmpty: Math.max(0, toInt(source.lastBatchEmpty)),
    lastBatchFailed: Math.max(0, toInt(source.lastBatchFailed)),
    lastBatchBound: Math.max(0, toInt(source.lastBatchBound)),
    startedAt: toIntOrNull(source.startedAt),
    finishedAt: toIntOrNull(source.finishedAt),
    nextRunAt: toIntOrNull(source.nextRunAt),
    retryAttempt: Math.max(0, toInt(source.retryAttempt)),
    riskCount: Math.max(0, toInt(source.riskCount)),
    lastRunAt: toIntOrNull(source.lastRunAt),
    updatedAt: Math.max(0, toInt(source.updatedAt, now())),
    lastError: normalizeText(source.lastError) || null,
    checkedEmptyVideoIds: normalizePositiveIntList(source.checkedEmptyVideoIds),
    skippedVideoIds: normalizePositiveIntList(source.skippedVideoIds),
    errors,
  };
}

function normalizeBiliToLocalEnabled(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function defaultBidirectionalSyncMeta(): BidirectionalSyncMeta {
  return {
    biliToLocalEnabled: true,
    localToBiliEnabled: false,
    updatedAt: now(),
  };
}

const defaultWebDavMeta = (): WebDavMeta => ({
  enabled: false,
  baseUrl: "",
  username: "",
  password: "",
  remotePath: "bilishelf",
  lastTestAt: null,
  lastTestOk: false,
  lastError: null,
  lastBackupAt: null,
  lastBackupFile: null,
  lastRestoreAt: null,
  updatedAt: now(),
});

const defaultStage3ReconcileMeta = (): Stage3ReconcileMeta => ({
  enabled: true,
  intervalMinutes: STAGE3_RECONCILE_DEFAULT_INTERVAL_MINUTES,
  cursorAfterRemoteMediaId: 0,
  nextRunAt: null,
  running: false,
  lastRunAt: null,
  lastError: null,
  lastRemoteMediaId: null,
  lastSummary: {
    foldersDetected: 0,
    foldersSynced: 0,
    videosProcessed: 0,
    videosUpserted: 0,
    skippedMissingBvid: 0,
    unresolvedMissingBvid: 0,
    unavailableRemoteVideos: 0,
    incompleteFolders: 0,
    folderLinksAdded: 0,
    folderLinksRemoved: 0,
    tagsBound: 0,
    errorCount: 0,
  },
});

const defaultState = (): LocalState => ({
  counters: {
    folder: 1,
    articleFolder: 1,
    video: 1,
    folderItem: 1,
    tag: 1,
    videoTag: 1,
    comment: 1,
    article: 1,
  },
  folders: [],
  articleFolders: [],
  videos: [],
  folderItems: [],
  tags: [],
  videoTags: [],
  followedUps: [],
  comments: [],
  articles: [],
  syncMeta: {
    tagEnrichment: defaultTagEnrichmentMeta(),
    bidirectionalSync: defaultBidirectionalSyncMeta(),
    webdav: defaultWebDavMeta(),
    stage3Reconcile: defaultStage3ReconcileMeta(),
    favoritesJob: defaultFavoritesSyncJobMeta(),
  },
  ai: createDefaultAiState(now()),
});

const emptyFavoritesSyncSummary = (): FavoritesSyncSummaryStatus => ({
  foldersDetected: 0,
  foldersSynced: 0,
  videosProcessed: 0,
  videosUpserted: 0,
  skippedMissingBvid: 0,
  unresolvedMissingBvid: 0,
  unavailableRemoteVideos: 0,
  incompleteFolders: 0,
  folderLinksAdded: 0,
  folderLinksRemoved: 0,
  tagsBound: 0,
  errorCount: 0,
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
  phase: "idle",
  nextRetryAt: null,
  retryAutomatic: false,
  retryReason: null,
  retryAttempt: 0,
  riskCount: 0,
  selectedRemoteFolderIds: [],
  completedRemoteFolderIds: [],
  currentFolderRemoteId: null,
  currentPage: 1,
  resumePageByFolder: {},
  invalidVideosDetected: 0,
  invalidVideoIds: [],
  summary: emptyFavoritesSyncSummary(),
  errors: [],
  unresolvedItems: [],
  incompleteFolders: [],
  unavailableFolders: [],
});

function normalizeFavoritesSyncSummary(
  value: unknown,
): FavoritesSyncSummaryStatus {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<FavoritesSyncSummaryStatus>)
      : {};
  return {
    foldersDetected: Math.max(0, toInt(raw.foldersDetected, 0)),
    foldersSynced: Math.max(0, toInt(raw.foldersSynced, 0)),
    videosProcessed: Math.max(0, toInt(raw.videosProcessed, 0)),
    videosUpserted: Math.max(0, toInt(raw.videosUpserted, 0)),
    skippedMissingBvid: Math.max(0, toInt(raw.skippedMissingBvid, 0)),
    unresolvedMissingBvid: Math.max(0, toInt(raw.unresolvedMissingBvid, 0)),
    unavailableRemoteVideos: Math.max(0, toInt(raw.unavailableRemoteVideos, 0)),
    incompleteFolders: Math.max(0, toInt(raw.incompleteFolders, 0)),
    folderLinksAdded: Math.max(0, toInt(raw.folderLinksAdded, 0)),
    folderLinksRemoved: Math.max(0, toInt(raw.folderLinksRemoved, 0)),
    tagsBound: Math.max(0, toInt(raw.tagsBound, 0)),
    errorCount: Math.max(0, toInt(raw.errorCount, 0)),
  };
}

function normalizeFavoritesSyncErrors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as { folder?: unknown; message?: unknown };
      const message = normalizeText(raw.message);
      if (!message) return null;
      return {
        folder: normalizeText(raw.folder) || "__sync__",
        message,
      };
    })
    .filter((item): item is { folder: string; message: string } =>
      Boolean(item),
    )
    .slice(-100);
}

function normalizeFavoritesSyncUnresolvedItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<FavoritesSyncUnresolvedItem>;
      const remoteFolderId = toInt(raw.remoteFolderId);
      const reason = normalizeText(raw.reason);
      if (remoteFolderId <= 0 || !reason) return null;
      return {
        remoteFolderId,
        folder:
          normalizeText(raw.folder) || `Bilibili Favorite ${remoteFolderId}`,
        aid: toAid(raw.aid) || null,
        title: normalizeText(raw.title),
        reason,
      };
    })
    .filter((item): item is FavoritesSyncUnresolvedItem => Boolean(item))
    .slice(-100);
}

function normalizeFavoritesSyncIncompleteFolders(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<FavoritesSyncIncompleteFolder>;
      const remoteFolderId = toInt(raw.remoteFolderId);
      const reason = normalizeText(raw.reason);
      if (remoteFolderId <= 0 || !reason) return null;
      return {
        remoteFolderId,
        folder:
          normalizeText(raw.folder) || `Bilibili Favorite ${remoteFolderId}`,
        expected: Math.max(0, toInt(raw.expected, 0)),
        observed: Math.max(0, toInt(raw.observed, 0)),
        reason,
      };
    })
    .filter((item): item is FavoritesSyncIncompleteFolder => Boolean(item))
    .slice(-100);
}

function normalizeFavoritesSyncUnavailableFolders(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Partial<FavoritesSyncUnavailableFolder>;
      const remoteFolderId = toInt(raw.remoteFolderId);
      const expected = Math.max(0, toInt(raw.expected, 0));
      const observed = Math.max(0, toInt(raw.observed, 0));
      const unavailable = Math.max(
        0,
        toInt(raw.unavailable, Math.max(0, expected - observed)),
      );
      if (remoteFolderId <= 0 || unavailable <= 0) return null;
      return {
        remoteFolderId,
        folder:
          normalizeText(raw.folder) || `Bilibili Favorite ${remoteFolderId}`,
        expected,
        observed,
        unavailable,
        reason:
          normalizeText(raw.reason) ||
          "Bilibili did not return these unavailable videos",
      };
    })
    .filter((item): item is FavoritesSyncUnavailableFolder => Boolean(item))
    .slice(-100);
}

function normalizeBvidKeysByFolder(value: unknown) {
  const normalized: Record<string, string[]> = {};
  if (!value || typeof value !== "object") return normalized;
  for (const [remoteIdRaw, keysRaw] of Object.entries(value)) {
    const remoteId = toInt(remoteIdRaw);
    if (remoteId <= 0 || !Array.isArray(keysRaw)) continue;
    normalized[String(remoteId)] = Array.from(
      new Set(keysRaw.map((item) => normalizeKey(item)).filter(Boolean)),
    ).sort();
  }
  return normalized;
}

function normalizeCountByFolder(value: unknown) {
  const normalized: Record<string, number> = {};
  if (!value || typeof value !== "object") return normalized;
  for (const [remoteIdRaw, countRaw] of Object.entries(value)) {
    const remoteId = toInt(remoteIdRaw);
    if (remoteId <= 0) continue;
    normalized[String(remoteId)] = Math.max(0, toInt(countRaw, 0));
  }
  return normalized;
}

function normalizeFavoritesSyncStatus(value: unknown): FavoritesSyncStatus {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<FavoritesSyncStatus>)
      : {};
  const resumePageByFolder: Record<string, number> = {};
  const rawResume =
    raw.resumePageByFolder && typeof raw.resumePageByFolder === "object"
      ? raw.resumePageByFolder
      : {};
  for (const [remoteIdRaw, pageRaw] of Object.entries(rawResume)) {
    const remoteId = toInt(remoteIdRaw);
    const page = toInt(pageRaw);
    if (remoteId > 0 && page > 1) resumePageByFolder[String(remoteId)] = page;
  }
  const invalidVideoIds = Array.isArray(raw.invalidVideoIds)
    ? Array.from(
        new Set(
          raw.invalidVideoIds.map((id) => toInt(id)).filter((id) => id > 0),
        ),
      )
    : [];
  return {
    running: false,
    startedAt: toIntOrNull(raw.startedAt),
    finishedAt: toIntOrNull(raw.finishedAt),
    total: Math.max(0, toInt(raw.total, 0)),
    current: Math.max(0, toInt(raw.current, 0)),
    folderTitle: normalizeText(raw.folderTitle),
    folderIndex: Math.max(0, toInt(raw.folderIndex, 0)),
    folderTotal: Math.max(0, toInt(raw.folderTotal, 0)),
    message: normalizeText(raw.message),
    lastError: normalizeText(raw.lastError) || null,
    riskBlocked: Boolean(raw.riskBlocked),
    phase:
      raw.phase === "running" ||
      raw.phase === "paused" ||
      raw.phase === "waiting" ||
      raw.phase === "failed" ||
      raw.phase === "completed"
        ? raw.phase
        : "idle",
    nextRetryAt: toIntOrNull(raw.nextRetryAt),
    retryAutomatic: Boolean(raw.retryAutomatic),
    retryReason: normalizeText(raw.retryReason) || null,
    retryAttempt: Math.max(0, toInt(raw.retryAttempt, 0)),
    riskCount: Math.max(0, toInt(raw.riskCount, 0)),
    selectedRemoteFolderIds: normalizeSelectedRemoteFolderIds(
      raw.selectedRemoteFolderIds,
    ),
    completedRemoteFolderIds: normalizeSelectedRemoteFolderIds(
      raw.completedRemoteFolderIds,
    ),
    currentFolderRemoteId: toIntOrNull(raw.currentFolderRemoteId),
    currentPage: Math.max(1, toInt(raw.currentPage, 1)),
    resumePageByFolder,
    invalidVideosDetected: Math.max(
      invalidVideoIds.length,
      toInt(raw.invalidVideosDetected, 0),
    ),
    invalidVideoIds,
    summary: normalizeFavoritesSyncSummary(raw.summary),
    errors: normalizeFavoritesSyncErrors(raw.errors),
    unresolvedItems: normalizeFavoritesSyncUnresolvedItems(raw.unresolvedItems),
    incompleteFolders: normalizeFavoritesSyncIncompleteFolders(
      raw.incompleteFolders,
    ),
    unavailableFolders: normalizeFavoritesSyncUnavailableFolders(
      raw.unavailableFolders,
    ),
  };
}

function normalizeSelectedRemoteFolderIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((id) => toInt(id)).filter((id) => id > 0)),
  ).sort((left, right) => left - right);
}

function normalizeFavoritesSyncJobMeta(
  value: unknown = null,
): FavoritesSyncJobMeta {
  const raw =
    value && typeof value === "object"
      ? (value as {
          active?: unknown;
          lastStatus?: unknown;
          deletionCandidatesByFolder?: unknown;
        })
      : {};
  const lastStatus = normalizeFavoritesSyncStatus(raw.lastStatus);
  const deletionCandidatesByFolder = normalizeBvidKeysByFolder(
    raw.deletionCandidatesByFolder,
  );
  if (!raw.active || typeof raw.active !== "object") {
    return { active: null, lastStatus, deletionCandidatesByFolder };
  }

  const activeRaw = raw.active as Partial<FavoritesSyncJob>;
  const id = normalizeText(activeRaw.id);
  if (!id) return { active: null, lastStatus, deletionCandidatesByFolder };

  const currentFolderRemoteId = toIntOrNull(activeRaw.currentFolderRemoteId);
  const nextPageRaw = Math.max(1, toInt(activeRaw.nextPage, 1));
  const rawSeen =
    activeRaw.seenBvidKeysByFolder &&
    typeof activeRaw.seenBvidKeysByFolder === "object"
      ? (activeRaw.seenBvidKeysByFolder as Record<string, unknown>)
      : {};
  const seenBvidKeysByFolder = normalizeBvidKeysByFolder(rawSeen);

  let nextPage =
    currentFolderRemoteId && currentFolderRemoteId > 0 ? nextPageRaw : 1;
  if (
    currentFolderRemoteId &&
    nextPage > 1 &&
    !Array.isArray(rawSeen[String(currentFolderRemoteId)])
  ) {
    nextPage = 1;
    seenBvidKeysByFolder[String(currentFolderRemoteId)] = [];
  }

  const phase: FavoritesSyncJobPhase =
    activeRaw.phase === "running" ||
    activeRaw.phase === "failed" ||
    activeRaw.phase === "waiting" ||
    activeRaw.phase === "paused"
      ? activeRaw.phase
      : "paused";
  const invalidVideoIds = Array.isArray(activeRaw.invalidVideoIds)
    ? Array.from(
        new Set(
          activeRaw.invalidVideoIds
            .map((id) => toInt(id))
            .filter((id) => id > 0),
        ),
      )
    : [];
  const retryRaw =
    activeRaw.retry && typeof activeRaw.retry === "object"
      ? (activeRaw.retry as Partial<FavoritesSyncRetryState>)
      : {};
  const active: FavoritesSyncJob = {
    id,
    phase: phase === "running" ? "paused" : phase,
    selectedRemoteFolderIds: normalizeSelectedRemoteFolderIds(
      activeRaw.selectedRemoteFolderIds,
    ),
    currentFolderRemoteId:
      currentFolderRemoteId && currentFolderRemoteId > 0
        ? currentFolderRemoteId
        : null,
    currentFolderTitle: normalizeText(activeRaw.currentFolderTitle),
    currentFolderIndex: Math.max(0, toInt(activeRaw.currentFolderIndex, 0)),
    folderTotal: Math.max(0, toInt(activeRaw.folderTotal, 0)),
    nextPage,
    seenBvidKeysByFolder,
    observedRowCountByFolder: normalizeCountByFolder(
      activeRaw.observedRowCountByFolder,
    ),
    deletionCandidatesByFolder: normalizeBvidKeysByFolder(
      activeRaw.deletionCandidatesByFolder,
    ),
    completedRemoteFolderIds: normalizeSelectedRemoteFolderIds(
      activeRaw.completedRemoteFolderIds,
    ),
    startedAt: Math.max(0, toInt(activeRaw.startedAt, 0)),
    updatedAt: Math.max(0, toInt(activeRaw.updatedAt, 0)),
    total: Math.max(0, toInt(activeRaw.total, 0)),
    current: Math.max(0, toInt(activeRaw.current, 0)),
    summary: normalizeFavoritesSyncSummary(activeRaw.summary),
    invalidVideoIds,
    errors: normalizeFavoritesSyncErrors(activeRaw.errors),
    unresolvedItems: normalizeFavoritesSyncUnresolvedItems(
      activeRaw.unresolvedItems,
    ),
    incompleteFolders: normalizeFavoritesSyncIncompleteFolders(
      activeRaw.incompleteFolders,
    ),
    unavailableFolders: normalizeFavoritesSyncUnavailableFolders(
      activeRaw.unavailableFolders,
    ),
    riskBlocked: Boolean(activeRaw.riskBlocked),
    lastError: normalizeText(activeRaw.lastError) || null,
    retry: {
      attempt: Math.max(0, toInt(retryRaw.attempt, 0)),
      nextRetryAt: toIntOrNull(retryRaw.nextRetryAt),
      automatic: Boolean(retryRaw.automatic),
      reason: normalizeText(retryRaw.reason) || null,
      riskCount: Math.max(0, toInt(retryRaw.riskCount, 0)),
    },
  };
  if (Object.keys(active.deletionCandidatesByFolder).length === 0) {
    active.deletionCandidatesByFolder = normalizeBvidKeysByFolder(
      deletionCandidatesByFolder,
    );
  }
  return { active, lastStatus, deletionCandidatesByFolder };
}

function defaultFavoritesSyncJobMeta(): FavoritesSyncJobMeta {
  return normalizeFavoritesSyncJobMeta();
}

function createFavoritesSyncJob(
  selectedRemoteFolderIds: number[],
  startedAt = now(),
): FavoritesSyncJob {
  const selected = normalizeSelectedRemoteFolderIds(selectedRemoteFolderIds);
  const stamp = Math.max(0, toInt(startedAt, now()));
  return {
    id: `favorites-${stamp}-${selected.join("-") || "all"}`,
    phase: "running",
    selectedRemoteFolderIds: selected,
    currentFolderRemoteId: null,
    currentFolderTitle: "",
    currentFolderIndex: 0,
    folderTotal: 0,
    nextPage: 1,
    seenBvidKeysByFolder: {},
    observedRowCountByFolder: {},
    deletionCandidatesByFolder: {},
    completedRemoteFolderIds: [],
    startedAt: stamp,
    updatedAt: stamp,
    total: 0,
    current: 0,
    summary: emptyFavoritesSyncSummary(),
    invalidVideoIds: [],
    errors: [],
    unresolvedItems: [],
    incompleteFolders: [],
    unavailableFolders: [],
    riskBlocked: false,
    lastError: null,
    retry: {
      attempt: 0,
      nextRetryAt: null,
      automatic: false,
      reason: null,
      riskCount: 0,
    },
  };
}

function equalRemoteFolderSelection(left: number[], right: number[]) {
  const normalizedLeft = normalizeSelectedRemoteFolderIds(left);
  const normalizedRight = normalizeSelectedRemoteFolderIds(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((id, index) => id === normalizedRight[index])
  );
}

function prepareFavoritesSyncJob(
  meta: FavoritesSyncJobMeta,
  selectedRemoteFolderIds: number[],
  startedAt = now(),
) {
  const selected = normalizeSelectedRemoteFolderIds(selectedRemoteFolderIds);
  if (
    meta.active &&
    equalRemoteFolderSelection(meta.active.selectedRemoteFolderIds, selected)
  ) {
    meta.active.phase = "running";
    meta.active.updatedAt = Math.max(0, toInt(startedAt, now()));
    meta.active.riskBlocked = false;
    meta.active.retry.automatic = false;
    meta.active.retry.nextRetryAt = null;
    return meta.active;
  }
  meta.active = createFavoritesSyncJob(selected, startedAt);
  meta.active.deletionCandidatesByFolder = normalizeBvidKeysByFolder(
    meta.deletionCandidatesByFolder,
  );
  return meta.active;
}

function statusFromFavoritesSyncJob(
  job: FavoritesSyncJob,
  running = false,
  finishedAt: number | null = null,
): FavoritesSyncStatus {
  const phase = running
    ? "running"
    : job.phase === "running"
      ? "paused"
      : job.phase;
  const resumePageByFolder: Record<string, number> = {};
  if (job.currentFolderRemoteId && job.nextPage > 1) {
    resumePageByFolder[String(job.currentFolderRemoteId)] = job.nextPage;
  }
  return {
    running,
    startedAt: job.startedAt || null,
    finishedAt,
    total: job.total,
    current: job.current,
    folderTitle: job.currentFolderTitle,
    folderIndex: job.currentFolderIndex,
    folderTotal: job.folderTotal,
    message:
      phase === "running"
        ? job.currentFolderTitle
          ? `Syncing: ${job.currentFolderTitle}`
          : "Starting favorites sync..."
        : job.riskBlocked
          ? "Favorites sync paused"
          : phase === "waiting"
            ? "Favorites sync waiting to retry"
            : phase === "failed"
              ? "Favorites sync failed"
              : "Favorites sync paused",
    lastError: job.lastError,
    riskBlocked: job.riskBlocked,
    phase,
    nextRetryAt: job.retry.nextRetryAt,
    retryAutomatic: job.retry.automatic,
    retryReason: job.retry.reason,
    retryAttempt: job.retry.attempt,
    riskCount: job.retry.riskCount,
    selectedRemoteFolderIds: [...job.selectedRemoteFolderIds],
    completedRemoteFolderIds: [...job.completedRemoteFolderIds],
    currentFolderRemoteId: job.currentFolderRemoteId,
    currentPage: Math.max(1, job.nextPage),
    resumePageByFolder,
    invalidVideosDetected: job.invalidVideoIds.length,
    invalidVideoIds: [...job.invalidVideoIds],
    summary: { ...job.summary },
    errors: job.errors.slice(-30),
    unresolvedItems: job.unresolvedItems.slice(-100),
    incompleteFolders: job.incompleteFolders.slice(-100),
    unavailableFolders: job.unavailableFolders.slice(-100),
  };
}

function completeFavoritesSyncJob(
  meta: FavoritesSyncJobMeta,
  job: FavoritesSyncJob,
  finishedAt = now(),
) {
  meta.deletionCandidatesByFolder = normalizeBvidKeysByFolder(
    job.deletionCandidatesByFolder,
  );
  job.retry = {
    attempt: 0,
    nextRetryAt: null,
    automatic: false,
    reason: null,
    riskCount: 0,
  };
  meta.lastStatus = {
    ...statusFromFavoritesSyncJob(job, false, finishedAt),
    message:
      job.summary.unavailableRemoteVideos > 0 || job.invalidVideoIds.length > 0
        ? "Favorites sync completed with warnings"
        : "Favorites sync completed",
    phase: "completed",
    nextRetryAt: null,
    retryAutomatic: false,
  };
  meta.active = null;
  return meta.lastStatus;
}

const defaultInvalidVideoRecoveryStatus = (): InvalidVideoRecoveryStatus => ({
  running: false,
  total: 0,
  current: 0,
  recovered: 0,
  notFound: 0,
  failed: 0,
  lastError: null,
});

function defaultFollowingUpImportStatus(): FollowingUpImportStatus {
  return {
    running: false,
    total: 0,
    current: 0,
    created: 0,
    updated: 0,
    failed: 0,
    lastError: null,
  };
}

let dbPromise: Promise<IDBDatabase> | null = null;
let cachedState: LocalState | null = null;
let stateRevision = 0;
let cachedIndexes: { revision: number; value: LocalStateIndexes } | null = null;
const videoQueryResultCache = new Map<
  string,
  { revision: number; ids: number[] }
>();
let stateQueue: Promise<void> = Promise.resolve();
let tagEnrichmentTask: Promise<void> | null = null;
let tagEnrichmentStopRequested = false;
let biliCookieHeaderCache = new Map<
  string,
  { value: string; expiresAt: number }
>();
let nextBiliRequestAt = 0;
let biliRequestThrottleQueue: Promise<void> = Promise.resolve();
let favoritesSyncTask: Promise<void> | null = null;
let favoritesSyncStartPending = false;
let favoritesSyncStopRequested = false;
let favoritesSyncWorkingState: LocalState | null = null;
let invalidVideoRecoveryTask: Promise<void> | null = null;
let invalidVideoRecoveryStatus: InvalidVideoRecoveryStatus =
  defaultInvalidVideoRecoveryStatus();
let followingUpImportTask: Promise<void> | null = null;
let followingUpImportStatus: FollowingUpImportStatus =
  defaultFollowingUpImportStatus();
let stage3ReconcileTask: Promise<void> | null = null;
let folderAiCategoryTask: Promise<unknown> | null = null;
let folderAiCategoryFolderId: number | null = null;
let aiOrganizerTask: Promise<void> | null = null;
let aiOrganizerRequestAbortController: AbortController | null = null;
let aiOrganizerStartPending = false;
let aiOrganizerApplyPending = false;
let aiOrganizerQueue: Promise<void> = Promise.resolve();
let cachedAiOrganizerTask: AiOrganizerTaskRecord | null | undefined;

function now() {
  return Date.now();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
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

function paginate<T>(
  items: T[],
  pageRaw: string | null,
  pageSizeRaw: string | null,
) {
  const page = Math.max(1, toInt(pageRaw, 1));
  const pageSize = Math.max(1, toInt(pageSizeRaw, 30));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
    },
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
    request.onerror = () =>
      reject(request.error || new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

function cloneStoredValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

async function readStoredValue<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const record = request.result as { key: string; value: T } | undefined;
      resolve(record?.value ?? null);
    };
    request.onerror = () =>
      reject(request.error || new Error(`Read ${key} failed`));
  });
}

async function writeStoredValues(
  records: Array<{ key: string; value: unknown }>,
) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const record of records) store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("IndexedDB write was aborted"));
  });
}

const defaultExtensionReleaseDocument = (): ExtensionReleaseDocument => ({
  schemaVersion: 1,
  github: {
    version: null,
    label: null,
    url: GITHUB_RELEASES_URL,
  },
  channels: {
    chrome: { version: null, label: null, url: null },
    edge: {
      version: null,
      label: null,
      url: "https://microsoftedge.microsoft.com/addons/detail/bilishelf-manager/cnenidkjccfkjjbkcmkkbgjilhohpjbi",
    },
    firefox: {
      version: null,
      label: null,
      url: "https://addons.mozilla.org/firefox/addon/bilishelf/",
    },
  },
});

function normalizeUpdateUrl(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeReleaseEntry(
  raw: unknown,
  fallback: ExtensionReleaseEntry,
): ExtensionReleaseEntry {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    version: normalizeText(source.version) || fallback.version,
    label: normalizeText(source.label) || fallback.label,
    url: normalizeUpdateUrl(source.url) ?? fallback.url,
  };
}

function normalizeExtensionReleaseDocument(
  raw: unknown,
): ExtensionReleaseDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  if (toInt(source.schemaVersion, 0) !== 1) return null;
  const fallback = defaultExtensionReleaseDocument();
  const channels =
    source.channels && typeof source.channels === "object"
      ? (source.channels as Record<string, unknown>)
      : {};
  return {
    schemaVersion: 1,
    github: normalizeReleaseEntry(source.github, fallback.github),
    channels: {
      chrome: normalizeReleaseEntry(channels.chrome, fallback.channels.chrome),
      edge: normalizeReleaseEntry(channels.edge, fallback.channels.edge),
      firefox: normalizeReleaseEntry(
        channels.firefox,
        fallback.channels.firefox,
      ),
    },
  };
}

function normalizeExtensionUpdateState(raw: unknown): ExtensionUpdateState {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawNotice =
    source.notice && typeof source.notice === "object"
      ? (source.notice as Record<string, unknown>)
      : null;
  const currentVersion =
    normalizeText(chrome.runtime.getManifest?.().version) || "0.0.0";
  const notice =
    rawNotice && normalizeText(rawNotice.previousVersion)
      ? {
          previousVersion: normalizeText(rawNotice.previousVersion),
          currentVersion:
            normalizeText(rawNotice.currentVersion) || currentVersion,
          installedAt: toInt(rawNotice.installedAt, 0),
        }
      : null;
  return {
    lastCheckedAt: toInt(source.lastCheckedAt, 0),
    lastError: normalizeText(source.lastError) || null,
    release: normalizeExtensionReleaseDocument(source.release),
    notice,
  };
}

function getExtensionUpdateChannel(): ExtensionReleaseChannel {
  const manifest = chrome.runtime.getManifest?.() as
    | { browser_specific_settings?: { gecko?: unknown } }
    | undefined;
  return resolveExtensionReleaseChannel({
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    hasGeckoSettings: Boolean(manifest?.browser_specific_settings?.gecko),
  }) as ExtensionReleaseChannel;
}

function getCurrentExtensionVersion() {
  return normalizeText(chrome.runtime.getManifest?.().version) || "0.0.0";
}

function buildExtensionUpdateStatus(
  state: ExtensionUpdateState,
): ExtensionUpdateStatus {
  const release = state.release ?? defaultExtensionReleaseDocument();
  const channel = getExtensionUpdateChannel();
  const store = release.channels[channel];
  const github = release.github;
  const availability = resolveExtensionUpdateAvailability({
    currentVersion: getCurrentExtensionVersion(),
    storeVersion: store.version,
    storeUrl: store.url,
    githubVersion: github.version,
    githubLabel: github.label,
    githubUrl: github.url ?? GITHUB_RELEASES_URL,
  });
  return {
    ...availability,
    preferredUrl: availability.preferredUrl ?? GITHUB_RELEASES_URL,
    channel,
    checkedAt: state.lastCheckedAt || null,
    lastError: state.lastError,
    storeUrl: store.url,
    githubLabel: github.label,
    githubUrl: github.url ?? GITHUB_RELEASES_URL,
    repositoryUrl: GITHUB_REPOSITORY_URL,
    releasesUrl: GITHUB_RELEASES_URL,
    notice: state.notice,
  };
}

async function fetchExtensionReleaseDocument() {
  const fallback = defaultExtensionReleaseDocument();
  const errors: string[] = [];
  const document: ExtensionReleaseDocument = {
    schemaVersion: 1,
    github: { ...fallback.github },
    channels: {
      chrome: { ...fallback.channels.chrome },
      edge: { ...fallback.channels.edge },
      firefox: { ...fallback.channels.firefox },
    },
  };

  const [readmeResult, githubResult] = await Promise.allSettled([
    fetchFromUpdateMirrors(
      EXTENSION_UPDATE_README_MIRROR_URLS,
      {
        method: "GET",
        headers: { Accept: "text/plain, text/markdown" },
        cache: "no-store",
      },
      "Extension store version request",
    ),
    fetchLatestGithubReleaseEntry(),
  ]);

  if (readmeResult.status === "fulfilled") {
    try {
      if (!readmeResult.value.ok) {
        throw new Error(`README request failed (${readmeResult.value.status})`);
      }
      const readme = await readmeResult.value.text();
      const marker =
        readme.match(
          /<!--\s*bilishelf-store-version:\s*([^>]+?)\s*-->/i,
        )?.[1] ?? "";
      const versions = new Map<string, string>();
      for (const entry of marker.split(/[;,]/)) {
        const match = entry.trim().match(/^(edge|firefox|chrome)\s*=\s*(.+)$/i);
        const version = match
          ? normalizeExtensionVersion(match[2].trim())
          : null;
        if (match && version) versions.set(match[1].toLowerCase(), version);
      }
      for (const channel of ["chrome", "edge", "firefox"] as const) {
        const parsed = normalizeReleaseEntry(
          { version: versions.get(channel) },
          document.channels[channel],
        );
        document.channels[channel] = parsed;
      }
      if (![...versions.values()].some((version) => normalizeText(version))) {
        throw new Error("README store version marker is missing or invalid");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  } else {
    errors.push(
      readmeResult.reason instanceof Error
        ? readmeResult.reason.message
        : String(readmeResult.reason),
    );
  }

  if (githubResult.status === "fulfilled") {
    document.github = githubResult.value;
  } else {
    errors.push(
      githubResult.reason instanceof Error
        ? githubResult.reason.message
        : String(githubResult.reason),
    );
  }

  if (errors.length >= 2) {
    throw new Error(errors.join("; "));
  }
  // A mirror can be unavailable while the other source still provides a
  // complete and usable update result. Do not turn that partial network issue
  // into a failed check in the UI.
  return { document, warning: null };
}

async function fetchLatestGithubReleaseEntry(): Promise<ExtensionReleaseEntry> {
  let apiError: unknown = null;
  try {
    const response = await fetchFromUpdateMirrors(
      [
        EXTENSION_UPDATE_GITHUB_PROXY_API_URL,
        EXTENSION_UPDATE_GITHUB_API_URL,
      ],
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "BiliShelf-Extension",
        },
        cache: "no-store",
      },
      "GitHub release version request",
    );
    const payload = (await response.json()) as Record<string, unknown>;
    const version = normalizeText(payload.tag_name);
    if (!version) throw new Error("GitHub latest release has no tag");
    return normalizeReleaseEntry(
      {
        version,
        label: version,
        url: normalizeUpdateUrl(payload.html_url) ?? GITHUB_RELEASES_URL,
      },
      defaultExtensionReleaseDocument().github,
    );
  } catch (error) {
    apiError = error;
  }

  let atomError: unknown = null;
  try {
    const response = await fetchFromUpdateMirrors(
      [
        EXTENSION_UPDATE_GITHUB_PROXY_ATOM_URL,
        EXTENSION_UPDATE_GITHUB_ATOM_URL,
      ],
      {
        method: "GET",
        headers: { Accept: "application/atom+xml, application/xml, text/xml" },
        cache: "no-store",
      },
      "GitHub release feed request",
    );
    const atom = await response.text();
    const firstEntry = atom.match(/<entry\b[\s\S]*?<\/entry>/i)?.[0] ?? atom;
    const link =
      firstEntry.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i)?.[1] ?? "";
    const version = link.match(/\/tag\/([^/?#]+)/i)?.[1] ?? "";
    if (!version) throw new Error("GitHub release feed has no tag");
    return normalizeReleaseEntry(
      {
        version,
        label: version,
        url: normalizeUpdateUrl(link) ?? GITHUB_RELEASES_URL,
      },
      defaultExtensionReleaseDocument().github,
    );
  } catch (error) {
    atomError = error;
  }

  // jsDelivr mirrors repository tags and remains reachable where GitHub does
  // not. It is the final version-only fallback; the release page link still
  // points to GitHub for users who can access it.
  try {
    const response = await fetchFromUpdateMirrors(
      [EXTENSION_UPDATE_GITHUB_CDN_PACKAGE_URL],
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      "CDN release version request",
    );
    const payload = (await response.json()) as Record<string, unknown>;
    const version = normalizeText(payload.version);
    if (!version) throw new Error("CDN package has no version");
    return normalizeReleaseEntry(
      {
        version,
        label: `v${version}`,
        url: GITHUB_RELEASES_URL,
      },
      defaultExtensionReleaseDocument().github,
    );
  } catch (cdnError) {
    const apiMessage =
      apiError instanceof Error ? apiError.message : String(apiError);
    const atomMessage =
      atomError instanceof Error ? atomError.message : String(atomError);
    const cdnMessage =
      cdnError instanceof Error ? cdnError.message : String(cdnError);
    throw new Error(`${apiMessage}; ${atomMessage}; ${cdnMessage}`);
  }
}

async function readExtensionUpdateState() {
  return normalizeExtensionUpdateState(
    await readStoredValue<ExtensionUpdateState>(EXTENSION_UPDATE_STATE_KEY),
  );
}

async function checkExtensionUpdate(force = false) {
  const current = await readExtensionUpdateState();
  const due =
    force ||
    !current.release ||
    Date.now() - current.lastCheckedAt >= EXTENSION_UPDATE_CHECK_INTERVAL_MS;
  if (!due) return buildExtensionUpdateStatus(current);

  const next = { ...current, lastCheckedAt: Date.now() };
  try {
    const result = await fetchExtensionReleaseDocument();
    next.release = result.document;
    next.lastError = result.warning;
  } catch (error) {
    next.lastError = error instanceof Error ? error.message : String(error);
  }
  await writeStoredValues([{ key: EXTENSION_UPDATE_STATE_KEY, value: next }]);
  return buildExtensionUpdateStatus(next);
}

async function acknowledgeExtensionUpdateNotice() {
  const state = await readExtensionUpdateState();
  state.notice = null;
  await writeStoredValues([{ key: EXTENSION_UPDATE_STATE_KEY, value: state }]);
  return buildExtensionUpdateStatus(state);
}

async function recordExtensionUpdate(previousVersion: unknown) {
  const previous = normalizeText(previousVersion);
  const current = getCurrentExtensionVersion();
  if (!previous || previous === current) return;
  const state = await readExtensionUpdateState();
  state.notice = {
    previousVersion: previous,
    currentVersion: current,
    installedAt: Date.now(),
  };
  await writeStoredValues([{ key: EXTENSION_UPDATE_STATE_KEY, value: state }]);
}

function scheduleExtensionUpdateCheckAlarm() {
  if (!chrome.alarms?.create) return;
  chrome.alarms.create(EXTENSION_UPDATE_ALARM, {
    delayInMinutes: 5,
    periodInMinutes: EXTENSION_UPDATE_CHECK_INTERVAL_MINUTES,
  });
}

async function deleteStoredValue(key: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Delete ${key} failed`));
    tx.onabort = () =>
      reject(tx.error || new Error(`Delete ${key} was aborted`));
  });
}

async function writeStateAndStoredValue(
  state: LocalState,
  key: string,
  value: unknown,
) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: STATE_KEY, value: state });
    store.put({ key, value });
    tx.oncomplete = () => {
      cachedState = state;
      stateRevision += 1;
      cachedIndexes = null;
      videoQueryResultCache.clear();
      resolve();
    };
    tx.onerror = () =>
      reject(tx.error || new Error("Library transaction failed"));
    tx.onabort = () =>
      reject(tx.error || new Error("Library transaction was aborted"));
  });
}

function normalizeStoredFavoriteComment(
  raw: unknown,
  fallbackId: number,
): FavoriteCommentRecord | null {
  try {
    const source = (raw ?? {}) as Partial<FavoriteCommentRecord>;
    const timestamp = now();
    const normalized = normalizeFavoriteComment(source, timestamp);
    const savedAt = Math.max(0, toInt(source.savedAt, timestamp));
    return {
      ...normalized,
      id: Math.max(1, toInt(source.id, fallbackId)),
      savedAt,
      updatedAt: Math.max(savedAt, toInt(source.updatedAt, savedAt)),
      deletedAt: toIntOrNull(source.deletedAt),
    };
  } catch {
    return null;
  }
}

function normalizeStoredArticleFolder(
  raw: unknown,
  fallbackId: number,
): ArticleFolderRecord | null {
  const source = (raw ?? {}) as Partial<ArticleFolderRecord>;
  const name = normalizeText(source.name);
  if (!name) return null;
  const id = Math.max(1, toInt(source.id, fallbackId));
  const createdAt = Math.max(0, toInt(source.createdAt, now()));
  return {
    id,
    name,
    description: normalizeText(source.description) || null,
    groupName: normalizeText(source.groupName) || null,
    sortOrder: Math.max(1, toInt(source.sortOrder, fallbackId)),
    deletedAt: toIntOrNull(source.deletedAt),
    createdAt,
    updatedAt: Math.max(createdAt, toInt(source.updatedAt, createdAt)),
  };
}

async function readState() {
  if (cachedState) return cachedState;
  const db = await openDatabase();
  return new Promise<LocalState>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);

    request.onsuccess = () => {
      const record = request.result as
        | { key: string; value: LocalState }
        | undefined;
      if (!record?.value) {
        cachedState = defaultState();
        stateRevision += 1;
        resolve(cachedState);
        return;
      }

      const raw = record.value as Partial<LocalState>;
      const base = defaultState();
      const comments = (raw.comments ?? [])
        .map((comment, index) =>
          normalizeStoredFavoriteComment(comment, index + 1),
        )
        .filter((comment): comment is FavoriteCommentRecord =>
          Boolean(comment),
        );
      const nextCommentId = comments.reduce(
        (maximum, comment) => Math.max(maximum, comment.id + 1),
        1,
      );
      const hasStoredArticleFolders = Object.prototype.hasOwnProperty.call(
        raw,
        "articleFolders",
      );
      let articleFolders = (raw.articleFolders ?? [])
        .map((folder, index) => normalizeStoredArticleFolder(folder, index + 1))
        .filter((folder): folder is ArticleFolderRecord => Boolean(folder));
      if (!hasStoredArticleFolders) {
        const legacyFolderIds = new Set(
          (raw.articles ?? []).flatMap((article) =>
            Array.isArray(article.folderIds)
              ? article.folderIds.map((id) => toInt(id)).filter((id) => id > 0)
              : [],
          ),
        );
        articleFolders = (raw.folders ?? [])
          .filter((folder) => legacyFolderIds.has(toInt(folder.id)))
          .map((folder, index) =>
            normalizeStoredArticleFolder(
              {
                id: toInt(folder.id),
                name: folder.name,
                description: folder.description,
                groupName: folder.groupName,
                sortOrder: index + 1,
                deletedAt: null,
                createdAt: folder.createdAt,
                updatedAt: folder.updatedAt,
              },
              index + 1,
            ),
          )
          .filter((folder): folder is ArticleFolderRecord => Boolean(folder));
      }
      const articleFolderIds = new Set(
        articleFolders
          .filter((folder) => folder.deletedAt === null)
          .map((folder) => folder.id),
      );
      const articles = (raw.articles ?? [])
        .map((article, index) => {
          const normalizedArticle = normalizeStoredFavoriteArticle(
            article,
            index + 1,
            now(),
          );
          return normalizedArticle
            ? {
                ...normalizedArticle,
                deletedAt: toIntOrNull(
                  (article as Partial<FavoriteArticleRecord>).deletedAt,
                ),
              }
            : null;
        })
        .map((article) =>
          article
            ? {
                ...article,
                folderIds: article.folderIds.filter((id) =>
                  articleFolderIds.has(id),
                ),
              }
            : article,
        )
        .filter((article): article is FavoriteArticleRecord =>
          Boolean(article),
        );
      const nextArticleId = articles.reduce(
        (maximum, article) => Math.max(maximum, article.id + 1),
        1,
      );
      const normalized: LocalState = {
        counters: {
          folder: raw.counters?.folder ?? base.counters.folder,
          articleFolder: Math.max(
            raw.counters?.articleFolder ?? 1,
            articleFolders.reduce(
              (maximum, folder) => Math.max(maximum, folder.id + 1),
              1,
            ),
          ),
          video: raw.counters?.video ?? base.counters.video,
          folderItem: raw.counters?.folderItem ?? base.counters.folderItem,
          tag: raw.counters?.tag ?? base.counters.tag,
          videoTag: raw.counters?.videoTag ?? base.counters.videoTag,
          comment: Math.max(raw.counters?.comment ?? 1, nextCommentId),
          article: Math.max(raw.counters?.article ?? 1, nextArticleId),
        },
        folders: (raw.folders ?? []).map((folder) => ({
          ...folder,
          groupName:
            normalizeText((folder as Partial<FolderRecord>).groupName) || null,
          remoteMediaId:
            folder.remoteMediaId === null || folder.remoteMediaId === undefined
              ? null
              : toInt(folder.remoteMediaId),
        })),
        articleFolders,
        videos: (raw.videos ?? []).map((video) => ({
          ...video,
          partition: normalizeVideoPartition(
            (video as Partial<VideoRecord>).partition,
          ),
          uploaderSpaceUrl: normalizeBiliSpaceUrl(
            (video as Partial<VideoRecord>).uploaderSpaceUrl,
          ),
        })),
        folderItems: raw.folderItems ?? [],
        tags: raw.tags ?? [],
        videoTags: raw.videoTags ?? [],
        followedUps: (raw.followedUps ?? [])
          .map((item, index) => ({
            uid: toInt((item as Partial<FollowedUpRecord>).uid),
            name: normalizeText((item as Partial<FollowedUpRecord>).name),
            avatarUrl: normalizeText(
              (item as Partial<FollowedUpRecord>).avatarUrl,
            ),
            spaceUrl:
              normalizeBiliSpaceUrl(
                (item as Partial<FollowedUpRecord>).spaceUrl,
                (item as Partial<FollowedUpRecord>).uid,
              ) || "",
            sortOrder: Math.max(
              0,
              toInt((item as Partial<FollowedUpRecord>).sortOrder, index),
            ),
            importedAt: Math.max(
              0,
              toInt((item as Partial<FollowedUpRecord>).importedAt, 0),
            ),
            updatedAt: Math.max(
              0,
              toInt((item as Partial<FollowedUpRecord>).updatedAt, 0),
            ),
          }))
          .filter((item) => item.uid > 0 && item.name),
        comments,
        articles,
        syncMeta: {
          tagEnrichment: normalizeTagEnrichmentMeta(
            raw.syncMeta?.tagEnrichment,
          ),
          bidirectionalSync: {
            biliToLocalEnabled: normalizeBiliToLocalEnabled(
              raw.syncMeta?.bidirectionalSync?.biliToLocalEnabled,
            ),
            localToBiliEnabled: false,
            updatedAt: toInt(
              raw.syncMeta?.bidirectionalSync?.updatedAt,
              base.syncMeta.bidirectionalSync.updatedAt,
            ),
          },
          webdav: {
            enabled: Boolean(raw.syncMeta?.webdav?.enabled),
            baseUrl: normalizeText(raw.syncMeta?.webdav?.baseUrl),
            username: normalizeText(raw.syncMeta?.webdav?.username),
            password: String(raw.syncMeta?.webdav?.password ?? ""),
            remotePath:
              normalizeText(raw.syncMeta?.webdav?.remotePath) || "bilishelf",
            lastTestAt: toIntOrNull(raw.syncMeta?.webdav?.lastTestAt),
            lastTestOk: Boolean(raw.syncMeta?.webdav?.lastTestOk),
            lastError: normalizeText(raw.syncMeta?.webdav?.lastError) || null,
            lastBackupAt: toIntOrNull(raw.syncMeta?.webdav?.lastBackupAt),
            lastBackupFile:
              normalizeText(raw.syncMeta?.webdav?.lastBackupFile) || null,
            lastRestoreAt: toIntOrNull(raw.syncMeta?.webdav?.lastRestoreAt),
            updatedAt: toInt(
              raw.syncMeta?.webdav?.updatedAt,
              base.syncMeta.webdav.updatedAt,
            ),
          },
          stage3Reconcile: {
            enabled: raw.syncMeta?.stage3Reconcile?.enabled !== false,
            intervalMinutes: Math.max(
              5,
              toInt(
                raw.syncMeta?.stage3Reconcile?.intervalMinutes,
                base.syncMeta.stage3Reconcile.intervalMinutes,
              ),
            ),
            cursorAfterRemoteMediaId: Math.max(
              0,
              toInt(raw.syncMeta?.stage3Reconcile?.cursorAfterRemoteMediaId, 0),
            ),
            nextRunAt: toIntOrNull(raw.syncMeta?.stage3Reconcile?.nextRunAt),
            running: false,
            lastRunAt: toIntOrNull(raw.syncMeta?.stage3Reconcile?.lastRunAt),
            lastError:
              normalizeText(raw.syncMeta?.stage3Reconcile?.lastError) || null,
            lastRemoteMediaId: toIntOrNull(
              raw.syncMeta?.stage3Reconcile?.lastRemoteMediaId,
            ),
            lastSummary: normalizeFavoritesSyncSummary(
              raw.syncMeta?.stage3Reconcile?.lastSummary,
            ),
          },
          favoritesJob: normalizeFavoritesSyncJobMeta(
            raw.syncMeta?.favoritesJob,
          ),
        },
        ai: normalizeAiState(raw.ai, base.ai.updatedAt),
      };
      cachedState = normalized;
      stateRevision += 1;
      resolve(cachedState);
    };
    request.onerror = () =>
      reject(request.error || new Error("Read state failed"));
  });
}

async function writeState(state: LocalState) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key: STATE_KEY, value: state });

    tx.oncomplete = () => {
      cachedState = state;
      stateRevision += 1;
      cachedIndexes = null;
      videoQueryResultCache.clear();
      resolve();
    };
    tx.onerror = () => reject(tx.error || new Error("Write state failed"));
    tx.onabort = () => reject(tx.error || new Error("Write state was aborted"));
  });
}

function withState<T>(
  mutate: (state: LocalState) => Promise<T> | T,
  persist: boolean,
) {
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
    () => undefined,
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

function folderItemExists(
  state: LocalState,
  folderId: number,
  videoId: number,
) {
  return state.folderItems.some(
    (item) => item.folderId === folderId && item.videoId === videoId,
  );
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

function ensureTag(
  state: LocalState,
  rawName: unknown,
  type: "system" | "custom",
) {
  const name = normalizeText(rawName);
  if (!name) return null;

  const key = normalizeKey(name);
  const existing = state.tags.find(
    (tag) =>
      tag.archivedAt === null &&
      tag.type === type &&
      normalizeKey(tag.name) === key,
  );
  if (existing) return existing;

  const created: TagRecord = {
    id: state.counters.tag++,
    name,
    type,
    createdAt: now(),
    archivedAt: null,
  };
  state.tags.push(created);
  return created;
}

function ensureVideoTag(state: LocalState, videoId: number, tagId: number) {
  if (
    state.videoTags.some(
      (edge) => edge.videoId === videoId && edge.tagId === tagId,
    )
  )
    return;
  state.videoTags.push({
    id: state.counters.videoTag++,
    videoId,
    tagId,
  });
}

function emptyVideoTagSummary(): VideoTagSummary {
  return {
    tags: [],
    systemTags: [],
    customTags: [],
  };
}

function buildLocalStateIndexes(state: LocalState): LocalStateIndexes {
  const activeFoldersById = new Map<number, FolderRecord>();
  for (const folder of state.folders) {
    if (folder.deletedAt === null) {
      activeFoldersById.set(folder.id, folder);
    }
  }

  const activeVideoIds = new Set<number>();
  const videosById = new Map<number, VideoRecord>();
  for (const video of state.videos) {
    videosById.set(video.id, video);
    if (video.deletedAt === null) {
      activeVideoIds.add(video.id);
    }
  }

  const folderItemsByVideoId = new Map<number, FolderItemRecord[]>();
  const activeFolderIdsByVideoId = new Map<number, Set<number>>();
  const activeFolderItemCountByFolderId = new Map<number, number>();
  const activeAddedAtByVideoId = new Map<number, number>();
  const activeAddedAtByFolderAndVideoId = new Map<
    number,
    Map<number, number>
  >();
  for (const item of state.folderItems) {
    const existingItems = folderItemsByVideoId.get(item.videoId);
    if (existingItems) {
      existingItems.push(item);
    } else {
      folderItemsByVideoId.set(item.videoId, [item]);
    }

    if (!activeFoldersById.has(item.folderId)) continue;

    let folderIds = activeFolderIdsByVideoId.get(item.videoId);
    if (!folderIds) {
      folderIds = new Set<number>();
      activeFolderIdsByVideoId.set(item.videoId, folderIds);
    }
    folderIds.add(item.folderId);

    if (activeVideoIds.has(item.videoId)) {
      activeFolderItemCountByFolderId.set(
        item.folderId,
        (activeFolderItemCountByFolderId.get(item.folderId) ?? 0) + 1,
      );
      activeAddedAtByVideoId.set(
        item.videoId,
        Math.max(activeAddedAtByVideoId.get(item.videoId) ?? 0, item.addedAt),
      );
      let folderAddedAt = activeAddedAtByFolderAndVideoId.get(item.folderId);
      if (!folderAddedAt) {
        folderAddedAt = new Map<number, number>();
        activeAddedAtByFolderAndVideoId.set(item.folderId, folderAddedAt);
      }
      folderAddedAt.set(
        item.videoId,
        Math.max(folderAddedAt.get(item.videoId) ?? 0, item.addedAt),
      );
    }
  }

  const activeTagsById = new Map<number, TagRecord>();
  for (const tag of state.tags) {
    if (tag.archivedAt === null) {
      activeTagsById.set(tag.id, tag);
    }
  }

  const tagSetsByVideoId = new Map<
    number,
    { tags: Set<string>; systemTags: Set<string>; customTags: Set<string> }
  >();
  for (const edge of state.videoTags) {
    const tag = activeTagsById.get(edge.tagId);
    if (!tag) continue;

    let summary = tagSetsByVideoId.get(edge.videoId);
    if (!summary) {
      summary = {
        tags: new Set<string>(),
        systemTags: new Set<string>(),
        customTags: new Set<string>(),
      };
      tagSetsByVideoId.set(edge.videoId, summary);
    }

    summary.tags.add(tag.name);
    if (tag.type === "system") {
      summary.systemTags.add(tag.name);
    } else {
      summary.customTags.add(tag.name);
    }
  }

  const tagSummaryByVideoId = new Map<number, VideoTagSummary>();
  for (const [videoId, summary] of tagSetsByVideoId) {
    tagSummaryByVideoId.set(videoId, {
      tags: Array.from(summary.tags),
      systemTags: Array.from(summary.systemTags),
      customTags: Array.from(summary.customTags),
    });
  }

  const compareVideoIds = (
    leftId: number,
    rightId: number,
    folderId?: number,
  ) => {
    const left = videosById.get(leftId);
    const right = videosById.get(rightId);
    const folderAddedAt =
      folderId === undefined
        ? null
        : (activeAddedAtByFolderAndVideoId.get(folderId) ?? null);
    const leftRank =
      (folderAddedAt?.get(leftId) ?? activeAddedAtByVideoId.get(leftId) ?? 0) ||
      left?.updatedAt ||
      0;
    const rightRank =
      (folderAddedAt?.get(rightId) ??
        activeAddedAtByVideoId.get(rightId) ??
        0) ||
      right?.updatedAt ||
      0;
    return rightRank - leftRank || rightId - leftId;
  };

  const sortedActiveVideoIds = Array.from(activeVideoIds)
    .filter((videoId) => (activeFolderIdsByVideoId.get(videoId)?.size ?? 0) > 0)
    .sort((leftId, rightId) => compareVideoIds(leftId, rightId));
  const sortedDeletedVideoIds = state.videos
    .filter((video) => video.deletedAt !== null)
    .sort(
      (left, right) =>
        (right.deletedAt ?? 0) - (left.deletedAt ?? 0) || right.id - left.id,
    )
    .map((video) => video.id);
  const sortedActiveVideoIdsByFolderId = new Map<number, number[]>();
  for (const [folderId, addedAtByVideoId] of activeAddedAtByFolderAndVideoId) {
    sortedActiveVideoIdsByFolderId.set(
      folderId,
      Array.from(addedAtByVideoId.keys()).sort((leftId, rightId) =>
        compareVideoIds(leftId, rightId, folderId),
      ),
    );
  }

  return {
    activeFoldersById,
    activeVideoIds,
    videosById,
    folderItemsByVideoId,
    activeFolderIdsByVideoId,
    activeFolderItemCountByFolderId,
    tagSummaryByVideoId,
    sortedActiveVideoIds,
    sortedDeletedVideoIds,
    sortedActiveVideoIdsByFolderId,
  };
}

function activeArticleFolders(state: LocalState) {
  return (state.articleFolders ?? [])
    .filter((folder) => folder.deletedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
}

function getLocalStateIndexes(state: LocalState) {
  if (state === cachedState && cachedIndexes?.revision === stateRevision) {
    return cachedIndexes.value;
  }
  const value = buildLocalStateIndexes(state);
  if (state === cachedState) {
    cachedIndexes = { revision: stateRevision, value };
  }
  return value;
}

function getTagSummaryForVideo(state: LocalState, videoId: number) {
  const links = state.videoTags.filter((edge) => edge.videoId === videoId);
  const tags = links
    .map((edge) => state.tags.find((tag) => tag.id === edge.tagId))
    .filter((tag): tag is TagRecord => !!tag && tag.archivedAt === null);

  const systemTags = tags
    .filter((tag) => tag.type === "system")
    .map((tag) => tag.name);
  const customTags = tags
    .filter((tag) => tag.type === "custom")
    .map((tag) => tag.name);

  return {
    tags: Array.from(new Set(tags.map((tag) => tag.name))),
    systemTags: Array.from(new Set(systemTags)),
    customTags: Array.from(new Set(customTags)),
  };
}

function computeAddedAtFromItems(
  items: FolderItemRecord[],
  activeFoldersById: Map<number, FolderRecord>,
  folderId?: number,
) {
  const active = items.filter((item) => {
    const folder = activeFoldersById.get(item.folderId);
    if (!folder || folder.deletedAt !== null) return false;
    if (folderId !== undefined && folder.id !== folderId) return false;
    return true;
  });

  if (active.length === 0) return null;
  return active.reduce((max, item) => Math.max(max, item.addedAt), 0);
}

function computeAddedAt(state: LocalState, videoId: number, folderId?: number) {
  const indexes = getLocalStateIndexes(state);
  return computeAddedAtFromItems(
    indexes.folderItemsByVideoId.get(videoId) ?? [],
    indexes.activeFoldersById,
    folderId,
  );
}

function mapVideo(
  state: LocalState,
  video: VideoRecord,
  folderId?: number,
  indexes?: LocalStateIndexes,
) {
  const tagSummary =
    indexes?.tagSummaryByVideoId.get(video.id) ??
    (indexes ? emptyVideoTagSummary() : getTagSummaryForVideo(state, video.id));
  const addedAt = indexes
    ? computeAddedAtFromItems(
        indexes.folderItemsByVideoId.get(video.id) ?? [],
        indexes.activeFoldersById,
        folderId,
      )
    : computeAddedAt(state, video.id, folderId);
  return {
    ...video,
    bvid: normalizeOutputBvid(video.bvid),
    addedAt,
    tags: tagSummary.tags,
    systemTags: tagSummary.systemTags,
    customTags: tagSummary.customTags,
  };
}

function hasVideoFilters(args: VideoListArgs) {
  return Boolean(
    args.tags?.length ||
    normalizeText(args.q) ||
    normalizeText(args.title) ||
    normalizeText(args.description) ||
    normalizeText(args.uploader) ||
    normalizeText(args.customTag) ||
    normalizeText(args.systemTag) ||
    (args.from !== null && args.from !== undefined) ||
    (args.to !== null && args.to !== undefined),
  );
}

function getBaseVideoIds(args: VideoListArgs, indexes: LocalStateIndexes) {
  if (args.includeDeleted) return indexes.sortedDeletedVideoIds;
  if (args.folderId !== undefined) {
    return indexes.sortedActiveVideoIdsByFolderId.get(args.folderId) ?? [];
  }
  return indexes.sortedActiveVideoIds;
}

function buildVideoQueryCacheKey(args: VideoListArgs) {
  return JSON.stringify({
    includeDeleted: args.includeDeleted,
    folderId: args.folderId ?? null,
    tags: (args.tags ?? [])
      .map((item) => normalizeKey(item))
      .filter(Boolean)
      .sort(),
    q: normalizeKey(args.q),
    title: normalizeKey(args.title),
    description: normalizeKey(args.description),
    uploader: normalizeKey(args.uploader),
    customTag: normalizeKey(args.customTag),
    systemTag: normalizeKey(args.systemTag),
    from: args.from ?? null,
    to: args.to ?? null,
  });
}

function getVideoIdsForQuery(
  state: LocalState,
  args: VideoListArgs,
  indexes = getLocalStateIndexes(state),
) {
  const baseIds = getBaseVideoIds(args, indexes);
  if (!hasVideoFilters(args)) return baseIds;

  const cacheKey = buildVideoQueryCacheKey(args);
  if (state === cachedState) {
    const cached = videoQueryResultCache.get(cacheKey);
    if (cached?.revision === stateRevision) {
      videoQueryResultCache.delete(cacheKey);
      videoQueryResultCache.set(cacheKey, cached);
      return cached.ids;
    }
  }

  const requiredTags = (args.tags || [])
    .map((item) => normalizeKey(item))
    .filter(Boolean);
  const qKeyword = normalizeText(args.q);
  const titleKeyword = normalizeText(args.title);
  const descriptionKeyword = normalizeText(args.description);
  const uploaderKeyword = normalizeText(args.uploader);
  const customTagKeyword = normalizeText(args.customTag);
  const systemTagKeyword = normalizeText(args.systemTag);

  const ids = baseIds.filter((videoId) => {
    const video = indexes.videosById.get(videoId);
    if (!video) return false;
    const tagSummary =
      indexes.tagSummaryByVideoId.get(videoId) ?? emptyVideoTagSummary();

    const allTags = tagSummary.tags;
    if (
      requiredTags.length > 0 &&
      !requiredTags.every((keyword) =>
        allTags.some((tagName) => normalizeKey(tagName) === keyword),
      )
    ) {
      return false;
    }

    if (qKeyword) {
      const hitTitle = includesIgnoreCase(video.title, qKeyword);
      const hitTag = allTags.some((tagName) =>
        includesIgnoreCase(tagName, qKeyword),
      );
      if (!hitTitle && !hitTag) return false;
    }

    if (titleKeyword && !includesIgnoreCase(video.title, titleKeyword))
      return false;
    if (
      descriptionKeyword &&
      !includesIgnoreCase(video.description, descriptionKeyword)
    )
      return false;
    if (uploaderKeyword && !includesIgnoreCase(video.uploader, uploaderKeyword))
      return false;

    if (
      customTagKeyword &&
      !tagSummary.customTags.some((tagName) =>
        includesIgnoreCase(tagName, customTagKeyword),
      )
    ) {
      return false;
    }

    if (
      systemTagKeyword &&
      !tagSummary.systemTags.some((tagName) =>
        includesIgnoreCase(tagName, systemTagKeyword),
      )
    ) {
      return false;
    }

    const addedAt =
      computeAddedAtFromItems(
        indexes.folderItemsByVideoId.get(videoId) ?? [],
        indexes.activeFoldersById,
        args.folderId,
      ) ?? 0;
    if (args.from !== null && args.from !== undefined && addedAt < args.from)
      return false;
    if (args.to !== null && args.to !== undefined && addedAt > args.to)
      return false;

    return true;
  });

  if (state === cachedState) {
    videoQueryResultCache.set(cacheKey, { revision: stateRevision, ids });
    while (videoQueryResultCache.size > 20) {
      const oldestKey = videoQueryResultCache.keys().next().value as
        | string
        | undefined;
      if (!oldestKey) break;
      videoQueryResultCache.delete(oldestKey);
    }
  }
  return ids;
}

function filterVideoList(state: LocalState, args: VideoListArgs) {
  const indexes = getLocalStateIndexes(state);
  return getVideoIdsForQuery(state, args, indexes)
    .map((videoId) => indexes.videosById.get(videoId))
    .filter((video): video is VideoRecord => Boolean(video))
    .map((video) => mapVideo(state, video, args.folderId, indexes));
}

function queryVideoPage(
  state: LocalState,
  args: VideoListArgs,
  pageRaw: string | null,
  pageSizeRaw: string | null,
) {
  const indexes = getLocalStateIndexes(state);
  const ids = getVideoIdsForQuery(state, args, indexes);
  const page = Math.max(1, toInt(pageRaw, 1));
  const pageSize = Math.max(1, toInt(pageSizeRaw, 30));
  const start = (page - 1) * pageSize;
  const items = ids
    .slice(start, start + pageSize)
    .map((videoId) => indexes.videosById.get(videoId))
    .filter((video): video is VideoRecord => Boolean(video))
    .map((video) => mapVideo(state, video, args.folderId, indexes));
  return {
    items,
    pagination: { page, pageSize, total: ids.length },
  };
}

function listActiveFoldersWithCounts(
  state: LocalState,
  indexes = getLocalStateIndexes(state),
) {
  return activeFolders(state).map((folder) => ({
    ...folder,
    itemCount: indexes.activeFolderItemCountByFolderId.get(folder.id) ?? 0,
  }));
}

function listTagsWithUsageCounts(
  state: LocalState,
  args: {
    page: string | null;
    pageSize: string | null;
    type: string | null;
    search: string;
  },
) {
  const indexes = getLocalStateIndexes(state);
  const usageCountByTagId = new Map<number, Set<number>>();
  for (const edge of state.videoTags) {
    if (!indexes.activeVideoIds.has(edge.videoId)) continue;
    let videoIds = usageCountByTagId.get(edge.tagId);
    if (!videoIds) {
      videoIds = new Set<number>();
      usageCountByTagId.set(edge.tagId, videoIds);
    }
    videoIds.add(edge.videoId);
  }

  const items = state.tags
    .filter((tag) => tag.archivedAt === null)
    .filter((tag) =>
      args.type === "system" || args.type === "custom"
        ? tag.type === args.type
        : true,
    )
    .filter((tag) =>
      args.search ? includesIgnoreCase(tag.name, args.search) : true,
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      usageCount: usageCountByTagId.get(tag.id)?.size ?? 0,
      createdAt: tag.createdAt,
    }));

  return paginate(items, args.page, args.pageSize);
}

function getPlaybackStorageArea(storage?: StorageAreaLike) {
  const resolved =
    storage ?? (chrome.storage?.local as StorageAreaLike | undefined);
  if (!resolved) {
    throw new Error("chrome.storage.local is unavailable");
  }
  return resolved;
}

function normalizeFolderPlaybackSessionRecord(
  session: unknown,
): FolderPlaybackSessionRecord | null {
  const normalized = normalizePlaybackSession(
    session,
  ) as Partial<FolderPlaybackSessionRecord> | null;
  if (!normalized) return null;

  return {
    folderId: Math.max(0, toInt(normalized.folderId, 0)),
    queue: Array.isArray(normalized.queue)
      ? (normalized.queue as FolderPlaybackQueueItem[])
      : [],
    currentIndex: Math.max(0, toInt(normalized.currentIndex, 0)),
    createdAt: toInt(normalized.createdAt, now()),
    updatedAt: toInt(normalized.updatedAt, now()),
  };
}

export function buildFolderPlaybackSessionFromState(
  state: LocalState,
  request: FolderPlaybackRequest = {},
) {
  const folderId = toInt(request.folderId);
  if (folderId <= 0) {
    throw new Error("folderId is required");
  }

  const folder = state.folders.find(
    (item) => item.id === folderId && item.deletedAt === null,
  );
  if (!folder) {
    throw new Error("Folder not found");
  }

  const rawFilters =
    request.filters && typeof request.filters === "object"
      ? (request.filters as Record<string, unknown>)
      : {};
  const videos = filterVideoList(state, {
    includeDeleted: false,
    folderId,
    tags: Array.isArray(request.tags)
      ? request.tags.map((item) => normalizeText(item)).filter(Boolean)
      : [],
    q: normalizeText(request.q),
    title: normalizeText(rawFilters.title),
    description: normalizeText(rawFilters.description),
    uploader: normalizeText(rawFilters.uploader),
    customTag: normalizeText(rawFilters.customTag),
    systemTag: normalizeText(rawFilters.systemTag),
    from: toIntOrNull(rawFilters.from),
    to: toIntOrNull(rawFilters.to),
  });

  const built = buildFolderPlaybackSession(
    videos.map((video) => ({
      ...video,
      videoId: video.id,
      url: normalizeBiliVideoUrl(video.bvidUrl, video.bvid),
    })),
  );

  const queuedAt = now();
  const session = normalizeFolderPlaybackSessionRecord({
    folderId,
    queue: built.queue,
    currentIndex: 0,
    createdAt: queuedAt,
    updatedAt: queuedAt,
  });

  return {
    folderId,
    session: session && session.queue.length > 0 ? session : null,
    firstItem: session?.queue[0] ?? null,
    playable: session?.queue.length ?? 0,
    skippedInvalid: built.skippedInvalid,
    truncated: built.truncated,
  };
}

export async function getStoredFolderPlaybackSession(
  storage?: StorageAreaLike,
) {
  const area = getPlaybackStorageArea(storage);
  const result = await area.get([FOLDER_PLAYBACK_STORAGE_KEY]);
  return normalizeFolderPlaybackSessionRecord(
    result[FOLDER_PLAYBACK_STORAGE_KEY],
  );
}

export async function setStoredFolderPlaybackSession(
  session: unknown,
  storage?: StorageAreaLike,
) {
  const area = getPlaybackStorageArea(storage);
  const normalized = normalizeFolderPlaybackSessionRecord(session);
  if (!normalized) {
    throw new Error("session is required");
  }
  await area.set({
    [FOLDER_PLAYBACK_STORAGE_KEY]: normalized,
  });
  return normalized;
}

export async function updateStoredFolderPlaybackCurrent(
  cursor: FolderPlaybackCursor = {},
  storage?: StorageAreaLike,
) {
  const area = getPlaybackStorageArea(storage);
  const current = await getStoredFolderPlaybackSession(area);
  if (!current) {
    throw new Error("No active playback session");
  }

  const nextIndex = findPlaybackQueueIndex(current.queue, {
    videoId: toIntOrNull(cursor.videoId) ?? undefined,
    bvid: normalizeText(cursor.bvid) || undefined,
  });
  if (nextIndex < 0) {
    throw new Error("Playback item not found in active session");
  }

  const updated = normalizeFolderPlaybackSessionRecord({
    ...current,
    currentIndex: nextIndex,
    updatedAt: now(),
  });
  if (!updated) {
    throw new Error("Failed to update playback session");
  }

  await area.set({
    [FOLDER_PLAYBACK_STORAGE_KEY]: updated,
  });
  return updated;
}

export async function clearStoredFolderPlaybackSession(
  storage?: StorageAreaLike,
) {
  const area = getPlaybackStorageArea(storage);
  await area.remove([FOLDER_PLAYBACK_STORAGE_KEY]);
}

function removeVideoCompletely(state: LocalState, videoId: number) {
  state.videos = state.videos.filter((video) => video.id !== videoId);
  state.folderItems = state.folderItems.filter(
    (item) => item.videoId !== videoId,
  );
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
  if (value.startsWith("http://"))
    return value.replace(/^http:\/\//i, "https://");
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
    if (/^BV[0-9A-Za-z]+$/i.test(token))
      return `${BILI_ORIGIN}/video/${token}/`;
    if (fallback) return fallback;
    if (/^\d+$/.test(token)) return `${BILI_ORIGIN}/video/av${token}/`;
    return `${BILI_ORIGIN}/video/${token}/`;
  }

  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/video/")) return `${BILI_ORIGIN}${value}`;
  if (/^video\//i.test(value)) return `${BILI_ORIGIN}/${value}`;
  if (/^BV[0-9A-Za-z]+$/i.test(value)) return `${BILI_ORIGIN}/video/${value}/`;
  if (/^av\d+$/i.test(value)) return `${BILI_ORIGIN}/video/${value}/`;
  if (/^\d+$/.test(value))
    return fallback || `${BILI_ORIGIN}/video/av${value}/`;
  if (/^http:\/\//i.test(value))
    return value.replace(/^http:\/\//i, "https://");
  if (/^https?:\/\//i.test(value)) return value;

  return fallback || value;
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
  const normalizedDateText =
    text.includes(" ") && !text.includes("T") ? text.replace(" ", "T") : text;
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
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toMillis(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1e12) return Math.trunc(parsed);
  return Math.trunc(parsed * 1000);
}

function resolveRemoteFavoriteAddedAt(
  rawFavTime: unknown,
  page: number,
  pageSize: number,
  indexInPage: number,
) {
  const parsed = Number(rawFavTime);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed > 1e12 ? Math.trunc(parsed) : Math.trunc(parsed * 1000);
  }

  const remoteIndex = Math.max(
    0,
    (Math.max(1, page) - 1) * pageSize + indexInPage,
  );
  return REMOTE_FAVORITE_ORDER_FALLBACK_BASE_MS - remoteIndex;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBiliRequestGap(stage: SyncFetchStage) {
  if (stage === "folderVideos") {
    // Page loop already waits 500ms between pages, keep extra gap at 0.
    return 0;
  }
  return (
    BILI_META_API_GAP_MS +
    Math.floor(Math.random() * BILI_META_API_GAP_JITTER_MS)
  );
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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutLabel = "Bilibili API request",
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError") ||
      (error &&
        typeof error === "object" &&
        "name" in error &&
        (error as { name?: unknown }).name === "AbortError")
    ) {
      throw new Error(`${timeoutLabel} timeout (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromUpdateMirrors(
  urls: string[],
  init: RequestInit,
  timeoutLabel: string,
) {
  const attempts = urls.map(async (url) => {
    const response = await fetchWithTimeout(
      url,
      init,
      EXTENSION_UPDATE_REQUEST_TIMEOUT_MS,
      timeoutLabel,
    );
    if (!response.ok) {
      throw new Error(`${timeoutLabel} failed (${response.status})`);
    }
    return response;
  });

  try {
    return await Promise.any(attempts);
  } catch (error) {
    if (error instanceof AggregateError) {
      const messages = error.errors
        .map((item) => (item instanceof Error ? item.message : String(item)))
        .filter(Boolean);
      throw new Error(messages.join("; ") || `${timeoutLabel} failed`);
    }
    throw error;
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function listActiveArticleFoldersWithCounts(state: LocalState) {
  const activeIds = new Set(
    activeArticleFolders(state).map((folder) => folder.id),
  );
  const countByFolderId = new Map<number, number>();
  for (const article of state.articles ?? []) {
    if (article.deletedAt != null) continue;
    for (const folderId of article.folderIds ?? []) {
      if (!activeIds.has(folderId)) continue;
      countByFolderId.set(folderId, (countByFolderId.get(folderId) ?? 0) + 1);
    }
  }
  return activeArticleFolders(state).map((folder) => ({
    ...folder,
    itemCount: countByFolderId.get(folder.id) ?? 0,
  }));
}

function parseRetryAfterMs(value: unknown, referenceTime = now()) {
  const text = normalizeText(value);
  if (!text) return null;
  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const target = Date.parse(text);
  if (!Number.isFinite(target)) return null;
  return Math.max(0, target - referenceTime);
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

type BiliFollowingUpsListData = {
  list?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  cards?: Array<Record<string, unknown>>;
  total?: unknown;
};

function resolveFolderHasMore(
  payload: BiliFolderMediaListData,
  page: number,
  pageSize: number,
  pageMediaCount: number,
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
  folderGroups?: Record<string, string>;
  customTags: string[];
  systemTags: string[];
};

type ImportCommentRow = NormalizedFavoriteComment & {
  savedAt: number;
  updatedAt: number;
};

type ImportArticleRow = SharedFavoriteArticleRecord & {
  folderNames: string[];
  folderGroups?: Record<string, string>;
};

type ImportFollowedUpRow = NormalizedFollowedUpRecord;

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
      .filter(Boolean),
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

export function parseImportRows(format: "json" | "csv", content: string) {
  const nowTs = now();
  const rows: ImportVideoRow[] = [];
  const comments: ImportCommentRow[] = [];
  const articles: ImportArticleRow[] = [];
  const followedUps: ImportFollowedUpRow[] = [];
  let skipped = 0;
  let commentsSkipped = 0;

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
      partition: normalizeVideoPartition(row.partition),
      folders: uniqueTextList((row.folders ?? []) as unknown[]),
      folderGroups: row.folderGroups ?? {},
      customTags: uniqueTextList((row.customTags ?? []) as unknown[]),
      systemTags: uniqueTextList((row.systemTags ?? []) as unknown[]),
    });
  };

  if (format === "json") {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const jsonVideos = Array.isArray(parsed?.videos)
      ? (parsed.videos as Array<Record<string, unknown>>)
      : [];
    const jsonFolders = Array.isArray(parsed?.folders)
      ? (parsed.folders as Array<Record<string, unknown>>)
      : [];
    const jsonArticleFolders = Array.isArray(parsed?.articleFolders)
      ? (parsed.articleFolders as Array<Record<string, unknown>>)
      : [];
    const jsonFolderItems = Array.isArray(parsed?.folderItems)
      ? (parsed.folderItems as Array<Record<string, unknown>>)
      : [];
    const jsonTags = Array.isArray(parsed?.tags)
      ? (parsed.tags as Array<Record<string, unknown>>)
      : [];
    const jsonVideoTags = Array.isArray(parsed?.videoTags)
      ? (parsed.videoTags as Array<Record<string, unknown>>)
      : [];
    const jsonComments = Array.isArray(parsed?.comments)
      ? (parsed.comments as Array<Record<string, unknown>>)
      : [];
    const jsonArticles = Array.isArray(parsed?.articles)
      ? (parsed.articles as Array<Record<string, unknown>>)
      : [];
    const jsonFollowedUps = Array.isArray(parsed?.followedUps)
      ? (parsed.followedUps as Array<Record<string, unknown>>)
      : [];

    const folderNameById = new Map<number, string>();
    const folderGroupByName = new Map<string, string>();
    for (const folder of jsonFolders) {
      const id = Number(folder.id);
      const name = normalizeText(folder.name);
      if (Number.isFinite(id) && id > 0 && name) {
        folderNameById.set(Math.trunc(id), name);
        const groupName = normalizeText(folder.groupName);
        if (groupName) folderGroupByName.set(normalizeKey(name), groupName);
      }
    }
    const articleFolderNameById = new Map<number, string>();
    const articleFolderGroupByName = new Map<string, string>();
    for (const folder of jsonArticleFolders) {
      const id = Number(folder.id);
      const name = normalizeText(folder.name);
      if (Number.isFinite(id) && id > 0 && name) {
        articleFolderNameById.set(Math.trunc(id), name);
        const groupName = normalizeText(folder.groupName);
        if (groupName)
          articleFolderGroupByName.set(normalizeKey(name), groupName);
      }
    }

    for (const followedUp of jsonFollowedUps) {
      const normalized = normalizeFollowedUpRecord(followedUp);
      if (normalized) followedUps.push(normalized);
    }

    for (const comment of jsonComments) {
      try {
        const normalized = normalizeFavoriteComment(comment, nowTs);
        const savedAt =
          parseTimestampInput(comment.savedAt ?? comment.savedAtText) ?? nowTs;
        comments.push({
          ...normalized,
          savedAt,
          updatedAt:
            parseTimestampInput(comment.updatedAt ?? comment.updatedAtText) ??
            savedAt,
        });
      } catch {
        commentsSkipped += 1;
      }
    }

    for (const article of jsonArticles) {
      try {
        const normalized = normalizeFavoriteArticle(article, nowTs);
        const explicitFolderNames = Array.isArray(article.folders)
          ? uniqueTextList(article.folders)
          : [];
        const folderNames =
          explicitFolderNames.length > 0
            ? explicitFolderNames
            : normalized.folderIds
                .map(
                  (folderId) =>
                    articleFolderNameById.get(folderId) ||
                    folderNameById.get(folderId) ||
                    "",
                )
                .filter(Boolean);
        articles.push({
          ...normalized,
          folderNames,
          folderGroups: Object.fromEntries(
            folderNames.flatMap((name) => {
              const group = articleFolderGroupByName.get(normalizeKey(name));
              return group ? [[name, group]] : [];
            }),
          ),
        });
      } catch {
        // Ignore malformed article rows while preserving the rest of the backup.
      }
    }

    const tagById = new Map<
      number,
      { name: string; type: "system" | "custom" }
    >();
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

      const addedAt = parseTimestampInput(
        relation.addedAt ?? relation.addedAtText,
      );
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
      if (
        !Number.isFinite(videoId) ||
        videoId <= 0 ||
        !Number.isFinite(tagId) ||
        tagId <= 0
      ) {
        continue;
      }
      const tag = tagById.get(Math.trunc(tagId));
      if (!tag) continue;
      const key = Math.trunc(videoId);
      const target =
        tag.type === "system" ? systemTagsByVideoId : customTagsByVideoId;
      const bucket = target.get(key) ?? [];
      if (!bucket.includes(tag.name)) bucket.push(tag.name);
      target.set(key, bucket);
    }

    for (const video of jsonVideos) {
      const videoId = Number(video.id);
      const key =
        Number.isFinite(videoId) && videoId > 0 ? Math.trunc(videoId) : -1;
      const favoriteAt =
        addedAtByVideoId.get(key) ??
        parseTimestampInput(
          video.favoriteAt ??
            video.favoriteAtText ??
            video.addedAt ??
            video.addedAtText,
        ) ??
        nowTs;
      pushRow({
        bvid: normalizeText(video.bvid),
        title: normalizeText(video.title),
        coverUrl: normalizeText(video.coverUrl),
        uploader: normalizeText(video.uploader),
        uploaderSpaceUrl: normalizeText(
          video.uploaderSpaceUrl || video.uploaderUrl,
        ),
        description: normalizeText(video.description),
        publishAt: parseTimestampInput(video.publishAt ?? video.publishAtText),
        bvidUrl: normalizeText(video.bvidUrl),
        isInvalid: Boolean(video.isInvalid),
        partition: normalizeVideoPartition(video.partition),
        addedAt: favoriteAt,
        folders: foldersByVideoId.get(key) ?? ["Imported"],
        folderGroups: Object.fromEntries(
          (foldersByVideoId.get(key) ?? []).flatMap((name) => {
            const group = folderGroupByName.get(normalizeKey(name));
            return group ? [[name, group]] : [];
          }),
        ),
        customTags: customTagsByVideoId.get(key) ?? [],
        systemTags: systemTagsByVideoId.get(key) ?? [],
      });
    }
    return { rows, skipped, comments, commentsSkipped, articles, followedUps };
  }

  const csvRows = parseCsvRows(content);
  if (csvRows.length === 0)
    return { rows, skipped, comments, commentsSkipped, articles, followedUps };
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
      publishAt: parseTimestampInput(
        pick(row, "publishAtMs") || pick(row, "publishAt"),
      ),
      bvidUrl: pick(row, "bvidUrl"),
      isInvalid: pick(row, "isInvalid") === "1",
      partition: pick(row, "partition"),
      addedAt:
        parseTimestampInput(
          pick(row, "favoriteAtMs") ||
            pick(row, "favoriteAt") ||
            pick(row, "addedAtMs") ||
            pick(row, "addedAt"),
        ) ?? nowTs,
      folders: parsePipeList(pick(row, "folders")),
      customTags: parsePipeList(pick(row, "customTags")),
      systemTags: parsePipeList(pick(row, "systemTags")),
    });
  }
  return { rows, skipped, comments, commentsSkipped, articles, followedUps };
}

class BiliRequestError extends Error {
  status: number;
  stage: SyncFetchStage;
  source: FetchSource;
  url: string;
  retryAfterMs: number | null;

  constructor(params: {
    status: number;
    stage: SyncFetchStage;
    source: FetchSource;
    url: string;
    message: string;
    retryAfterMs?: number | null;
  }) {
    super(params.message);
    this.name = "BiliRequestError";
    this.status = params.status;
    this.stage = params.stage;
    this.source = params.source;
    this.url = params.url;
    this.retryAfterMs = params.retryAfterMs ?? null;
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
  url: string,
) {
  if (error instanceof BiliRequestError) return error;
  return new BiliRequestError({
    status: 500,
    stage,
    source,
    url,
    message: error instanceof Error ? error.message : String(error),
  });
}

function formatBiliRequestError(error: BiliRequestError) {
  return `[${stageLabel(error.stage)}][${error.source}] ${error.message}`;
}

function toBasicAuthHeader(username: string, password: string) {
  const token = btoa(`${username}:${password}`);
  return `Basic ${token}`;
}

function buildWebDavFileUrl(meta: WebDavMeta, fileName: string) {
  const safeFileName = normalizeText(fileName);
  if (!safeFileName) throw new Error("WebDAV file name is required");
  const baseUrl = normalizeWebDavBaseUrl(meta.baseUrl);
  const path = normalizeWebDavRemotePath(meta.remotePath);
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const encodedFileName = encodeURIComponent(safeFileName);
  if (!encodedPath) {
    return `${baseUrl}/${encodedFileName}`;
  }
  return `${baseUrl}/${encodedPath}/${encodedFileName}`;
}

export function buildWebDavCollectionUrls(
  baseUrlInput: unknown,
  remotePathInput: unknown,
) {
  const baseUrl = normalizeWebDavBaseUrl(baseUrlInput);
  const path = normalizeWebDavRemotePath(remotePathInput);
  if (!path) return [];

  const segments = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const urls: string[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const encodedPath = currentPath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    urls.push(`${baseUrl}/${encodedPath}`);
  }

  return urls;
}

async function requestWebDav(
  meta: WebDavMeta,
  method: "GET" | "PUT" | "DELETE" | "HEAD" | "MKCOL",
  fileName: string,
  body: string | null = null,
) {
  const baseUrl = normalizeWebDavBaseUrl(meta.baseUrl);
  if (!baseUrl) throw new Error("WebDAV server URL is not configured");
  const username = normalizeText(meta.username);
  if (!username) throw new Error("WebDAV username is not configured");
  if (!meta.password) throw new Error("WebDAV password is not configured");

  const url = buildWebDavFileUrl(meta, fileName);
  const headers: Record<string, string> = {
    Authorization: toBasicAuthHeader(username, meta.password),
  };
  if (method === "PUT") {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }
  const response = await fetchWithTimeout(
    url,
    {
      method,
      headers,
      body: method === "PUT" ? (body ?? "") : undefined,
    },
    WEBDAV_REQUEST_TIMEOUT_MS,
    "WebDAV request",
  );
  return response;
}

async function requestWebDavCollection(
  meta: WebDavMeta,
  method: "MKCOL",
  collectionUrl: string,
) {
  const username = normalizeText(meta.username);
  if (!username) throw new Error("WebDAV username is not configured");
  if (!meta.password) throw new Error("WebDAV password is not configured");

  const response = await fetchWithTimeout(
    collectionUrl,
    {
      method,
      headers: {
        Authorization: toBasicAuthHeader(username, meta.password),
      },
    },
    WEBDAV_REQUEST_TIMEOUT_MS,
    "WebDAV request",
  );
  return response;
}

async function ensureWebDavRemoteDirectory(meta: WebDavMeta) {
  const collectionUrls = buildWebDavCollectionUrls(
    meta.baseUrl,
    meta.remotePath,
  );
  for (const collectionUrl of collectionUrls) {
    const response = await requestWebDavCollection(
      meta,
      "MKCOL",
      collectionUrl,
    );
    if ([200, 201, 204, 301, 302, 405].includes(response.status)) {
      continue;
    }
    throw new Error(`WebDAV directory preparation failed (${response.status})`);
  }
}

function getAllCookies(
  api: CookiesApi,
  details: { domain?: string; storeId?: string },
): Promise<CookieLike[]> {
  return new Promise<CookieLike[]>((resolve, reject) => {
    const getAll = api.getAll;
    if (!getAll) {
      resolve([]);
      return;
    }
    let settled = false;
    const finish = (cookies: unknown) => {
      if (settled) return;
      settled = true;
      resolve(Array.isArray(cookies) ? cookies : []);
    };

    try {
      const maybePromise = getAll(details, (cookies) => finish(cookies));
      if (
        maybePromise &&
        typeof (maybePromise as Promise<CookieLike[]>).then === "function"
      ) {
        (maybePromise as Promise<CookieLike[]>)
          .then((cookies) => finish(cookies))
          .catch((error) => {
            if (settled) return;
            settled = true;
            reject(error);
          });
      }
    } catch (error) {
      if (settled) return;
      settled = true;
      reject(error);
    }
  });
}

async function findBilibiliTabContext() {
  const tabs = await chrome.tabs.query({
    url: ["https://*.bilibili.com/*", "http://*.bilibili.com/*"],
  });
  return (
    tabs.find((tab) => tab.active && typeof tab.id === "number") ??
    tabs.find((tab) => typeof tab.id === "number") ??
    null
  );
}

async function getActiveBilibiliCookieStoreId() {
  try {
    const tab = await findBilibiliTabContext();
    const storeId = (tab as { cookieStoreId?: unknown } | null)?.cookieStoreId;
    return typeof storeId === "string" && storeId.trim() ? storeId.trim() : "";
  } catch {
    return "";
  }
}

async function getBiliCookieHeader(forceRefresh = false) {
  const nowTs = Date.now();
  const storeId = await getActiveBilibiliCookieStoreId();
  const cacheKey = storeId || "default";
  const cached = biliCookieHeaderCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > nowTs) return cached.value;

  const cookiesApi =
    (globalThis as { chrome?: { cookies?: { getAll?: CookiesApi["getAll"] } } })
      .chrome?.cookies ??
    (
      globalThis as {
        browser?: { cookies?: { getAll?: CookiesApi["getAll"] } };
      }
    ).browser?.cookies;
  if (!cookiesApi?.getAll) {
    return "";
  }

  const cookies = await getAllCookies(
    cookiesApi,
    storeId ? { domain: "bilibili.com", storeId } : { domain: "bilibili.com" },
  );
  const validPairs = cookies
    .map((item) => ({
      name: normalizeText(item.name),
      value: normalizeText(item.value),
    }))
    .filter((item) => item.name && item.value);
  const hasSessData = validPairs.some((item) => item.name === "SESSDATA");
  if (!hasSessData) {
    return "";
  }

  const header = validPairs
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
  biliCookieHeaderCache.set(cacheKey, {
    value: header,
    expiresAt: nowTs + 90_000,
  });
  return header;
}

async function sendMessageToTab<T = unknown>(
  tabId: number,
  message: unknown,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(
          new Error(runtimeError.message || "Failed to communicate with tab"),
        );
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
    files: ["content-scripts/sync-bridge.js"],
  });
}

async function findBilibiliTabId() {
  const tab = await findBilibiliTabContext();
  return typeof tab?.id === "number" ? tab.id : null;
}

async function fetchBiliJsonViaPageContext<T>(
  url: string,
  stage: SyncFetchStage,
): Promise<T> {
  const tabId = await findBilibiliTabId();
  if (!tabId) {
    throw new BiliRequestError({
      status: 428,
      stage,
      source: "page",
      url,
      message:
        "No Bilibili tab found for page-context request. Open any Bilibili page and retry.",
    });
  }

  let result: TabBridgePayload;
  try {
    result = await sendMessageToTab<TabBridgePayload>(tabId, {
      type: PAGE_FETCH_MESSAGE_TYPE,
      url,
    });
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw new BiliRequestError({
        status: 403,
        stage,
        source: "page",
        url,
        message: error instanceof Error ? error.message : String(error),
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
            : "Failed to inject page bridge script",
      });
    }
    result = await sendMessageToTab<TabBridgePayload>(tabId, {
      type: PAGE_FETCH_MESSAGE_TYPE,
      url,
    });
  }

  if (!result || result.ok !== true) {
    const status = Number(result?.status ?? 500);
    const errorMessage =
      normalizeText(result?.error) ||
      `Bilibili page-context request failed (${status})`;
    throw new BiliRequestError({
      status,
      stage,
      source: "page",
      url,
      message: errorMessage,
    });
  }

  const payload = result.payload as BiliApiResponse<T>;
  if (!payload || typeof payload !== "object") {
    throw new BiliRequestError({
      status: Number(result.status || 500),
      stage,
      source: "page",
      url,
      message: "Bilibili page-context response is invalid",
    });
  }

  if (payload.code !== 0) {
    throw new BiliRequestError({
      status: Number(result.status || 500),
      stage,
      source: "page",
      url,
      message:
        payload.message || payload.msg || "Bilibili API returned non-zero code",
    });
  }

  return payload.data;
}

async function fetchBiliJsonByExtension<T>(
  url: string,
  stage: SyncFetchStage,
  options: BiliExtensionRequestOptions = {},
): Promise<T> {
  const maxAttempts = stage === "folderVideos" ? 1 : 3;
  let lastError: BiliRequestError | null = null;
  let manualCookieHeader = await getBiliCookieHeader();
  if (!manualCookieHeader) {
    throw new BiliRequestError({
      status: 401,
      stage,
      source: "extension",
      url,
      message:
        "SESSDATA cookie is missing. Please login to Bilibili in this browser.",
    });
  }
  let allowManualCookieHeader = true;
  const method = options.method ?? "GET";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        Referer: `${BILI_ORIGIN}/`,
        Origin: BILI_ORIGIN,
      };
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          headers[key] = value;
        }
      }
      if (allowManualCookieHeader && manualCookieHeader) {
        headers.Cookie = manualCookieHeader;
      }
      await throttleBiliRequest(stage);
      const response = await fetchWithTimeout(
        url,
        {
          method,
          credentials: "include",
          headers,
          body: options.body ?? undefined,
        },
        BILI_FETCH_TIMEOUT_MS,
      );

      if (!response.ok) {
        const retryAfterMs = parseRetryAfterMs(
          response.headers.get("Retry-After"),
        );
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
            message: `Bilibili API request failed (${response.status})`,
            retryAfterMs,
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
          message: `Bilibili API request failed (${response.status})`,
          retryAfterMs,
        });
      }

      const payload = (await response.json()) as BiliApiResponse<T>;
      if (payload.code !== 0) {
        throw new BiliRequestError({
          status: payload.code === -412 ? 412 : response.status,
          stage,
          source: "extension",
          url,
          message:
            payload.message ||
            payload.msg ||
            "Bilibili API returned non-zero code",
        });
      }

      return payload.data;
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : String(error ?? "");
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
            message: "Bilibili API request timeout",
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
      message: "Bilibili API request failed",
    })
  );
}

async function fetchBiliJson<T>(
  url: string,
  stage: SyncFetchStage,
): Promise<T> {
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
        message: "Bilibili API request failed",
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
      message: `${formatBiliRequestError(extErr)} | fallback failed: ${formatBiliRequestError(pageErr)}`,
    });
  }
}

type RemoteFolder = { remoteId: number; title: string; mediaCount: number };
let remoteFoldersCache: { expiresAt: number; items: RemoteFolder[] } | null =
  null;

function pickRemoteFolderId(raw: Record<string, unknown>) {
  const id = toInt(raw.id ?? raw.media_id ?? 0, 0);
  return id > 0 ? id : 0;
}

async function fetchRemoteFoldersFromBilibili(forceRefresh = false) {
  const nowTs = Date.now();
  if (
    !forceRefresh &&
    remoteFoldersCache &&
    remoteFoldersCache.expiresAt > nowTs
  ) {
    return remoteFoldersCache.items;
  }

  const nav = await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(
    BILI_NAV_API,
    "nav",
  );
  const mid = toInt(nav.mid ?? 0, 0);
  if (!nav.isLogin || mid <= 0) {
    throw new Error("Please login to Bilibili in current browser first");
  }

  const folderData = await fetchBiliJson<{
    list?: Array<Record<string, unknown>>;
  }>(`${BILI_FOLDERS_API}?up_mid=${mid}`, "folders");
  const items = (folderData.list ?? [])
    .map((item) => ({
      remoteId: pickRemoteFolderId(item),
      title: normalizeText(item.title),
      mediaCount: toInt(
        (item as { media_count?: unknown }).media_count ?? 0,
        0,
      ),
    }))
    .filter((item) => item.remoteId > 0 && item.title) as RemoteFolder[];
  remoteFoldersCache = {
    items,
    expiresAt: nowTs + REMOTE_FOLDERS_CACHE_TTL_MS,
  };
  return items;
}

function toAid(value: unknown) {
  const parsed = toInt(value, 0);
  return parsed > 0 ? parsed : 0;
}

async function resolveFavoriteMediaBvid(
  media: Record<string, unknown>,
): Promise<{
  bvid: string;
  aid: number | null;
  reason: string | null;
  riskBlocked: boolean;
  error?: unknown;
}> {
  const directBvid = normalizeText(media.bvid ?? media.bv_id);
  const aid = toAid(media.id ?? media.aid);
  if (directBvid) {
    return {
      bvid: directBvid,
      aid: aid || null,
      reason: null as string | null,
      riskBlocked: false,
    };
  }
  if (!aid) {
    return {
      bvid: "",
      aid: null,
      reason: "Remote favorite has neither BV id nor aid",
      riskBlocked: false,
    };
  }
  try {
    const detail = await fetchBiliJson<Record<string, unknown>>(
      `${BILI_VIEW_API}?aid=${encodeURIComponent(String(aid))}`,
      "folderVideos",
    );
    const resolvedBvid = normalizeText(detail.bvid);
    if (resolvedBvid) {
      return {
        bvid: resolvedBvid,
        aid,
        reason: null as string | null,
        riskBlocked: false,
      };
    }
    return {
      bvid: "",
      aid,
      reason: "Bilibili view response did not include a BV id",
      riskBlocked: false,
    };
  } catch (error) {
    return {
      bvid: "",
      aid,
      reason: isBiliRequestError(error)
        ? formatBiliRequestError(error)
        : error instanceof Error
          ? error.message
          : String(error),
      riskBlocked: isBiliRequestError(error)
        ? error.status === 412 ||
          isRiskControlError(formatBiliRequestError(error))
        : isRiskControlError(
            error instanceof Error ? error.message : String(error),
          ),
      error,
    };
  }
}

function upsertVideoFromRemoteDetail(
  state: LocalState,
  detail: Record<string, unknown>,
) {
  const bvid = normalizeText(detail?.bvid);
  if (!bvid) return null;
  const timestamp = now();
  const existing = state.videos.find(
    (video) => normalizeKey(video.bvid) === normalizeKey(bvid),
  );
  const publishAtRaw = toInt(detail?.pubdate, 0);
  const publishAt = publishAtRaw > 0 ? publishAtRaw * 1000 : null;
  const partition = normalizeVideoPartition(detail?.tname);
  const owner = (detail?.owner || {}) as { name?: unknown; mid?: unknown };
  const uploader = normalizeText(owner.name) || "Unknown uploader";
  const uploaderMid = toInt(owner.mid, 0);
  const video: VideoRecord = existing || {
    id: state.counters.video++,
    bvid,
    title: normalizeText(detail?.title) || bvid,
    coverUrl: normalizeCoverUrl(detail?.pic),
    uploader,
    uploaderSpaceUrl: normalizeBiliSpaceUrl(uploaderMid),
    description: normalizeText(detail?.desc),
    partition,
    publishAt,
    bvidUrl: normalizeBiliVideoUrl("", bvid),
    isInvalid: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  video.bvid = bvid;
  video.title = normalizeText(detail?.title) || bvid;
  video.coverUrl = normalizeCoverUrl(detail?.pic);
  video.uploader = uploader;
  video.uploaderSpaceUrl = normalizeBiliSpaceUrl(uploaderMid);
  video.description = normalizeText(detail?.desc);
  video.partition = partition;
  video.publishAt = publishAt;
  video.bvidUrl = normalizeBiliVideoUrl("", bvid);
  video.isInvalid = false;
  video.deletedAt = null;
  video.updatedAt = timestamp;

  if (!existing) {
    state.videos.push(video);
  }
  return video;
}

function extractMediaTagNames(media: Record<string, unknown>) {
  const names: string[] = [];
  const fromPayload = Array.isArray(media.tags) ? media.tags : [];
  for (const rawTag of fromPayload) {
    const candidate =
      typeof rawTag === "string"
        ? rawTag
        : ((
            rawTag as { tag_name?: string; tag_name_v2?: string; name?: string }
          ).tag_name ??
          (rawTag as { tag_name?: string; tag_name_v2?: string; name?: string })
            .tag_name_v2 ??
          (rawTag as { tag_name?: string; tag_name_v2?: string; name?: string })
            .name);
    const tagName = normalizeText(candidate);
    if (!tagName) continue;
    const lowered = tagName.toLowerCase();
    if (BLOCKED_SYSTEM_TAGS.has(lowered)) continue;
    if (!names.some((item) => normalizeKey(item) === lowered))
      names.push(tagName);
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
    "folderVideos",
  );
  const names = (Array.isArray(data) ? data : [])
    .map((item) =>
      normalizeText(
        (item as { tag_name?: string; tag_name_v2?: string; name?: string })
          .tag_name ??
          (item as { tag_name?: string; tag_name_v2?: string; name?: string })
            .tag_name_v2 ??
          (item as { tag_name?: string; tag_name_v2?: string; name?: string })
            .name,
      ),
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
    (tag) =>
      tag.archivedAt === null && normalizeKey(tag.name) === normalizeKey(name),
  );
  if (existing) return existing;

  const created: TagRecord = {
    id: state.counters.tag++,
    name,
    type: "system",
    createdAt: now(),
    archivedAt: null,
  };
  state.tags.push(created);
  return created;
}

function getSystemTagIdSet(state: LocalState) {
  return new Set(
    state.tags
      .filter((tag) => tag.archivedAt === null && tag.type === "system")
      .map((tag) => tag.id),
  );
}

function getVideoIdSetWithSystemTags(state: LocalState) {
  const systemTagIds = getSystemTagIdSet(state);
  return new Set(
    state.videoTags
      .filter((relation) => systemTagIds.has(relation.tagId))
      .map((relation) => relation.videoId),
  );
}

function ensureTagEnrichmentMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = {
      tagEnrichment: defaultTagEnrichmentMeta(),
      bidirectionalSync: defaultBidirectionalSyncMeta(),
      webdav: defaultWebDavMeta(),
      stage3Reconcile: defaultStage3ReconcileMeta(),
      favoritesJob: defaultFavoritesSyncJobMeta(),
    };
  }
  if (!state.syncMeta.tagEnrichment) {
    state.syncMeta.tagEnrichment = defaultTagEnrichmentMeta();
  }
  if (!state.syncMeta.webdav) {
    state.syncMeta.webdav = defaultWebDavMeta();
  }
  if (!state.syncMeta.stage3Reconcile) {
    state.syncMeta.stage3Reconcile = defaultStage3ReconcileMeta();
  }
  return state.syncMeta.tagEnrichment;
}

function ensureBidirectionalSyncMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = {
      tagEnrichment: defaultTagEnrichmentMeta(),
      bidirectionalSync: defaultBidirectionalSyncMeta(),
      webdav: defaultWebDavMeta(),
      stage3Reconcile: defaultStage3ReconcileMeta(),
      favoritesJob: defaultFavoritesSyncJobMeta(),
    };
  }
  if (!state.syncMeta.bidirectionalSync) {
    state.syncMeta.bidirectionalSync = defaultBidirectionalSyncMeta();
  }
  if (!state.syncMeta.webdav) {
    state.syncMeta.webdav = defaultWebDavMeta();
  }
  if (!state.syncMeta.stage3Reconcile) {
    state.syncMeta.stage3Reconcile = defaultStage3ReconcileMeta();
  }
  // Local->Bilibili write-back has been retired; keep it hard-disabled in persisted state.
  state.syncMeta.bidirectionalSync.localToBiliEnabled = false;
  return state.syncMeta.bidirectionalSync;
}

function normalizeAiBaseUrl(rawUrl: unknown) {
  const text = normalizeText(rawUrl);
  if (!text) return "";
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error("AI base URL is invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("AI base URL must start with http:// or https://");
  }
  return parsed.toString().replace(/\/+$/, "");
}

function ensureAiMeta(state: LocalState) {
  const normalized = normalizeAiState(state.ai, now());
  state.ai = normalized;
  state.ai.provider = normalizeAiProvider(state.ai.provider);
  state.ai.customProviderName = normalizeText(state.ai.customProviderName);
  state.ai.baseUrl = normalizeText(state.ai.baseUrl);
  state.ai.apiKey = String(state.ai.apiKey ?? "");
  state.ai.model = normalizeText(state.ai.model);
  state.ai.enabled = Boolean(state.ai.enabled);
  return state.ai;
}

function getAiSettings(meta: AiMeta): AiSettingsResponse {
  return maskApiKeyStateForResponse(meta);
}

function applyAiSettingsPatch(meta: AiMeta, body: Record<string, unknown>) {
  let configChanged = false;

  if (Object.prototype.hasOwnProperty.call(body, "provider")) {
    meta.provider = normalizeAiProvider(body.provider);
    configChanged = true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "customProviderName")) {
    meta.customProviderName = normalizeText(body.customProviderName);
    configChanged = true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "baseUrl")) {
    meta.baseUrl = normalizeAiProviderBaseUrl(
      meta.provider,
      normalizeAiBaseUrl(body.baseUrl),
    );
    configChanged = true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "apiKey")) {
    meta.apiKey = String(body.apiKey ?? "").trim();
    configChanged = true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "model")) {
    meta.model = normalizeText(body.model);
    configChanged = true;
  }
  if (Object.prototype.hasOwnProperty.call(body, "enabled")) {
    meta.enabled = Boolean(body.enabled);
  }

  if (configChanged) {
    meta.lastTestAt = null;
    meta.lastTestOk = false;
    meta.lastError = null;
  }
}

function validateAiSettings(meta: AiMeta) {
  if (!meta.baseUrl) {
    throw new Error("AI base URL is required");
  }
  if (!meta.model) {
    throw new Error("AI model is required");
  }
  if (!meta.apiKey) {
    throw new Error("AI API key is required");
  }
}

function sameAiOrganizerSettings(meta: AiMeta, task: AiOrganizerTaskRecord) {
  const normalizeUrl = (provider: string, value: string) =>
    normalizeAiProviderBaseUrl(provider, value)
      .replace(/\/+$/, "")
      .toLowerCase();
  return (
    normalizeKey(meta.provider) === normalizeKey(task.provider) &&
    normalizeKey(meta.model) === normalizeKey(task.model) &&
    normalizeUrl(meta.provider, meta.baseUrl) ===
      normalizeUrl(task.provider, task.baseUrl)
  );
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function getFolderAiAnalysis(state: LocalState, folderId: number) {
  const folderRecord = ensureAiMeta(state).folderAnalyses.find(
    (item) => item.folderId === folderId,
  );
  if (!folderRecord) return null;
  return {
    ...folderRecord,
    videos: ensureAiMeta(state).videoAnalyses.filter(
      (item) => item.folderId === folderId,
    ),
  };
}

function writeFolderAiAnalysis(
  state: LocalState,
  snapshot:
    | (FolderAiAnalysisRecord & { videos: VideoAiAnalysisRecord[] })
    | null,
) {
  const aiMeta = ensureAiMeta(state);
  if (!snapshot) return null;

  aiMeta.folderAnalyses = aiMeta.folderAnalyses.filter(
    (item) => item.folderId !== snapshot.folderId,
  );
  aiMeta.videoAnalyses = aiMeta.videoAnalyses.filter(
    (item) => item.folderId !== snapshot.folderId,
  );
  aiMeta.folderAnalyses.push({
    folderId: snapshot.folderId,
    status: snapshot.status,
    lastError: snapshot.lastError,
    startedAt: snapshot.startedAt,
    finishedAt: snapshot.finishedAt,
    updatedAt: snapshot.updatedAt,
    provider: snapshot.provider,
    model: snapshot.model,
  });
  aiMeta.videoAnalyses.push(...snapshot.videos);
  aiMeta.updatedAt = now();
  return getFolderAiAnalysis(state, snapshot.folderId);
}

async function runFolderAiCategoriesInState(
  state: LocalState,
  folderId: number,
) {
  const aiMeta = ensureAiMeta(state);
  if (!aiMeta.enabled) {
    throw new Error("AI categorization is disabled");
  }
  validateAiSettings(aiMeta);

  const input = buildFolderCategorizationInput(state, folderId);
  const folderRecord = (await runFolderAiCategories({
    folderId,
    input,
    provider: aiMeta.provider,
    model: aiMeta.model,
    now,
    classifyVideo: async (
      _context: unknown,
      video: (typeof input.videos)[number],
    ) => categorizeFolderVideo(aiMeta, input, video),
  })) as FolderAiAnalysisRecord & { videos: VideoAiAnalysisRecord[] };

  const previousAnalysis = getFolderAiAnalysis(state, folderId);
  return writeFolderAiAnalysis(
    state,
    applyFolderCategoryAttempt(previousAnalysis, folderRecord),
  );
}

function normalizeAiOrganizerTask(raw: unknown): AiOrganizerTaskRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<AiOrganizerTaskRecord>;
  const id = normalizeText(source.id);
  if (!id) return null;
  const validStages = new Set<AiOrganizerStage>([
    "planning",
    "classifying",
    "ready",
    "failed",
    "cancelled",
    "completed",
    "undone",
  ]);
  const stage = validStages.has(source.stage as AiOrganizerStage)
    ? (source.stage as AiOrganizerStage)
    : "failed";
  const timestamp = now();
  return {
    version: 1,
    id,
    stage,
    paused: Boolean(source.paused),
    config: normalizeAiOrganizerConfig(source.config),
    sourceHash: normalizeText(source.sourceHash),
    sourceVideoIds: Array.isArray(source.sourceVideoIds)
      ? source.sourceVideoIds
          .map((item) => toInt(item))
          .filter((item) => item > 0)
      : [],
    sourceFolderName: normalizeText(source.sourceFolderName) || null,
    total: Math.max(0, toInt(source.total)),
    skippedInvalid: Math.max(0, toInt(source.skippedInvalid)),
    previousAiRelationCount: Math.max(0, toInt(source.previousAiRelationCount)),
    cursor: Math.max(0, toInt(source.cursor)),
    taxonomy: Array.isArray(source.taxonomy) ? source.taxonomy : [],
    reviewFolderName: normalizeText(source.reviewFolderName) || "待确认",
    assignments: Array.isArray(source.assignments) ? source.assignments : [],
    invalidResults: Math.max(0, toInt(source.invalidResults)),
    provider: normalizeText(source.provider),
    model: normalizeText(source.model),
    baseUrl: normalizeText(source.baseUrl),
    retryAttempt: Math.max(0, toInt(source.retryAttempt)),
    nextRunAt: toIntOrNull(source.nextRunAt),
    startedAt: Math.max(0, toInt(source.startedAt, timestamp)),
    updatedAt: Math.max(0, toInt(source.updatedAt, timestamp)),
    finishedAt: toIntOrNull(source.finishedAt),
    appliedAt: toIntOrNull(source.appliedAt),
    undoneAt: toIntOrNull(source.undoneAt),
    lastError: normalizeText(source.lastError) || null,
    snapshotKey:
      normalizeText(source.snapshotKey) ||
      `${AI_ORGANIZER_SNAPSHOT_PREFIX}${id}`,
    applySummary: source.applySummary ?? null,
    undo: source.undo ?? null,
  };
}

async function readAiOrganizerTask() {
  if (cachedAiOrganizerTask !== undefined) {
    return cachedAiOrganizerTask
      ? cloneStoredValue(cachedAiOrganizerTask)
      : null;
  }
  cachedAiOrganizerTask = normalizeAiOrganizerTask(
    await readStoredValue<AiOrganizerTaskRecord>(AI_ORGANIZER_TASK_KEY),
  );
  return cachedAiOrganizerTask ? cloneStoredValue(cachedAiOrganizerTask) : null;
}

function withAiOrganizerQueue<T>(work: () => Promise<T>) {
  const task = aiOrganizerQueue.then(work);
  aiOrganizerQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

async function updateAiOrganizerTask(
  runId: string,
  mutate: (task: AiOrganizerTaskRecord) => AiOrganizerTaskRecord,
) {
  return withAiOrganizerQueue(async () => {
    const current = await readAiOrganizerTask();
    if (!current || current.id !== runId) return null;
    const next = normalizeAiOrganizerTask(mutate(cloneStoredValue(current)));
    if (!next) throw new Error("AI organizer task became invalid");
    await writeStoredValues([{ key: AI_ORGANIZER_TASK_KEY, value: next }]);
    cachedAiOrganizerTask = next;
    return cloneStoredValue(next);
  });
}

function clearAiOrganizerAlarm() {
  if (chrome.alarms?.clear) chrome.alarms.clear(AI_ORGANIZER_ALARM);
}

function scheduleAiOrganizerAlarm(task: AiOrganizerTaskRecord | null) {
  if (!chrome.alarms?.create || !task) return;
  if (
    task.paused ||
    (task.stage !== "planning" && task.stage !== "classifying")
  ) {
    clearAiOrganizerAlarm();
    return;
  }
  const when = Math.max(now() + 1_000, task.nextRunAt ?? now() + 1_000);
  chrome.alarms.create(AI_ORGANIZER_ALARM, { when });
}

function scheduleAiOrganizerRequestWatchdog() {
  if (!chrome.alarms?.create) return;
  chrome.alarms.create(AI_ORGANIZER_ALARM, {
    when:
      now() + AI_ORGANIZER_REQUEST_TIMEOUT_MS + AI_ORGANIZER_WATCHDOG_GRACE_MS,
  });
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function buildAiOrganizerHashPayload(
  state: LocalState,
  sourceVideoIds: number[],
) {
  const sourceIds = new Set(sourceVideoIds);
  const aiFolderIds = new Set(
    state.folders
      .filter((folder) => folder.origin === "ai")
      .map((folder) => folder.id),
  );
  return JSON.stringify({
    sourceVideoIds,
    videos: state.videos
      .filter((video) => sourceIds.has(video.id))
      .map((video) => [video.id, video.bvid, video.deletedAt]),
    aiFolders: state.folders
      .filter((folder) => aiFolderIds.has(folder.id))
      .map((folder) => [
        folder.id,
        folder.name,
        folder.deletedAt,
        folder.organizerId,
        folder.taxonomyKey,
      ]),
    aiFolderItems: state.folderItems
      .filter(
        (item) =>
          sourceIds.has(item.videoId) &&
          (item.origin === "ai" || aiFolderIds.has(item.folderId)),
      )
      .map((item) => [
        item.id,
        item.folderId,
        item.videoId,
        item.origin,
        item.organizerId,
      ]),
  });
}

async function computeAiOrganizerSourceHash(
  state: LocalState,
  sourceVideoIds: number[],
) {
  const payload = buildAiOrganizerHashPayload(state, sourceVideoIds);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(payload),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function buildAiOrganizerSourceSelection(
  state: LocalState,
  config: AiOrganizerConfig,
) {
  const activeVideos = state.videos.filter((video) => video.deletedAt === null);
  const scopedIds =
    config.scope === "folder" && config.folderId
      ? new Set(
          state.folderItems
            .filter((item) => item.folderId === config.folderId)
            .map((item) => item.videoId),
        )
      : null;
  const scopedVideos = scopedIds
    ? activeVideos.filter((video) => scopedIds.has(video.id))
    : activeVideos;
  const sourceVideoIds = scopedVideos
    .filter((video) => !video.isInvalid)
    .map((video) => video.id)
    .sort((left, right) => left - right);
  const sourceVideoIdSet = new Set(sourceVideoIds);
  const sourceFolder =
    config.scope === "folder"
      ? (state.folders.find(
          (folder) =>
            folder.id === config.folderId && folder.deletedAt === null,
        ) ?? null)
      : null;
  if (config.scope === "folder" && !sourceFolder) {
    throw new Error("Selected folder no longer exists");
  }
  if (sourceVideoIds.length === 0) {
    throw new Error("No valid videos are available for AI organization");
  }
  return {
    sourceVideoIds,
    sourceFolderName: sourceFolder?.name ?? null,
    skippedInvalid: scopedVideos.length - sourceVideoIds.length,
    previousAiRelationCount: state.folderItems.filter(
      (item) => item.origin === "ai" && sourceVideoIdSet.has(item.videoId),
    ).length,
  };
}

function buildAiOrganizerVideoContext(
  state: LocalState,
  sourceVideoIds: number[],
  startIndex = 0,
  limit = sourceVideoIds.length,
) {
  const videoById = new Map(state.videos.map((video) => [video.id, video]));
  const folderById = new Map(
    state.folders
      .filter((folder) => folder.deletedAt === null)
      .map((folder) => [folder.id, folder]),
  );
  const tagById = new Map(
    state.tags
      .filter((tag) => tag.archivedAt === null)
      .map((tag) => [tag.id, tag]),
  );
  const folderNamesByVideoId = new Map<number, string[]>();
  for (const item of state.folderItems) {
    const folder = folderById.get(item.folderId);
    if (!folder) continue;
    const bucket = folderNamesByVideoId.get(item.videoId) ?? [];
    if (!bucket.includes(folder.name)) bucket.push(folder.name);
    folderNamesByVideoId.set(item.videoId, bucket);
  }
  const tagsByVideoId = new Map<number, string[]>();
  for (const item of state.videoTags) {
    const tag = tagById.get(item.tagId);
    if (!tag) continue;
    const bucket = tagsByVideoId.get(item.videoId) ?? [];
    if (!bucket.includes(tag.name)) bucket.push(tag.name);
    tagsByVideoId.set(item.videoId, bucket);
  }

  return sourceVideoIds
    .slice(startIndex, startIndex + limit)
    .map((videoId, offset) => {
      const video = videoById.get(videoId);
      if (!video) throw new Error(`Snapshot video ${videoId} is missing`);
      return {
        itemKey: `item-${String(startIndex + offset + 1).padStart(6, "0")}`,
        videoId,
        title: video.title,
        uploader: video.uploader,
        description: video.description,
        partition: video.partition,
        tags: tagsByVideoId.get(videoId) ?? [],
        currentFolders: folderNamesByVideoId.get(videoId) ?? [],
      };
    });
}

function buildAiOrganizerTaxonomyInput(
  state: LocalState,
  task: AiOrganizerTaskRecord,
) {
  const allItems = buildAiOrganizerVideoContext(
    state,
    task.sourceVideoIds,
    0,
    task.sourceVideoIds.length,
  );
  const sampleCount = Math.min(120, allItems.length);
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const sourceIndex = Math.min(
      allItems.length - 1,
      Math.floor((index * allItems.length) / sampleCount),
    );
    const item = allItems[sourceIndex];
    return {
      title: item.title,
      uploader: item.uploader,
      description: normalizeText(item.description).slice(0, 280),
      partition: item.partition,
      tags: item.tags.slice(0, 12),
      currentFolders: item.currentFolders.slice(0, 8),
    };
  });
  const partitionCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  for (const item of allItems) {
    const partition = normalizeText(item.partition) || "未知";
    partitionCounts[partition] = (partitionCounts[partition] ?? 0) + 1;
    for (const tag of item.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  const existingFolders = listActiveFoldersWithCounts(state).map((folder) => ({
    name: folder.name,
    description: folder.description,
    itemCount: folder.itemCount,
  }));
  return {
    config: task.config,
    totalVideos: task.total,
    existingFolders,
    partitionCounts,
    tagCounts: Object.fromEntries(
      Object.entries(tagCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 80),
    ),
    samples,
  };
}

async function readAiOrganizerSnapshot(task: AiOrganizerTaskRecord) {
  const snapshot = await readStoredValue<AiOrganizerSnapshotRecord>(
    task.snapshotKey,
  );
  if (!snapshot || snapshot.runId !== task.id || !snapshot.state) {
    throw new Error("AI organizer source snapshot is missing");
  }
  return snapshot;
}

async function requestAiOrganizerJson(
  aiMeta: AiMeta,
  prompt: string,
  options: { maxTokens: number; temperature: number },
) {
  const controller = new AbortController();
  let timedOut = false;
  aiOrganizerRequestAbortController = controller;
  scheduleAiOrganizerRequestWatchdog();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, AI_ORGANIZER_REQUEST_TIMEOUT_MS);
  try {
    return await requestAiJson(aiMeta, prompt, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("AI provider request timed out after 90 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (aiOrganizerRequestAbortController === controller) {
      aiOrganizerRequestAbortController = null;
    }
  }
}

function buildAiOrganizerStatus(task: AiOrganizerTaskRecord | null) {
  if (!task) {
    return {
      phase: "idle",
      running: false,
      paused: false,
      total: 0,
      processed: 0,
      progress: 0,
      taxonomy: [],
      lowConfidence: 0,
      invalidResults: 0,
      canApply: false,
      canUndo: false,
      lastError: null,
    };
  }
  const waiting =
    !task.paused &&
    (task.stage === "planning" || task.stage === "classifying") &&
    Boolean(task.lastError && task.nextRunAt && task.nextRunAt > now());
  const phase = task.paused ? "paused" : waiting ? "waiting" : task.stage;
  const counts = new Map<string, number>();
  let lowConfidence = 0;
  for (const assignment of task.assignments) {
    const key = assignment.lowConfidence
      ? REVIEW_FOLDER_KEY
      : assignment.folderKey;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (assignment.lowConfidence) lowConfidence += 1;
  }
  const taxonomy = task.taxonomy.map((folder) => ({
    ...folder,
    count: counts.get(folder.key) ?? 0,
  }));
  if (lowConfidence > 0) {
    taxonomy.push({
      key: REVIEW_FOLDER_KEY,
      name: task.reviewFolderName,
      description: "AI 置信度不足或返回不完整的视频",
      include: "",
      exclude: "",
      count: lowConfidence,
    });
  }
  return {
    id: task.id,
    phase,
    stage: task.stage,
    running:
      !task.paused &&
      (task.stage === "planning" || task.stage === "classifying"),
    paused: task.paused,
    config: task.config,
    sourceFolderName: task.sourceFolderName,
    total: task.total,
    processed: task.assignments.length,
    progress:
      task.total > 0
        ? Math.min(
            100,
            Math.round((task.assignments.length / task.total) * 100),
          )
        : 0,
    skippedInvalid: task.skippedInvalid,
    estimatedFolderLinksAdded: task.total,
    estimatedFolderLinksRemoved: task.previousAiRelationCount,
    taxonomy,
    lowConfidence,
    invalidResults: task.invalidResults,
    provider: task.provider,
    model: task.model,
    retryAttempt: task.retryAttempt,
    nextRunAt: task.nextRunAt,
    startedAt: task.startedAt,
    updatedAt: task.updatedAt,
    finishedAt: task.finishedAt,
    appliedAt: task.appliedAt,
    undoneAt: task.undoneAt,
    canApply: task.stage === "ready" && !task.paused,
    canUndo: task.stage === "completed" && Boolean(task.undo) && !task.undoneAt,
    lastError: task.lastError,
    applySummary: task.applySummary,
  };
}

async function processAiOrganizerPlanning(task: AiOrganizerTaskRecord) {
  const snapshot = await readAiOrganizerSnapshot(task);
  const liveState = await readState();
  const aiMeta = ensureAiMeta(liveState);
  if (!aiMeta.enabled)
    throw new Error("AI organization is disabled in settings");
  validateAiSettings(aiMeta);
  if (!sameAiOrganizerSettings(aiMeta, task)) {
    throw new Error(
      "AI provider or model changed. Restore the original setting or start a new task",
    );
  }
  const prompt = buildAiOrganizerTaxonomyPrompt(
    buildAiOrganizerTaxonomyInput(snapshot.state, task),
  );
  const payload = await requestAiOrganizerJson(aiMeta, prompt, {
    maxTokens: 4096,
    temperature: 0.15,
  });
  const normalizedTaxonomy = normalizeAiOrganizerTaxonomy(
    payload,
    task.config.folderCount,
  );
  const resolvedNames = resolveAiOrganizerFolderNames(
    normalizedTaxonomy,
    snapshot.state.folders,
    task.config.locale === "en-US" ? "Needs review" : "待确认",
  );
  return updateAiOrganizerTask(task.id, (current) => {
    if (current.stage !== "planning" || current.paused) return current;
    return {
      ...current,
      stage: "classifying",
      taxonomy: resolvedNames.taxonomy,
      reviewFolderName: resolvedNames.reviewFolderName,
      retryAttempt: 0,
      nextRunAt: now() + AI_ORGANIZER_BATCH_DELAY_MS,
      updatedAt: now(),
      lastError: null,
    };
  });
}

async function processAiOrganizerBatch(task: AiOrganizerTaskRecord) {
  if (task.cursor >= task.sourceVideoIds.length) {
    return updateAiOrganizerTask(task.id, (current) => ({
      ...current,
      stage: "ready",
      nextRunAt: null,
      finishedAt: now(),
      updatedAt: now(),
      lastError: null,
    }));
  }
  const snapshot = await readAiOrganizerSnapshot(task);
  const liveState = await readState();
  const aiMeta = ensureAiMeta(liveState);
  if (!aiMeta.enabled)
    throw new Error("AI organization is disabled in settings");
  validateAiSettings(aiMeta);
  if (!sameAiOrganizerSettings(aiMeta, task)) {
    throw new Error(
      "AI provider or model changed. Restore the original setting or start a new task",
    );
  }
  const batch = buildAiOrganizerVideoContext(
    snapshot.state,
    task.sourceVideoIds,
    task.cursor,
    task.config.batchSize,
  );
  const prompt = buildAiOrganizerClassificationPrompt({
    taxonomy: task.taxonomy,
    items: batch,
    instructions: task.config.instructions,
  });
  const payload = await requestAiOrganizerJson(aiMeta, prompt, {
    maxTokens: 4096,
    temperature: 0.1,
  });
  const normalized = normalizeAiOrganizerAssignments(
    payload,
    batch.map((item) => ({ itemKey: item.itemKey, videoId: item.videoId })),
    task.taxonomy,
    task.config.confidenceThreshold,
  );
  return updateAiOrganizerTask(task.id, (current) => {
    if (
      current.stage !== "classifying" ||
      current.cursor !== task.cursor ||
      current.paused
    ) {
      return current;
    }
    const assignments = [...current.assignments, ...normalized.assignments];
    const cursor = Math.min(current.total, current.cursor + batch.length);
    const completed = cursor >= current.total;
    return {
      ...current,
      stage: completed ? "ready" : "classifying",
      cursor,
      assignments,
      invalidResults: current.invalidResults + normalized.invalid,
      retryAttempt: 0,
      nextRunAt: completed ? null : now() + AI_ORGANIZER_BATCH_DELAY_MS,
      finishedAt: completed ? now() : null,
      updatedAt: now(),
      lastError: null,
    };
  });
}

async function handleAiOrganizerStepFailure(
  task: AiOrganizerTaskRecord,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  const updated = await updateAiOrganizerTask(task.id, (current) => {
    if (current.paused) return current;
    if (current.stage !== "planning" && current.stage !== "classifying") {
      return current;
    }
    const retryAttempt = current.retryAttempt + 1;
    const exhausted = retryAttempt >= AI_ORGANIZER_MAX_RETRY_ATTEMPTS;
    return {
      ...current,
      stage: exhausted ? "failed" : current.stage,
      retryAttempt,
      nextRunAt: exhausted
        ? null
        : now() + Math.min(60_000, 5_000 * 2 ** (retryAttempt - 1)),
      finishedAt: exhausted ? now() : current.finishedAt,
      updatedAt: now(),
      lastError: message,
    };
  });
  scheduleAiOrganizerAlarm(updated);
}

function triggerAiOrganizerWorker() {
  if (aiOrganizerTask) return aiOrganizerTask;
  aiOrganizerTask = (async () => {
    while (true) {
      const task = await readAiOrganizerTask();
      if (
        !task ||
        task.paused ||
        (task.stage !== "planning" && task.stage !== "classifying")
      ) {
        scheduleAiOrganizerAlarm(task);
        return;
      }
      const wait = Math.max(0, (task.nextRunAt ?? 0) - now());
      if (wait > 2_000) {
        scheduleAiOrganizerAlarm(task);
        return;
      }
      if (wait > 0) await waitMs(wait);
      const latestTask = await readAiOrganizerTask();
      if (
        !latestTask ||
        latestTask.id !== task.id ||
        latestTask.paused ||
        (latestTask.stage !== "planning" && latestTask.stage !== "classifying")
      ) {
        scheduleAiOrganizerAlarm(latestTask);
        return;
      }
      try {
        const updated =
          latestTask.stage === "planning"
            ? await processAiOrganizerPlanning(latestTask)
            : await processAiOrganizerBatch(latestTask);
        if (!updated || updated.paused) return;
        scheduleAiOrganizerAlarm(updated);
      } catch (error) {
        await handleAiOrganizerStepFailure(latestTask, error);
        return;
      }
    }
  })().finally(() => {
    aiOrganizerTask = null;
  });
  return aiOrganizerTask;
}

async function startAiOrganizerTask(rawConfig: unknown) {
  if (aiOrganizerStartPending)
    throw new Error("AI organization is already starting");
  if (aiOrganizerApplyPending) throw new Error("AI organization is busy");
  aiOrganizerStartPending = true;
  try {
    const existing = await readAiOrganizerTask();
    if (
      existing &&
      (existing.stage === "planning" || existing.stage === "classifying")
    ) {
      throw new Error("AI organization is already running");
    }
    if (
      existing &&
      (existing.stage === "ready" ||
        (existing.stage === "completed" &&
          existing.undo &&
          !existing.undoneAt)) &&
      !(rawConfig as { replaceExisting?: unknown })?.replaceExisting
    ) {
      throw new Error(
        "The current AI plan or undo record must be explicitly replaced",
      );
    }
    const config = normalizeAiOrganizerConfig(rawConfig);
    const prepared = await withState(async (state) => {
      const aiMeta = ensureAiMeta(state);
      if (!aiMeta.enabled)
        throw new Error("Enable AI organization in AI settings first");
      validateAiSettings(aiMeta);
      const selection = buildAiOrganizerSourceSelection(state, config);
      const sourceHash = await computeAiOrganizerSourceHash(
        state,
        selection.sourceVideoIds,
      );
      return {
        snapshotState: cloneStoredValue(state),
        sourceHash,
        selection,
        provider: aiMeta.provider,
        model: aiMeta.model,
        baseUrl: aiMeta.baseUrl,
      };
    }, false);
    prepared.snapshotState.ai.apiKey = "";
    prepared.snapshotState.syncMeta.webdav.password = "";
    const estimatedBytes = JSON.stringify(prepared.snapshotState).length * 2;
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const available = Math.max(
        0,
        (estimate.quota ?? 0) - (estimate.usage ?? 0),
      );
      if (estimate.quota && available < estimatedBytes * 2) {
        throw new Error(
          "Not enough browser storage is available for a safe AI rollback snapshot",
        );
      }
    }
    const timestamp = now();
    const id = `ai-${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
    const snapshotKey = `${AI_ORGANIZER_SNAPSHOT_PREFIX}${id}`;
    const task: AiOrganizerTaskRecord = {
      version: 1,
      id,
      stage: "planning",
      paused: false,
      config,
      sourceHash: prepared.sourceHash,
      sourceVideoIds: prepared.selection.sourceVideoIds,
      sourceFolderName: prepared.selection.sourceFolderName,
      total: prepared.selection.sourceVideoIds.length,
      skippedInvalid: prepared.selection.skippedInvalid,
      previousAiRelationCount: prepared.selection.previousAiRelationCount,
      cursor: 0,
      taxonomy: [],
      reviewFolderName: "待确认",
      assignments: [],
      invalidResults: 0,
      provider: prepared.provider,
      model: prepared.model,
      baseUrl: prepared.baseUrl,
      retryAttempt: 0,
      nextRunAt: timestamp,
      startedAt: timestamp,
      updatedAt: timestamp,
      finishedAt: null,
      appliedAt: null,
      undoneAt: null,
      lastError: null,
      snapshotKey,
      applySummary: null,
      undo: null,
    };
    const snapshot: AiOrganizerSnapshotRecord = {
      version: 1,
      runId: id,
      createdAt: timestamp,
      state: prepared.snapshotState,
    };
    await writeStoredValues([
      { key: snapshotKey, value: snapshot },
      { key: AI_ORGANIZER_TASK_KEY, value: task },
    ]);
    cachedAiOrganizerTask = undefined;
    const [persistedSnapshot, persistedTask] = await Promise.all([
      readStoredValue<AiOrganizerSnapshotRecord>(snapshotKey),
      readStoredValue<AiOrganizerTaskRecord>(AI_ORGANIZER_TASK_KEY).then(
        normalizeAiOrganizerTask,
      ),
    ]);
    if (
      persistedSnapshot?.runId !== id ||
      !persistedSnapshot.state ||
      persistedTask?.id !== id ||
      persistedTask.snapshotKey !== snapshotKey
    ) {
      throw new Error(
        "AI organizer snapshot could not be verified after saving",
      );
    }
    cachedAiOrganizerTask = persistedTask;
    if (existing?.snapshotKey && existing.snapshotKey !== snapshotKey) {
      await deleteStoredValue(existing.snapshotKey).catch((error) => {
        console.warn("[ai-organizer] old snapshot cleanup failed:", error);
      });
    }
    scheduleAiOrganizerAlarm(task);
    void triggerAiOrganizerWorker();
    return task;
  } finally {
    aiOrganizerStartPending = false;
  }
}

function aiSettingsTestSignature(meta: AiMeta) {
  return JSON.stringify([meta.provider, meta.baseUrl, meta.model, meta.apiKey]);
}

async function testAiSettingsOutsideStateQueue(body: Record<string, unknown>) {
  const prepared = await withState((state) => {
    const meta = ensureAiMeta(state);
    applyAiSettingsPatch(meta, body);
    meta.updatedAt = now();
    try {
      validateAiSettings(meta);
      return {
        valid: true as const,
        requestMeta: {
          provider: meta.provider,
          baseUrl: meta.baseUrl,
          model: meta.model,
          apiKey: meta.apiKey,
        },
        signature: aiSettingsTestSignature(meta),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI settings test failed";
      meta.lastTestAt = now();
      meta.lastTestOk = false;
      meta.lastError = message;
      return {
        valid: false as const,
        error: message,
        settings: getAiSettings(meta),
      };
    }
  }, true);
  if (!prepared.valid) return fail(400, prepared.error);

  try {
    const result = await requestAiJson(
      prepared.requestMeta,
      'Return JSON only with schema: {"ok":true}.',
      { maxTokens: 128, temperature: 0 },
    );
    if (result?.ok !== true) {
      throw new Error(
        "AI test response did not match the expected JSON schema",
      );
    }
    const settings = await withState((state) => {
      const meta = ensureAiMeta(state);
      if (aiSettingsTestSignature(meta) !== prepared.signature) {
        throw new Error(
          "AI settings changed while the connection test was running",
        );
      }
      meta.lastTestAt = now();
      meta.lastTestOk = true;
      meta.lastError = null;
      return getAiSettings(meta);
    }, true);
    return ok(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI settings test failed";
    await withState((state) => {
      const meta = ensureAiMeta(state);
      if (aiSettingsTestSignature(meta) === prepared.signature) {
        meta.lastTestAt = now();
        meta.lastTestOk = false;
        meta.lastError = message;
      }
    }, true);
    return fail(message.includes("changed while") ? 409 : 400, message);
  }
}

async function pauseAiOrganizerTask() {
  const task = await readAiOrganizerTask();
  if (!task) return null;
  const updated = await updateAiOrganizerTask(task.id, (current) => ({
    ...current,
    paused:
      current.stage === "planning" || current.stage === "classifying"
        ? true
        : current.paused,
    nextRunAt: null,
    updatedAt: now(),
  }));
  aiOrganizerRequestAbortController?.abort();
  clearAiOrganizerAlarm();
  return updated;
}

async function resumeAiOrganizerTask() {
  const task = await readAiOrganizerTask();
  if (!task) throw new Error("No AI organization task is available");
  const updated = await updateAiOrganizerTask(task.id, (current) => {
    const resumableStage =
      current.taxonomy.length > 0 ? "classifying" : "planning";
    if (
      current.stage !== "planning" &&
      current.stage !== "classifying" &&
      current.stage !== "failed"
    ) {
      return current;
    }
    return {
      ...current,
      stage: current.stage === "failed" ? resumableStage : current.stage,
      paused: false,
      retryAttempt: 0,
      nextRunAt: now(),
      finishedAt: null,
      updatedAt: now(),
      lastError: null,
    };
  });
  scheduleAiOrganizerAlarm(updated);
  void triggerAiOrganizerWorker();
  return updated;
}

async function cancelAiOrganizerTask() {
  const task = await readAiOrganizerTask();
  if (!task) return null;
  const updated = await updateAiOrganizerTask(task.id, (current) => ({
    ...current,
    stage:
      current.stage === "planning" || current.stage === "classifying"
        ? "cancelled"
        : current.stage,
    paused: false,
    nextRunAt: null,
    finishedAt:
      current.stage === "planning" || current.stage === "classifying"
        ? now()
        : current.finishedAt,
    updatedAt: now(),
  }));
  aiOrganizerRequestAbortController?.abort();
  clearAiOrganizerAlarm();
  return updated;
}

async function applyReadyAiOrganizerTask() {
  if (aiOrganizerApplyPending)
    throw new Error("AI organization is already being applied");
  if (aiOrganizerStartPending)
    throw new Error("AI organization is already starting");
  aiOrganizerApplyPending = true;
  try {
    await aiOrganizerQueue;
    return await withState(async (state) => {
      const task = await readAiOrganizerTask();
      if (!task || task.stage !== "ready" || task.paused) {
        throw new Error("AI organization plan is not ready to apply");
      }
      const currentSelection = buildAiOrganizerSourceSelection(
        state,
        task.config,
      );
      if (
        currentSelection.sourceVideoIds.length !== task.sourceVideoIds.length ||
        currentSelection.sourceVideoIds.some(
          (videoId, index) => videoId !== task.sourceVideoIds[index],
        )
      ) {
        throw new Error(
          "Library scope changed after AI organization started. Start a new analysis to include the latest videos",
        );
      }
      const currentHash = await computeAiOrganizerSourceHash(
        state,
        task.sourceVideoIds,
      );
      if (currentHash !== task.sourceHash) {
        throw new Error(
          "Library changed after AI organization started. Start a new analysis to avoid overwriting newer data",
        );
      }
      const applied = applyAiOrganizerPlan(
        state,
        {
          runId: task.id,
          sourceVideoIds: task.sourceVideoIds,
          taxonomy: task.taxonomy,
          assignments: task.assignments,
          confidenceThreshold: task.config.confidenceThreshold,
          reviewFolderName: task.reviewFolderName,
        },
        now(),
      );
      const timestamp = now();
      const nextTask: AiOrganizerTaskRecord = {
        ...task,
        stage: "completed",
        paused: false,
        nextRunAt: null,
        updatedAt: timestamp,
        finishedAt: timestamp,
        appliedAt: timestamp,
        undoneAt: null,
        lastError: null,
        applySummary: applied.summary as AiOrganizerApplySummary,
        undo: applied.undo as AiOrganizerUndoRecord,
      };
      await writeStateAndStoredValue(
        applied.state as LocalState,
        AI_ORGANIZER_TASK_KEY,
        nextTask,
      );
      cachedAiOrganizerTask = nextTask;
      return nextTask;
    }, false);
  } finally {
    aiOrganizerApplyPending = false;
  }
}

async function undoAppliedAiOrganizerTask() {
  if (aiOrganizerApplyPending) throw new Error("AI organization is busy");
  if (aiOrganizerStartPending)
    throw new Error("AI organization is already starting");
  aiOrganizerApplyPending = true;
  try {
    await aiOrganizerQueue;
    return await withState(async (state) => {
      const task = await readAiOrganizerTask();
      if (!task || task.stage !== "completed" || !task.undo || task.undoneAt) {
        throw new Error("No applied AI organization is available to undo");
      }
      const undone = undoAiOrganizerPlan(state, task.undo, now());
      const timestamp = now();
      const nextTask: AiOrganizerTaskRecord = {
        ...task,
        stage: "undone",
        updatedAt: timestamp,
        undoneAt: timestamp,
        lastError: null,
      };
      await writeStateAndStoredValue(
        undone.state as LocalState,
        AI_ORGANIZER_TASK_KEY,
        nextTask,
      );
      cachedAiOrganizerTask = nextTask;
      return nextTask;
    }, false);
  } finally {
    aiOrganizerApplyPending = false;
  }
}

async function listAiOrganizerPreview(params: URLSearchParams) {
  const task = await readAiOrganizerTask();
  if (!task) return paginate([], params.get("page"), params.get("pageSize"));
  const snapshot = await readAiOrganizerSnapshot(task);
  const videoById = new Map(
    snapshot.state.videos.map((video) => [video.id, video]),
  );
  const folderById = new Map(
    snapshot.state.folders.map((folder) => [folder.id, folder]),
  );
  const currentFoldersByVideoId = new Map<number, string[]>();
  for (const item of snapshot.state.folderItems) {
    const folder = folderById.get(item.folderId);
    if (!folder || folder.deletedAt !== null) continue;
    const bucket = currentFoldersByVideoId.get(item.videoId) ?? [];
    if (!bucket.includes(folder.name)) bucket.push(folder.name);
    currentFoldersByVideoId.set(item.videoId, bucket);
  }
  const taxonomyByKey = new Map(
    task.taxonomy.map((folder) => [folder.key, folder]),
  );
  const lowOnly = params.get("lowConfidence") === "1";
  const items = task.assignments
    .filter((assignment) => !lowOnly || assignment.lowConfidence)
    .map((assignment) => {
      const video = videoById.get(assignment.videoId);
      const suggested = taxonomyByKey.get(assignment.folderKey);
      return {
        videoId: assignment.videoId,
        bvid: video?.bvid ?? "",
        title: video?.title ?? `#${assignment.videoId}`,
        uploader: video?.uploader ?? "",
        currentFolders: currentFoldersByVideoId.get(assignment.videoId) ?? [],
        suggestedFolderKey: assignment.folderKey,
        suggestedFolderName: suggested?.name ?? task.reviewFolderName,
        appliedFolderName: assignment.lowConfidence
          ? task.reviewFolderName
          : (suggested?.name ?? task.reviewFolderName),
        confidence: assignment.confidence,
        lowConfidence: assignment.lowConfidence,
        reason: assignment.reason,
      };
    })
    .sort(
      (left, right) =>
        Number(right.lowConfidence) - Number(left.lowConfidence) ||
        left.confidence - right.confidence ||
        left.videoId - right.videoId,
    );
  return paginate(items, params.get("page"), params.get("pageSize"));
}

function normalizeWebDavBaseUrl(rawUrl: unknown) {
  const text = normalizeText(rawUrl);
  if (!text) return "";
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new Error("WebDAV server URL is invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("WebDAV server URL must start with http:// or https://");
  }
  return parsed.toString().replace(/\/+$/, "");
}

export function normalizeWebDavRemotePath(rawPath: unknown) {
  const text = normalizeText(rawPath).replace(/\\/g, "/");
  const cleaned = text
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
  return cleaned;
}

function ensureWebDavMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = {
      tagEnrichment: defaultTagEnrichmentMeta(),
      bidirectionalSync: defaultBidirectionalSyncMeta(),
      webdav: defaultWebDavMeta(),
      stage3Reconcile: defaultStage3ReconcileMeta(),
      favoritesJob: defaultFavoritesSyncJobMeta(),
    };
  }
  if (!state.syncMeta.webdav) {
    state.syncMeta.webdav = defaultWebDavMeta();
  }
  const meta = state.syncMeta.webdav;
  meta.baseUrl = normalizeText(meta.baseUrl);
  meta.username = normalizeText(meta.username);
  meta.password = String(meta.password ?? "");
  meta.remotePath = normalizeWebDavRemotePath(meta.remotePath);
  if (meta.enabled === undefined || meta.enabled === null) {
    meta.enabled = false;
  }
  return meta;
}

function getWebDavSettings(meta: WebDavMeta) {
  return {
    enabled: meta.enabled,
    baseUrl: meta.baseUrl,
    username: meta.username,
    passwordSet: Boolean(meta.password),
    remotePath: meta.remotePath,
    lastTestAt: meta.lastTestAt,
    lastTestOk: meta.lastTestOk,
    lastError: meta.lastError,
    lastBackupAt: meta.lastBackupAt,
    lastBackupFile: meta.lastBackupFile,
    lastRestoreAt: meta.lastRestoreAt,
    updatedAt: meta.updatedAt,
  };
}

function ensureStage3ReconcileMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = {
      tagEnrichment: defaultTagEnrichmentMeta(),
      bidirectionalSync: defaultBidirectionalSyncMeta(),
      webdav: defaultWebDavMeta(),
      stage3Reconcile: defaultStage3ReconcileMeta(),
      favoritesJob: defaultFavoritesSyncJobMeta(),
    };
  }
  if (!state.syncMeta.webdav) {
    state.syncMeta.webdav = defaultWebDavMeta();
  }
  if (!state.syncMeta.stage3Reconcile) {
    state.syncMeta.stage3Reconcile = defaultStage3ReconcileMeta();
  }
  const meta = state.syncMeta.stage3Reconcile;
  meta.intervalMinutes = Math.max(
    5,
    toInt(meta.intervalMinutes, STAGE3_RECONCILE_DEFAULT_INTERVAL_MINUTES),
  );
  if (meta.enabled === undefined || meta.enabled === null) {
    meta.enabled = true;
  }
  if (!meta.lastSummary) {
    meta.lastSummary = emptyFavoritesSyncSummary();
  }
  return meta;
}

function getStage3ReconcileStatus(state: LocalState) {
  const meta = ensureStage3ReconcileMeta(state);
  return {
    enabled: meta.enabled,
    intervalMinutes: meta.intervalMinutes,
    cursorAfterRemoteMediaId: meta.cursorAfterRemoteMediaId,
    nextRunAt: meta.nextRunAt,
    running: meta.running || Boolean(stage3ReconcileTask),
    lastRunAt: meta.lastRunAt,
    lastError: meta.lastError,
    lastRemoteMediaId: meta.lastRemoteMediaId,
    lastSummary: { ...meta.lastSummary },
  };
}

function collectMissingSystemTagCandidates(
  state: LocalState,
  limit: number,
  cursorAfterVideoId = 0,
  meta = ensureTagEnrichmentMeta(state),
) {
  const scopeVideoIds = getTagEnrichmentScopeVideoIds(
    state,
    meta.selectedFolderIds,
  );
  const hasSystemTagVideoIds = getVideoIdSetWithSystemTags(state);
  const terminalVideoIds = new Set([
    ...meta.checkedEmptyVideoIds,
    ...meta.skippedVideoIds,
  ]);
  const missingVideos = state.videos
    .filter(
      (video) =>
        video.deletedAt === null &&
        scopeVideoIds.has(video.id) &&
        !hasSystemTagVideoIds.has(video.id) &&
        !terminalVideoIds.has(video.id),
    )
    .sort((a, b) => a.id - b.id);
  const threshold = Math.max(0, cursorAfterVideoId);
  const preferred = missingVideos.filter((video) => video.id > threshold);
  const chosen = (preferred.length > 0 ? preferred : missingVideos).slice(
    0,
    Math.max(1, limit),
  );
  return {
    total: missingVideos.length,
    items: chosen,
  };
}

function collectMissingSystemTagCandidateDtos(
  state: LocalState,
  limit: number,
  cursorAfterVideoId = 0,
  meta = ensureTagEnrichmentMeta(state),
) {
  const batch = collectMissingSystemTagCandidates(
    state,
    limit,
    cursorAfterVideoId,
    meta,
  );
  return {
    total: batch.total,
    items: batch.items.map((video) => ({ id: video.id, bvid: video.bvid })),
  };
}

function countMissingSystemTagVideos(
  state: LocalState,
  meta = ensureTagEnrichmentMeta(state),
) {
  return collectMissingSystemTagCandidates(
    state,
    Number.MAX_SAFE_INTEGER,
    0,
    meta,
  ).total;
}

function bindSystemTagsToVideo(
  state: LocalState,
  videoId: number,
  tagNames: string[],
) {
  let boundCount = 0;
  for (const tagName of tagNames) {
    const tag = ensureSystemTagByName(state, tagName);
    if (!tag) continue;
    const exists = state.videoTags.some(
      (relation) => relation.videoId === videoId && relation.tagId === tag.id,
    );
    if (exists) continue;
    state.videoTags.push({
      id: state.counters.videoTag++,
      videoId,
      tagId: tag.id,
    });
    boundCount += 1;
  }
  return boundCount;
}

function getTagEnrichmentScopeVideoIds(
  state: LocalState,
  selectedFolderIds: number[],
) {
  const activeVideoIds = new Set(
    state.videos
      .filter((video) => video.deletedAt === null)
      .map((video) => video.id),
  );
  const normalizedFolderIds = normalizePositiveIntList(selectedFolderIds);
  // Empty scope is retained only for active tasks created by older versions.
  if (normalizedFolderIds.length === 0) return activeVideoIds;

  const activeFolderIds = new Set(
    state.folders
      .filter(
        (folder) =>
          folder.deletedAt === null && normalizedFolderIds.includes(folder.id),
      )
      .map((folder) => folder.id),
  );
  return new Set(
    state.folderItems
      .filter(
        (relation) =>
          activeFolderIds.has(relation.folderId) &&
          activeVideoIds.has(relation.videoId),
      )
      .map((relation) => relation.videoId),
  );
}

function countTagEnrichmentScopeVideos(
  state: LocalState,
  meta = ensureTagEnrichmentMeta(state),
) {
  if (meta.selectedFolderIds.length === 0 && meta.phase === "idle") return 0;
  return getTagEnrichmentScopeVideoIds(state, meta.selectedFolderIds).size;
}

function resolveTagEnrichmentBatchNextRunAt(
  detectedAt = now(),
  random: () => number = Math.random,
  intervalSeconds = TAG_ENRICH_INTERVAL_SECONDS_DEFAULT,
) {
  const sampled = Math.min(1, Math.max(0, Number(random()) || 0));
  const intervalMs =
    Math.min(
      TAG_ENRICH_INTERVAL_SECONDS_MAX,
      Math.max(
        TAG_ENRICH_INTERVAL_SECONDS_MIN,
        toInt(intervalSeconds, TAG_ENRICH_INTERVAL_SECONDS_DEFAULT),
      ),
    ) * 1000;
  return (
    detectedAt +
    intervalMs +
    Math.round(sampled * TAG_ENRICH_BATCH_DELAY_JITTER_MS)
  );
}

function scheduleTagEnrichment(meta: TagEnrichmentMeta | null) {
  if (
    !meta ||
    meta.paused ||
    meta.phase !== "waiting" ||
    !meta.nextRunAt ||
    !chrome.alarms?.create
  ) {
    if (chrome.alarms?.clear) chrome.alarms.clear(TAG_ENRICH_ALARM);
    return;
  }
  chrome.alarms.create(TAG_ENRICH_ALARM, {
    when: Math.max(now() + 1000, meta.nextRunAt),
  });
}

function toTagEnrichmentErrorItem(
  candidate: { id: number; bvid: string },
  message: string,
  occurredAt = now(),
): TagEnrichmentErrorItem {
  return {
    videoId: candidate.id,
    bvid: normalizeText(candidate.bvid),
    message: normalizeText(message) || "Tag enrichment request failed",
    occurredAt,
  };
}

function applyTagEnrichmentFailurePolicy(
  meta: TagEnrichmentMeta,
  error: unknown,
  message: string,
) {
  return resolveFavoritesFailurePolicy({
    status: isBiliRequestError(error) ? error.status : 0,
    message,
    attempt: meta.retryAttempt + 1,
    detectedAt: now(),
    retryAfterMs: isBiliRequestError(error) ? error.retryAfterMs : null,
    previousRiskCount: meta.riskCount,
    random: Math.random,
  });
}

async function runTagEnrichmentBatch() {
  if (favoritesSyncTask || favoritesSyncStartPending) {
    const deferred = await mutateTagEnrichmentState((state) => {
      const meta = ensureTagEnrichmentMeta(state);
      if (
        !meta.paused &&
        (meta.phase === "running" || meta.phase === "waiting")
      ) {
        meta.phase = "waiting";
        meta.waitingForVideoSync = true;
        meta.nextRunAt = null;
        meta.updatedAt = now();
      }
      return { ...meta };
    });
    scheduleTagEnrichment(deferred);
    return;
  }

  const plan = await withState((state) => {
    const meta = ensureTagEnrichmentMeta(state);
    meta.waitingForVideoSync = false;
    const activeVideoIds = new Set(
      state.videos
        .filter((video) => video.deletedAt === null)
        .map((video) => video.id),
    );
    meta.checkedEmptyVideoIds = meta.checkedEmptyVideoIds.filter((id) =>
      activeVideoIds.has(id),
    );
    meta.skippedVideoIds = meta.skippedVideoIds.filter((id) =>
      activeVideoIds.has(id),
    );
    const batch = collectMissingSystemTagCandidateDtos(
      state,
      meta.batchSize,
      meta.cursorAfterVideoId,
      meta,
    );
    meta.totalMissing = batch.total;
    meta.total = Math.max(meta.total, meta.processed + batch.total);
    meta.lastBatchProcessed = 0;
    meta.lastBatchSucceeded = 0;
    meta.lastBatchEmpty = 0;
    meta.lastBatchFailed = 0;
    meta.lastBatchBound = 0;
    meta.updatedAt = now();
    if (meta.paused || meta.phase === "paused") {
      return {
        paused: true as const,
        candidates: [] as Array<{ id: number; bvid: string }>,
        cursorAfterVideoId: meta.cursorAfterVideoId,
        totalMissing: batch.total,
      };
    }
    if (batch.items.length > 0) {
      meta.phase = "running";
      meta.nextRunAt = null;
    } else {
      meta.phase = "completed";
      meta.finishedAt = now();
      meta.nextRunAt = null;
      meta.lastError = null;
    }
    return {
      paused: false as const,
      candidates: batch.items,
      cursorAfterVideoId: meta.cursorAfterVideoId,
      totalMissing: batch.total,
    };
  }, true);

  if (plan.paused) return;
  if (plan.candidates.length === 0) {
    if (chrome.alarms?.clear) chrome.alarms.clear(TAG_ENRICH_ALARM);
    return;
  }

  const fetchedTagMap = new Map<number, string[]>();
  const emptyVideoIds = new Set<number>();
  const skippedVideoIds = new Set<number>();
  const batchErrors: TagEnrichmentErrorItem[] = [];
  let failure: ReturnType<typeof resolveFavoritesFailurePolicy> | null = null;
  let lastProcessedVideoId = plan.cursorAfterVideoId;
  let attempted = 0;
  for (const candidate of plan.candidates) {
    if (tagEnrichmentStopRequested) break;
    attempted += 1;
    lastProcessedVideoId = candidate.id;
    const bvid = normalizeText(candidate.bvid);
    if (!bvid) {
      skippedVideoIds.add(candidate.id);
      batchErrors.push(
        toTagEnrichmentErrorItem(candidate, "Video has no BV id"),
      );
      continue;
    }
    try {
      const names = await fetchArchiveTagNames(bvid);
      if (names.length > 0) {
        fetchedTagMap.set(candidate.id, names);
      } else {
        emptyVideoIds.add(candidate.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      batchErrors.push(toTagEnrichmentErrorItem(candidate, message));
      const current = await readState();
      const meta = ensureTagEnrichmentMeta(current);
      failure = applyTagEnrichmentFailurePolicy(meta, error, message);
      if (failure.phase === "failed") {
        skippedVideoIds.add(candidate.id);
      } else {
        lastProcessedVideoId = plan.cursorAfterVideoId;
        break;
      }
    }
    if (!tagEnrichmentStopRequested) {
      await sleep(1600 + Math.floor(Math.random() * 900));
    }
  }

  const result = await withState((state) => {
    const meta = ensureTagEnrichmentMeta(state);
    let bound = 0;
    if (fetchedTagMap.size > 0) {
      for (const [videoId, tagNames] of fetchedTagMap) {
        const video = state.videos.find(
          (item) => item.id === videoId && item.deletedAt === null,
        );
        if (!video) continue;
        bound += bindSystemTagsToVideo(state, video.id, tagNames);
      }
    }

    meta.checkedEmptyVideoIds = normalizePositiveIntList([
      ...meta.checkedEmptyVideoIds,
      ...emptyVideoIds,
    ]);
    meta.skippedVideoIds = normalizePositiveIntList([
      ...meta.skippedVideoIds,
      ...skippedVideoIds,
    ]);
    meta.errors = [...meta.errors, ...batchErrors].slice(-100);
    const terminalCount =
      fetchedTagMap.size + emptyVideoIds.size + skippedVideoIds.size;
    const timestamp = now();
    meta.lastRunAt = timestamp;
    meta.updatedAt = timestamp;
    meta.lastBatchProcessed = attempted;
    meta.lastBatchSucceeded = fetchedTagMap.size;
    meta.lastBatchEmpty = emptyVideoIds.size;
    meta.lastBatchFailed = batchErrors.length;
    meta.lastBatchBound = bound;
    meta.processed += terminalCount;
    meta.succeeded += fetchedTagMap.size;
    meta.empty += emptyVideoIds.size;
    meta.failed += batchErrors.length;
    meta.tagsBound += bound;
    if (terminalCount > 0) meta.cursorAfterVideoId = lastProcessedVideoId;
    meta.totalMissing = countMissingSystemTagVideos(state, meta);
    meta.total = Math.max(meta.total, meta.processed + meta.totalMissing);

    if (meta.paused || tagEnrichmentStopRequested) {
      meta.phase = "paused";
      meta.paused = true;
      meta.waitingForVideoSync = false;
      meta.nextRunAt = null;
    } else if (failure && failure.phase !== "failed") {
      meta.phase = failure.phase;
      meta.paused = failure.phase === "paused";
      meta.nextRunAt = failure.nextRetryAt;
      meta.retryAttempt = failure.attempt;
      meta.riskCount = failure.riskCount;
      meta.lastError = batchErrors.at(-1)?.message ?? "Tag enrichment failed";
    } else if (meta.totalMissing > 0) {
      meta.phase = "waiting";
      meta.paused = false;
      meta.waitingForVideoSync = false;
      meta.nextRunAt = resolveTagEnrichmentBatchNextRunAt(
        timestamp,
        Math.random,
        meta.intervalSeconds,
      );
      meta.retryAttempt = resolveSuccessfulRetryAttempt(meta.retryAttempt);
      meta.riskCount = Math.max(0, meta.riskCount - 1);
      meta.lastError =
        batchErrors.length > 0 ? (batchErrors.at(-1)?.message ?? null) : null;
    } else {
      meta.phase = "completed";
      meta.paused = false;
      meta.waitingForVideoSync = false;
      meta.finishedAt = timestamp;
      meta.nextRunAt = null;
      meta.retryAttempt = 0;
      meta.riskCount = 0;
      meta.lastError = null;
      meta.cursorAfterVideoId = 0;
    }
    if (meta.totalMissing <= 0) {
      meta.cursorAfterVideoId = 0;
    }

    return { ...meta };
  }, true);

  scheduleTagEnrichment(result);
}

function triggerTagEnrichment() {
  if (tagEnrichmentTask) return tagEnrichmentTask;
  tagEnrichmentStopRequested = false;
  tagEnrichmentTask = runTagEnrichmentBatch()
    .catch(async (error) => {
      console.warn("[tag-enrich] failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      const meta = await withState((state) => {
        const current = ensureTagEnrichmentMeta(state);
        if (current.paused) return { ...current };
        const failure = applyTagEnrichmentFailurePolicy(
          current,
          error,
          message,
        );
        current.phase = failure.phase;
        current.paused = failure.phase === "paused";
        current.nextRunAt = failure.nextRetryAt;
        current.retryAttempt = failure.attempt;
        current.riskCount = failure.riskCount;
        current.lastError = message;
        current.updatedAt = now();
        return { ...current };
      }, true);
      scheduleTagEnrichment(meta);
    })
    .finally(() => {
      tagEnrichmentTask = null;
    });
  return tagEnrichmentTask;
}

type StartTagEnrichmentOptions = {
  reset?: boolean;
  immediate?: boolean;
  force?: boolean;
  selectedFolderIds?: number[];
};

async function mutateTagEnrichmentState<T>(
  mutate: (state: LocalState) => T,
): Promise<T> {
  const workingState = favoritesSyncWorkingState;
  if (!workingState) return withState(mutate, true);

  // Favorites sync owns the serialized queue for its entire run. Tag controls
  // mutate that same live snapshot so queued work is visible immediately.
  const result = mutate(workingState);
  await writeState(workingState);
  return result;
}

async function startTagEnrichmentTask(options: StartTagEnrichmentOptions = {}) {
  if (!TAG_SYNC_ENABLED) return false;
  tagEnrichmentStopRequested = false;
  const meta = await mutateTagEnrichmentState((state) => {
    const current = ensureTagEnrichmentMeta(state);
    const hasSelectedFolderIds = Object.prototype.hasOwnProperty.call(
      options,
      "selectedFolderIds",
    );
    const requestedFolderIds = normalizePositiveIntList(
      options.selectedFolderIds,
    );
    if (hasSelectedFolderIds && requestedFolderIds.length === 0) {
      throw new Error("Select at least one folder for tag enrichment");
    }
    const activeFolderIds = new Set(
      state.folders
        .filter((folder) => folder.deletedAt === null)
        .map((folder) => folder.id),
    );
    const validRequestedFolderIds = requestedFolderIds.filter((folderId) =>
      activeFolderIds.has(folderId),
    );
    if (
      hasSelectedFolderIds &&
      validRequestedFolderIds.length !== requestedFolderIds.length
    ) {
      throw new Error("One or more selected folders no longer exist");
    }
    if (
      current.phase === "paused" &&
      current.nextRunAt &&
      current.nextRunAt > now() &&
      current.riskCount > 0
    ) {
      return { ...current };
    }
    if (current.paused && !options.force && !options.reset) {
      return { ...current };
    }
    if (options.reset) {
      const fresh = defaultTagEnrichmentMeta();
      fresh.batchSize = current.batchSize;
      fresh.intervalSeconds = current.intervalSeconds;
      state.syncMeta.tagEnrichment = fresh;
    }
    const next = ensureTagEnrichmentMeta(state);
    const startsNewRun =
      next.phase === "idle" ||
      next.phase === "completed" ||
      next.phase === "failed" ||
      Boolean(options.reset);
    if (hasSelectedFolderIds && startsNewRun) {
      next.selectedFolderIds = validRequestedFolderIds;
    }
    if (startsNewRun && next.selectedFolderIds.length === 0) {
      throw new Error("Select at least one folder for tag enrichment");
    }
    next.dismissedAt = null;
    const pending = countMissingSystemTagVideos(state, next);
    if (startsNewRun) {
      next.total = pending;
      next.processed = 0;
      next.succeeded = 0;
      next.empty = 0;
      next.failed = 0;
      next.tagsBound = 0;
      next.errors = [];
      next.startedAt = now();
      next.finishedAt = null;
      next.cursorAfterVideoId = 0;
    } else if (!next.startedAt) {
      next.startedAt = now();
    }
    next.totalMissing = pending;
    next.total = Math.max(next.total, next.processed + pending);
    next.paused = false;
    next.waitingForVideoSync = false;
    next.lastError = null;
    next.updatedAt = now();
    if (pending <= 0) {
      next.phase = "completed";
      next.finishedAt = now();
      next.nextRunAt = null;
    } else {
      next.phase = "waiting";
      next.finishedAt = null;
      if (
        favoritesSyncWorkingState ||
        favoritesSyncTask ||
        favoritesSyncStartPending
      ) {
        next.waitingForVideoSync = true;
        next.nextRunAt = null;
      } else {
        next.nextRunAt =
          options.immediate === false
            ? resolveTagEnrichmentBatchNextRunAt(
                now(),
                Math.random,
                next.intervalSeconds,
              )
            : now() + 1000;
      }
    }
    return { ...next };
  });

  scheduleTagEnrichment(meta);
  if (
    meta.phase === "waiting" &&
    !meta.waitingForVideoSync &&
    options.immediate !== false
  ) {
    void triggerTagEnrichment();
  }
  return meta.totalMissing > 0;
}

async function pauseTagEnrichmentTask() {
  tagEnrichmentStopRequested = true;
  const meta = await mutateTagEnrichmentState((state) => {
    const current = ensureTagEnrichmentMeta(state);
    current.phase = "paused";
    current.paused = true;
    current.waitingForVideoSync = false;
    current.nextRunAt = null;
    current.updatedAt = now();
    return { ...current };
  });
  scheduleTagEnrichment(null);
  return meta;
}

async function dismissTagEnrichmentStatus() {
  tagEnrichmentStopRequested = true;
  scheduleTagEnrichment(null);
  const runningTask = tagEnrichmentTask;
  if (runningTask) await runningTask;

  await mutateTagEnrichmentState((state) => {
    const current = ensureTagEnrichmentMeta(state);
    const timestamp = now();
    current.phase = "idle";
    current.paused = false;
    current.waitingForVideoSync = false;
    current.dismissedAt = timestamp;
    current.nextRunAt = null;
    current.retryAttempt = 0;
    current.riskCount = 0;
    current.lastError = null;
    current.updatedAt = timestamp;
  });
  return getTagEnrichmentStatus(await readState());
}

async function restoreTagEnrichmentTask() {
  const meta = await withState((state) => {
    const current = ensureTagEnrichmentMeta(state);
    if (current.paused || current.phase === "paused") return { ...current };
    if (current.phase === "running") {
      current.phase = "waiting";
      current.waitingForVideoSync = false;
      current.nextRunAt = now() + TAG_ENRICH_RESTORE_DELAY_MS;
      current.updatedAt = now();
    } else if (current.phase === "waiting" && !current.nextRunAt) {
      current.waitingForVideoSync = false;
      current.nextRunAt = now() + TAG_ENRICH_RESTORE_DELAY_MS;
      current.updatedAt = now();
    }
    return { ...current };
  }, true);
  scheduleTagEnrichment(meta);
}

function getTagEnrichmentStatus(state: LocalState) {
  if (!TAG_SYNC_ENABLED) {
    return {
      phase: "paused" as const,
      paused: true,
      running: false,
      dismissedAt: null,
      selectedFolderIds: [],
      scopeVideoCount: 0,
      waitingForVideoSync: false,
      batchSize: TAG_ENRICH_BATCH_SIZE_DEFAULT,
      intervalSeconds: TAG_ENRICH_INTERVAL_SECONDS_DEFAULT,
      batchSizeMin: TAG_ENRICH_BATCH_SIZE_MIN,
      batchSizeMax: TAG_ENRICH_BATCH_SIZE_MAX,
      intervalSecondsMin: TAG_ENRICH_INTERVAL_SECONDS_MIN,
      intervalSecondsMax: TAG_ENRICH_INTERVAL_SECONDS_MAX,
      cursorAfterVideoId: 0,
      total: 0,
      totalMissing: 0,
      processed: 0,
      succeeded: 0,
      empty: 0,
      failed: 0,
      tagsBound: 0,
      lastBatchProcessed: 0,
      lastBatchSucceeded: 0,
      lastBatchEmpty: 0,
      lastBatchFailed: 0,
      lastBatchBound: 0,
      startedAt: null,
      finishedAt: null,
      nextRunAt: null,
      retryAttempt: 0,
      riskCount: 0,
      lastRunAt: null,
      updatedAt: 0,
      lastError: "Tag sync is disabled",
      errors: [],
    };
  }
  const meta = ensureTagEnrichmentMeta(state);
  const totalMissing = countMissingSystemTagVideos(state, meta);
  return {
    phase: meta.phase,
    paused: meta.paused,
    running: Boolean(tagEnrichmentTask) || meta.phase === "running",
    dismissedAt: meta.dismissedAt,
    selectedFolderIds: [...meta.selectedFolderIds],
    scopeVideoCount: countTagEnrichmentScopeVideos(state, meta),
    waitingForVideoSync:
      meta.waitingForVideoSync &&
      !meta.paused &&
      (meta.phase === "running" || meta.phase === "waiting"),
    batchSize: meta.batchSize,
    intervalSeconds: meta.intervalSeconds,
    batchSizeMin: TAG_ENRICH_BATCH_SIZE_MIN,
    batchSizeMax: TAG_ENRICH_BATCH_SIZE_MAX,
    intervalSecondsMin: TAG_ENRICH_INTERVAL_SECONDS_MIN,
    intervalSecondsMax: TAG_ENRICH_INTERVAL_SECONDS_MAX,
    cursorAfterVideoId: meta.cursorAfterVideoId,
    total: Math.max(meta.total, meta.processed + totalMissing),
    totalMissing,
    processed: meta.processed,
    succeeded: meta.succeeded,
    empty: meta.empty,
    failed: meta.failed,
    tagsBound: meta.tagsBound,
    lastBatchProcessed: meta.lastBatchProcessed,
    lastBatchSucceeded: meta.lastBatchSucceeded,
    lastBatchEmpty: meta.lastBatchEmpty,
    lastBatchFailed: meta.lastBatchFailed,
    lastBatchBound: meta.lastBatchBound,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    nextRunAt: meta.nextRunAt,
    retryAttempt: meta.retryAttempt,
    riskCount: meta.riskCount,
    lastRunAt: meta.lastRunAt,
    updatedAt: meta.updatedAt,
    lastError: meta.lastError,
    errors: meta.errors.slice(-20),
  };
}

async function updateTagEnrichmentSettings(payload: Record<string, unknown>) {
  const meta = await mutateTagEnrichmentState((state) => {
    const current = ensureTagEnrichmentMeta(state);
    current.batchSize = Math.min(
      TAG_ENRICH_BATCH_SIZE_MAX,
      Math.max(
        TAG_ENRICH_BATCH_SIZE_MIN,
        toInt(payload.batchSize, current.batchSize),
      ),
    );
    current.intervalSeconds = Math.min(
      TAG_ENRICH_INTERVAL_SECONDS_MAX,
      Math.max(
        TAG_ENRICH_INTERVAL_SECONDS_MIN,
        toInt(payload.intervalSeconds, current.intervalSeconds),
      ),
    );
    if (current.phase === "waiting" && !current.paused) {
      current.nextRunAt = resolveTagEnrichmentBatchNextRunAt(
        now(),
        Math.random,
        current.intervalSeconds,
      );
    }
    current.updatedAt = now();
    return { ...current };
  });
  scheduleTagEnrichment(meta);
  return getTagEnrichmentStatus(await readState());
}

function scheduleStage3Reconcile(minutes: number) {
  if (!chrome.alarms?.create) return;
  const delay = Math.max(1, Math.ceil(minutes));
  chrome.alarms.create(STAGE3_RECONCILE_ALARM, {
    delayInMinutes: delay,
  });
}

function collectMappedRemoteMediaIds(state: LocalState) {
  return Array.from(
    new Set(
      state.folders
        .filter((folder) => folder.deletedAt === null)
        .map((folder) => toInt(folder.remoteMediaId, 0))
        .filter((remoteMediaId) => remoteMediaId > 0),
    ),
  ).sort((a, b) => a - b);
}

function pickNextRemoteMediaIdForStage3(
  meta: Stage3ReconcileMeta,
  mappedRemoteMediaIds: number[],
) {
  if (mappedRemoteMediaIds.length === 0) return 0;
  const cursor = Math.max(0, toInt(meta.cursorAfterRemoteMediaId, 0));
  const next =
    mappedRemoteMediaIds.find((id) => id > cursor) ?? mappedRemoteMediaIds[0];
  meta.cursorAfterRemoteMediaId = next;
  return next;
}

async function runStage3Reconcile(trigger: "manual" | "alarm" | "startup") {
  const decision = await withState(async (state) => {
    const meta = ensureStage3ReconcileMeta(state);
    meta.running = true;

    if (!meta.enabled && trigger !== "manual") {
      meta.running = false;
      meta.nextRunAt = null;
      return {
        delayMinutes: null as number | null,
      };
    }

    if (favoritesSyncTask) {
      meta.running = false;
      const delayMinutes = STAGE3_RECONCILE_RETRY_DELAY_MINUTES;
      meta.lastError = "Skipped: primary sync is running";
      meta.nextRunAt = now() + delayMinutes * 60 * 1000;
      return {
        delayMinutes,
      };
    }

    const mappedRemoteMediaIds = collectMappedRemoteMediaIds(state);
    if (mappedRemoteMediaIds.length === 0) {
      meta.running = false;
      meta.lastRunAt = now();
      meta.lastError = null;
      meta.lastRemoteMediaId = null;
      meta.lastSummary = emptyFavoritesSyncSummary();
      if (meta.enabled) {
        meta.nextRunAt = now() + meta.intervalMinutes * 60 * 1000;
        return {
          delayMinutes: meta.intervalMinutes,
        };
      }
      meta.nextRunAt = null;
      return {
        delayMinutes: null,
      };
    }

    const selectedRemoteMediaId = pickNextRemoteMediaIdForStage3(
      meta,
      mappedRemoteMediaIds,
    );
    if (selectedRemoteMediaId <= 0) {
      meta.running = false;
      const delayMinutes = meta.intervalMinutes;
      meta.nextRunAt = now() + delayMinutes * 60 * 1000;
      return {
        delayMinutes,
      };
    }

    try {
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [selectedRemoteMediaId],
      });
      const baseDelay = meta.intervalMinutes;
      const delayMinutes = result.riskBlocked
        ? STAGE3_RECONCILE_RISK_DELAY_MINUTES
        : baseDelay;
      meta.running = false;
      meta.lastRunAt = now();
      meta.lastRemoteMediaId = selectedRemoteMediaId;
      meta.lastSummary = result.summary;
      meta.lastError = result.riskBlocked
        ? "Risk-control blocked (412) during stage3 reconcile"
        : result.errors[0]?.message || null;
      meta.nextRunAt = meta.enabled ? now() + delayMinutes * 60 * 1000 : null;
      return {
        delayMinutes: meta.enabled ? delayMinutes : null,
      };
    } catch (error) {
      const message = isBiliRequestError(error)
        ? formatBiliRequestError(error)
        : error instanceof Error
          ? error.message
          : String(error);
      const isRisk = isBiliRequestError(error)
        ? error.status === 412 || isRiskControlError(message)
        : isRiskControlError(message);
      const delayMinutes = isRisk
        ? STAGE3_RECONCILE_RISK_DELAY_MINUTES
        : STAGE3_RECONCILE_RETRY_DELAY_MINUTES;
      meta.running = false;
      meta.lastRunAt = now();
      meta.lastRemoteMediaId = selectedRemoteMediaId;
      meta.lastError = message;
      meta.nextRunAt = meta.enabled ? now() + delayMinutes * 60 * 1000 : null;
      return {
        delayMinutes: meta.enabled ? delayMinutes : null,
      };
    }
  }, true);

  if (decision.delayMinutes !== null) {
    scheduleStage3Reconcile(decision.delayMinutes);
  } else if (chrome.alarms?.clear) {
    chrome.alarms.clear(STAGE3_RECONCILE_ALARM);
  }
}

function triggerStage3Reconcile(trigger: "manual" | "alarm" | "startup") {
  if (stage3ReconcileTask) return stage3ReconcileTask;
  stage3ReconcileTask = runStage3Reconcile(trigger)
    .catch((error) => {
      console.warn("[stage3-reconcile] failed:", error);
      scheduleStage3Reconcile(STAGE3_RECONCILE_RETRY_DELAY_MINUTES);
    })
    .finally(() => {
      stage3ReconcileTask = null;
    });
  return stage3ReconcileTask;
}

function ensureFolderByNameForImport(state: LocalState, rawName: unknown) {
  const name = normalizeText(rawName);
  if (!name) return null;
  const timestamp = now();
  const existing = state.folders.find(
    (folder) => normalizeKey(folder.name) === normalizeKey(name),
  );
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
    updatedAt: timestamp,
  };
  state.folders.push(created);
  return { folder: created, created: true };
}

function ensureLocalFolderByRemoteId(
  state: LocalState,
  remoteFolder: RemoteFolder,
) {
  const timestamp = now();
  const byRemote = state.folders.find(
    (folder) => folder.remoteMediaId === remoteFolder.remoteId,
  );
  if (byRemote) {
    byRemote.name = remoteFolder.title || byRemote.name;
    byRemote.deletedAt = null;
    byRemote.updatedAt = timestamp;
    return byRemote;
  }

  const byName = state.folders.find(
    (folder) => normalizeKey(folder.name) === normalizeKey(remoteFolder.title),
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
    updatedAt: timestamp,
  };
  state.folders.push(created);
  return created;
}

function isFavoriteFolderFlagged(raw: Record<string, unknown>) {
  const candidates = [
    raw.fav_state,
    raw.favState,
    raw.is_fav,
    raw.favored,
    raw.state,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "boolean") return candidate;
    if (typeof candidate === "number") return candidate > 0;
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed > 0;
    }
  }
  return false;
}

async function pullSingleFavoriteVideoFromBiliToLocal(
  state: LocalState,
  options: { bvid?: unknown; aid?: unknown },
) {
  const requestedBvid = normalizeOutputBvid(normalizeText(options.bvid));
  const requestedAid = toAid(options.aid);
  if (!requestedBvid && requestedAid <= 0) {
    throw new Error("bvid or aid is required for favorite action sync");
  }

  const detail = await fetchBiliJson<Record<string, unknown>>(
    requestedBvid
      ? `${BILI_VIEW_API}?bvid=${encodeURIComponent(requestedBvid)}`
      : `${BILI_VIEW_API}?aid=${requestedAid}`,
    "folderVideos",
  );
  const video = upsertVideoFromRemoteDetail(state, detail);
  if (!video) {
    throw new Error("Failed to parse video detail from Bilibili");
  }

  const resolvedAid = toAid(detail?.aid) || requestedAid;
  const targetFolderIdSet = new Set<number>();
  const reconciledRemoteFolderIdSet = new Set<number>(
    state.folders
      .filter(
        (folder) =>
          folder.deletedAt === null && toInt(folder.remoteMediaId, 0) > 0,
      )
      .map((folder) => folder.id),
  );
  if (resolvedAid > 0) {
    const nav = await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(
      BILI_NAV_API,
      "nav",
    );
    const mid = toInt(nav.mid ?? 0, 0);
    if (!nav.isLogin || mid <= 0) {
      throw new Error("Please login to Bilibili in current browser first");
    }
    const folderResp = await fetchBiliJson<{
      list?: Array<Record<string, unknown>>;
    }>(
      `${BILI_FOLDERS_API}?up_mid=${mid}&type=2&rid=${resolvedAid}`,
      "folders",
    );
    const rows = folderResp.list ?? [];
    if (rows.length > 0) {
      const cachedRemoteFolders = await fetchRemoteFoldersFromBilibili();
      const remoteFolderMap = new Map(
        cachedRemoteFolders.map((item) => [item.remoteId, item]),
      );
      for (const row of rows) {
        const remoteId = pickRemoteFolderId(row);
        if (remoteId <= 0) continue;
        const remoteFolder =
          remoteFolderMap.get(remoteId) ??
          ({
            remoteId,
            title: normalizeText(row.title) || `Bilibili Favorite ${remoteId}`,
            mediaCount: toInt(row.media_count ?? row.mediaCount, 0),
          } as RemoteFolder);
        const localFolder = ensureLocalFolderByRemoteId(state, remoteFolder);
        reconciledRemoteFolderIdSet.add(localFolder.id);
        if (isFavoriteFolderFlagged(row)) {
          targetFolderIdSet.add(localFolder.id);
        }
      }
    }
  }

  const timestamp = now();
  let folderLinksAdded = 0;
  for (const folderId of targetFolderIdSet) {
    const existingLink = state.folderItems.find(
      (item) => item.folderId === folderId && item.videoId === video.id,
    );
    if (!existingLink) {
      state.folderItems.push({
        id: state.counters.folderItem++,
        folderId,
        videoId: video.id,
        addedAt: timestamp,
      });
      folderLinksAdded += 1;
      continue;
    }
  }
  let folderLinksRemoved = 0;
  if (reconciledRemoteFolderIdSet.size > 0) {
    state.folderItems = state.folderItems.filter((item) => {
      if (item.videoId !== video.id) return true;
      if (!reconciledRemoteFolderIdSet.has(item.folderId)) return true;
      if (targetFolderIdSet.has(item.folderId)) return true;
      folderLinksRemoved += 1;
      return false;
    });
    if (folderLinksRemoved > 0) {
      markOrphanVideosDeleted(state);
    }
  }
  video.updatedAt = now();

  return {
    videoId: video.id,
    bvid: video.bvid,
    folderLinksAdded,
    folderLinksRemoved,
    mappedFolders: targetFolderIdSet.size,
  };
}

type SyncSummary = {
  foldersDetected: number;
  foldersSynced: number;
  videosProcessed: number;
  videosUpserted: number;
  skippedMissingBvid: number;
  unresolvedMissingBvid: number;
  unavailableRemoteVideos: number;
  incompleteFolders: number;
  folderLinksAdded: number;
  folderLinksRemoved: number;
  tagsBound: number;
  errorCount: number;
};

function ensureFavoritesSyncJobMeta(state: LocalState) {
  if (!state.syncMeta) {
    state.syncMeta = defaultState().syncMeta;
  }
  if (!state.syncMeta.favoritesJob) {
    state.syncMeta.favoritesJob = defaultFavoritesSyncJobMeta();
  }
  return state.syncMeta.favoritesJob;
}

function ensureArticleFolderByNameForImport(
  state: LocalState,
  rawName: unknown,
) {
  state.articleFolders ??= [];
  const name = normalizeText(rawName);
  if (!name) return null;
  const timestamp = now();
  const existing = (state.articleFolders ?? []).find(
    (folder) => normalizeKey(folder.name) === normalizeKey(name),
  );
  if (existing) {
    existing.deletedAt = null;
    existing.updatedAt = timestamp;
    return { folder: existing, created: false };
  }

  const created: ArticleFolderRecord = {
    id: Math.max(1, toInt(state.counters.articleFolder, 1)),
    name,
    description: "Imported",
    groupName: null,
    sortOrder: activeArticleFolders(state).length + 1,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.counters.articleFolder = created.id + 1;
  state.articleFolders.push(created);
  return { folder: created, created: true };
}

function applyFavoritesSyncFailurePolicy(
  job: FavoritesSyncJob,
  error: unknown,
  message: string,
) {
  const policy = resolveFavoritesFailurePolicy({
    status: isBiliRequestError(error) ? error.status : 0,
    message,
    attempt: job.retry.attempt + 1,
    detectedAt: now(),
    retryAfterMs: isBiliRequestError(error) ? error.retryAfterMs : null,
    previousRiskCount: job.retry.riskCount,
    random: Math.random,
  });
  job.phase = policy.phase;
  job.retry = {
    attempt: policy.attempt,
    nextRetryAt: policy.nextRetryAt,
    automatic: policy.automatic,
    reason: policy.reason,
    riskCount: policy.riskCount,
  };
  if (policy.phase === "paused") job.riskBlocked = true;
  return policy;
}

function scheduleFavoritesSyncRetry(job: FavoritesSyncJob | null) {
  if (
    !job ||
    !job.retry.automatic ||
    !job.retry.nextRetryAt ||
    !chrome.alarms?.create
  ) {
    if (chrome.alarms?.clear) chrome.alarms.clear(FAVORITES_SYNC_RETRY_ALARM);
    return;
  }
  chrome.alarms.create(FAVORITES_SYNC_RETRY_ALARM, {
    when: Math.max(now() + 1000, job.retry.nextRetryAt),
  });
}

async function syncFromBilibiliToState(
  state: LocalState,
  options: {
    selectedRemoteFolderIds?: number[];
    resumePageByFolder?: Record<string, number>;
    onProgress?: (progress: FavoritesSyncProgress) => void;
    job?: FavoritesSyncJob;
    onCheckpoint?: (
      state: LocalState,
      job: FavoritesSyncJob,
    ) => Promise<void> | void;
    shouldStop?: () => boolean;
  },
) {
  const favoritesJobMeta = ensureFavoritesSyncJobMeta(state);
  const job = options.job ?? null;
  const deletionCandidatesByFolder = job
    ? job.deletionCandidatesByFolder
    : favoritesJobMeta.deletionCandidatesByFolder;
  const selectedIdSet = new Set(
    (options.selectedRemoteFolderIds ?? job?.selectedRemoteFolderIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const remoteFolders = await fetchRemoteFoldersFromBilibili();
  reconcileRemoteFolderSortOrder(state.folders, remoteFolders);
  const foldersToSync =
    selectedIdSet.size > 0
      ? Array.from(selectedIdSet)
          .map((remoteId) => {
            const remoteFolder = remoteFolders.find(
              (item) => item.remoteId === remoteId,
            );
            if (remoteFolder) return remoteFolder;
            const localFolder = state.folders.find(
              (folder) =>
                folder.deletedAt === null && folder.remoteMediaId === remoteId,
            );
            return {
              remoteId,
              title: localFolder?.name || `Bilibili Favorite ${remoteId}`,
              mediaCount: 0,
            } as RemoteFolder;
          })
          .filter((item) => item.remoteId > 0)
      : remoteFolders;
  const totalEstimate = foldersToSync.reduce(
    (sum, folder) => sum + Math.max(0, Number(folder.mediaCount || 0)),
    0,
  );

  let foldersSynced = job?.summary.foldersSynced ?? 0;
  let videosProcessed = job?.summary.videosProcessed ?? 0;
  let videosUpserted = job?.summary.videosUpserted ?? 0;
  let skippedMissingBvid = job?.summary.skippedMissingBvid ?? 0;
  let unresolvedMissingBvid = job?.summary.unresolvedMissingBvid ?? 0;
  let unavailableRemoteVideos = job?.summary.unavailableRemoteVideos ?? 0;
  let incompleteFolderCount = job?.summary.incompleteFolders ?? 0;
  let folderLinksAdded = job?.summary.folderLinksAdded ?? 0;
  let folderLinksRemoved = job?.summary.folderLinksRemoved ?? 0;
  let tagsBound = job?.summary.tagsBound ?? 0;
  let riskBlocked = false;
  const invalidVideoIdSet = new Set<number>(job?.invalidVideoIds ?? []);
  const errors: Array<{ folder: string; message: string }> =
    job?.errors.slice() ?? [];
  const unresolvedItems: FavoritesSyncUnresolvedItem[] =
    job?.unresolvedItems.slice() ?? [];
  const incompleteFolders: FavoritesSyncIncompleteFolder[] =
    job?.incompleteFolders.slice() ?? [];
  const unavailableFolders: FavoritesSyncUnavailableFolder[] =
    job?.unavailableFolders.slice() ?? [];
  let progressCurrent = job?.current ?? 0;
  let videosSinceCooldown = 0;
  let stopped = false;
  const resumePageByFolder: Record<string, number> = {};
  for (const [remoteIdRaw, pageRaw] of Object.entries(
    options.resumePageByFolder ?? {},
  )) {
    const remoteId = toInt(remoteIdRaw);
    const page = toInt(pageRaw);
    if (remoteId > 0 && page > 1) {
      resumePageByFolder[String(remoteId)] = page;
    }
  }
  if (job?.currentFolderRemoteId && job.nextPage > 1) {
    resumePageByFolder[String(job.currentFolderRemoteId)] = job.nextPage;
  }
  if (job) {
    job.phase = "running";
    job.folderTotal = foldersToSync.length;
    job.total = totalEstimate;
    job.summary.foldersDetected = foldersToSync.length;
    job.updatedAt = now();
  }
  const checkpointJob = async () => {
    if (!job) return;
    job.current = progressCurrent;
    job.summary = {
      foldersDetected: foldersToSync.length,
      foldersSynced,
      videosProcessed,
      videosUpserted,
      skippedMissingBvid,
      unresolvedMissingBvid,
      unavailableRemoteVideos,
      incompleteFolders: incompleteFolderCount,
      folderLinksAdded,
      folderLinksRemoved,
      tagsBound,
      errorCount: errors.length,
    };
    job.invalidVideoIds = Array.from(invalidVideoIdSet).sort((a, b) => a - b);
    job.errors = errors.slice(-100);
    job.unresolvedItems = unresolvedItems.slice(-100);
    job.incompleteFolders = incompleteFolders.slice(-100);
    job.unavailableFolders = unavailableFolders.slice(-100);
    job.lastError = errors.at(-1)?.message ?? null;
    job.riskBlocked = riskBlocked;
    job.updatedAt = now();
    await options.onCheckpoint?.(state, job);
  };
  const stopIfRequested = async () => {
    if (stopped || !options.shouldStop?.()) return stopped;
    stopped = true;
    if (job) {
      job.phase = "paused";
      job.retry = {
        attempt: job.retry.attempt,
        nextRetryAt: null,
        automatic: false,
        reason: "user-stopped",
        riskCount: job.retry.riskCount,
      };
      job.lastError = null;
      await checkpointJob();
    }
    return true;
  };
  const emitProgress = (
    progress: Omit<FavoritesSyncProgress, "total" | "current">,
  ) => {
    options.onProgress?.({
      total: totalEstimate,
      current: progressCurrent,
      ...progress,
    });
  };

  folderLoop: for (const [
    folderOffset,
    remoteFolder,
  ] of foldersToSync.entries()) {
    if (await stopIfRequested()) break;
    if (job?.completedRemoteFolderIds.includes(remoteFolder.remoteId)) continue;
    const folderPosition = folderOffset + 1;
    try {
      let throttleState: FavoritesSyncThrottleState =
        createFavoritesSyncThrottleState({
          folderMediaCount: Number(remoteFolder.mediaCount || 0),
          totalVideosProcessed: videosProcessed,
        });
      if (folderOffset > 0) {
        await sleep(resolveFavoritesFolderGapMs(throttleState));
      }
      const localFolder = ensureLocalFolderByRemoteId(state, remoteFolder);
      const isResumingCurrentFolder =
        job?.currentFolderRemoteId === remoteFolder.remoteId;
      if (!isResumingCurrentFolder) foldersSynced += 1;
      if (job) {
        job.currentFolderRemoteId = remoteFolder.remoteId;
        job.currentFolderTitle = remoteFolder.title;
        job.currentFolderIndex = folderPosition;
        job.folderTotal = foldersToSync.length;
        job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] ??= [];
      }
      emitProgress({
        folderTitle: remoteFolder.title,
        folderIndex: folderPosition,
        folderTotal: foldersToSync.length,
        message: `Syncing: ${remoteFolder.title}`,
      });
      const pageSize = 20;
      let page = Math.max(
        1,
        toInt(
          isResumingCurrentFolder
            ? job?.nextPage
            : resumePageByFolder[String(remoteFolder.remoteId)] || 1,
        ),
      );
      if (page > 1) {
        emitProgress({
          folderTitle: remoteFolder.title,
          folderIndex: folderPosition,
          folderTotal: foldersToSync.length,
          message: `Resuming from page ${page}: ${remoteFolder.title}`,
        });
      }
      let folderFailed = false;
      let folderIncompleteReason = "";
      let folderUnavailableCount = 0;
      const remoteBvidKeys = new Set<string>(
        job?.seenBvidKeysByFolder[String(remoteFolder.remoteId)] ?? [],
      );
      let observedRowCount =
        job?.observedRowCountByFolder[String(remoteFolder.remoteId)] ?? 0;
      let expectedRemoteCount = Math.max(0, toInt(remoteFolder.mediaCount, 0));
      for (let index = incompleteFolders.length - 1; index >= 0; index -= 1) {
        if (
          incompleteFolders[index]?.remoteFolderId === remoteFolder.remoteId
        ) {
          incompleteFolders.splice(index, 1);
        }
      }
      incompleteFolderCount = incompleteFolders.length;
      for (let index = unavailableFolders.length - 1; index >= 0; index -= 1) {
        if (
          unavailableFolders[index]?.remoteFolderId !== remoteFolder.remoteId
        ) {
          continue;
        }
        unavailableRemoteVideos = Math.max(
          0,
          unavailableRemoteVideos - unavailableFolders[index].unavailable,
        );
        unavailableFolders.splice(index, 1);
      }
      if (page === 1) {
        for (let index = unresolvedItems.length - 1; index >= 0; index -= 1) {
          if (
            unresolvedItems[index]?.remoteFolderId === remoteFolder.remoteId
          ) {
            unresolvedItems.splice(index, 1);
          }
        }
        unresolvedMissingBvid = unresolvedItems.length;
      }
      let folderHasUnresolved = unresolvedItems.some(
        (item) => item.remoteFolderId === remoteFolder.remoteId,
      );
      if (page > 1 && remoteBvidKeys.size === 0) {
        for (const item of state.folderItems) {
          if (item.folderId !== localFolder.id) continue;
          const video = state.videos.find(
            (candidate) => candidate.id === item.videoId,
          );
          const key = normalizeKey(video?.bvid);
          if (key) remoteBvidKeys.add(key);
        }
        if (!job)
          observedRowCount = Math.max(observedRowCount, remoteBvidKeys.size);
      }
      if (job) {
        job.nextPage = page;
        job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] =
          Array.from(remoteBvidKeys).sort();
        job.observedRowCountByFolder[String(remoteFolder.remoteId)] =
          observedRowCount;
      }
      while (true) {
        if (await stopIfRequested()) break folderLoop;
        const query = new URLSearchParams({
          media_id: String(remoteFolder.remoteId),
          pn: String(page),
          ps: String(pageSize),
          keyword: "",
          order: "mtime",
          type: "0",
          tid: "0",
          platform: "web",
        });

        let folderMediaData: BiliFolderMediaListData;
        const pageFetchStartedAt = now();
        try {
          folderMediaData = await fetchBiliJson<BiliFolderMediaListData>(
            `${BILI_FOLDER_VIDEOS_API}?${query.toString()}`,
            "folderVideos",
          );
        } catch (error) {
          const message = isBiliRequestError(error)
            ? formatBiliRequestError(error)
            : error instanceof Error
              ? error.message
              : String(error);
          errors.push({
            folder: remoteFolder.title,
            message,
          });
          const isRisk = isBiliRequestError(error)
            ? error.status === 412 || isRiskControlError(message)
            : isRiskControlError(message);
          if (isRisk) {
            riskBlocked = true;
          }
          folderFailed = true;
          resumePageByFolder[String(remoteFolder.remoteId)] = page;
          if (job) {
            applyFavoritesSyncFailurePolicy(job, error, message);
            job.nextPage = page;
            job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] =
              Array.from(remoteBvidKeys).sort();
            await checkpointJob();
          }
          break;
        }

        const medias = Array.isArray(folderMediaData.medias)
          ? folderMediaData.medias
          : [];
        const responseTotal = Number(folderMediaData.info?.media_count);
        if (Number.isFinite(responseTotal) && responseTotal >= 0) {
          expectedRemoteCount = Math.trunc(responseTotal);
        }
        if (medias.length === 0) {
          if (folderMediaData.has_more === true) {
            folderIncompleteReason =
              "Remote response reported more pages but returned an empty page";
          } else if (observedRowCount < expectedRemoteCount) {
            folderUnavailableCount = expectedRemoteCount - observedRowCount;
          }
          break;
        }
        const responseMs = Math.max(0, now() - pageFetchStartedAt);

        let pageAbortedByRisk = false;
        for (const [mediaIndex, media] of medias.entries()) {
          if (options.shouldStop?.()) {
            await stopIfRequested();
            break;
          }
          const resolvedIdentity = await resolveFavoriteMediaBvid(media);
          const bvid = resolvedIdentity.bvid;
          if (!bvid) {
            if (resolvedIdentity.riskBlocked) {
              riskBlocked = true;
              folderFailed = true;
              pageAbortedByRisk = true;
              errors.push({
                folder: remoteFolder.title,
                message:
                  resolvedIdentity.reason ||
                  "Bilibili risk-control blocked BV resolution",
              });
              if (job) {
                applyFavoritesSyncFailurePolicy(
                  job,
                  resolvedIdentity.error,
                  resolvedIdentity.reason ||
                    "Bilibili risk-control blocked BV resolution",
                );
              }
              break;
            }
            skippedMissingBvid += 1;
            folderHasUnresolved = true;
            const unresolved: FavoritesSyncUnresolvedItem = {
              remoteFolderId: remoteFolder.remoteId,
              folder: remoteFolder.title,
              aid: resolvedIdentity.aid,
              title: normalizeText(media.title),
              reason: resolvedIdentity.reason || "BV id could not be resolved",
            };
            const exists = unresolvedItems.some(
              (item) =>
                item.remoteFolderId === unresolved.remoteFolderId &&
                item.aid === unresolved.aid &&
                item.title === unresolved.title,
            );
            if (!exists) {
              unresolvedItems.push(unresolved);
              unresolvedMissingBvid += 1;
            }
            continue;
          }
          remoteBvidKeys.add(normalizeKey(bvid));
          videosProcessed += 1;
          videosSinceCooldown += 1;
          const timestamp = now();
          const publishAt = toMillis(media.pubtime ?? media.ctime, timestamp);
          const favAt = resolveRemoteFavoriteAddedAt(
            media.fav_time,
            page,
            pageSize,
            mediaIndex,
          );
          const existing = state.videos.find(
            (video) => normalizeKey(video.bvid) === normalizeKey(bvid),
          );
          const basePayload = {
            bvid,
            title: normalizeText(media.title) || bvid,
            coverUrl: normalizeCoverUrl(media.cover),
            uploader:
              normalizeText(
                (media.upper as { name?: string } | undefined)?.name,
              ) || "Unknown uploader",
            uploaderSpaceUrl: normalizeBiliSpaceUrl(
              (media.upper as { space?: string; mid?: number } | undefined)
                ?.space,
              (media.upper as { mid?: number } | undefined)?.mid,
            ),
            description: normalizeText(media.intro),
            partition: normalizeVideoPartition(media.tname),
            publishAt,
            bvidUrl: normalizeBiliVideoUrl(media.link, bvid),
            isInvalid: isFavoriteMediaInvalid(media),
          };

          const video: VideoRecord = existing || {
            id: state.counters.video++,
            ...basePayload,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          video.bvid = basePayload.bvid;
          video.title = basePayload.title;
          video.coverUrl = basePayload.coverUrl;
          video.uploader = basePayload.uploader;
          video.uploaderSpaceUrl = basePayload.uploaderSpaceUrl;
          video.description = basePayload.description;
          video.partition = basePayload.partition;
          video.publishAt = basePayload.publishAt;
          video.bvidUrl = basePayload.bvidUrl;
          video.isInvalid = basePayload.isInvalid;
          video.deletedAt = null;
          video.updatedAt = timestamp;

          if (basePayload.isInvalid) {
            invalidVideoIdSet.add(video.id);
          }

          if (!existing) {
            state.videos.push(video);
          }
          videosUpserted += 1;

          const existingLink = state.folderItems.find(
            (item) =>
              item.folderId === localFolder.id && item.videoId === video.id,
          );
          if (!existingLink) {
            state.folderItems.push({
              id: state.counters.folderItem++,
              folderId: localFolder.id,
              videoId: video.id,
              addedAt: favAt,
            });
            folderLinksAdded += 1;
          }
        }
        if (stopped) break folderLoop;
        if (pageAbortedByRisk) {
          resumePageByFolder[String(remoteFolder.remoteId)] = page;
          if (job) {
            job.nextPage = page;
            job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] =
              Array.from(remoteBvidKeys).sort();
            job.observedRowCountByFolder[String(remoteFolder.remoteId)] =
              observedRowCount;
            await checkpointJob();
          }
          break;
        }
        observedRowCount += medias.length;
        if (job && job.retry.attempt > 0) {
          const nextAttempt = resolveSuccessfulRetryAttempt(job.retry.attempt);
          job.retry = {
            attempt: nextAttempt,
            nextRetryAt: null,
            automatic: false,
            reason: nextAttempt > 0 ? "recovering" : null,
            riskCount: Math.max(0, job.retry.riskCount - 1),
          };
        }
        progressCurrent += medias.length;
        emitProgress({
          folderTitle: remoteFolder.title,
          folderIndex: folderPosition,
          folderTotal: foldersToSync.length,
          message: `Syncing page ${page}: ${remoteFolder.title}`,
        });
        throttleState = updateFavoritesSyncThrottleState(throttleState, {
          responseMs,
          pageMediaCount: medias.length,
          totalVideosProcessed: videosProcessed,
        });

        const remoteHasMore = resolveFolderHasMore(
          folderMediaData,
          page,
          pageSize,
          medias.length,
        );
        if (!remoteHasMore && observedRowCount < expectedRemoteCount) {
          folderUnavailableCount = expectedRemoteCount - observedRowCount;
        } else if (!remoteHasMore && observedRowCount > expectedRemoteCount) {
          folderIncompleteReason =
            "Remote response returned more rows than its reported total";
        }
        if (remoteHasMore) {
          page += 1;
          resumePageByFolder[String(remoteFolder.remoteId)] = page;
          if (job) {
            job.nextPage = page;
            job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] =
              Array.from(remoteBvidKeys).sort();
            job.observedRowCountByFolder[String(remoteFolder.remoteId)] =
              observedRowCount;
            await checkpointJob();
          }
        }
        const cooldownPolicy = resolveFavoritesCooldownPolicy(throttleState);
        if (
          videosSinceCooldown >= cooldownPolicy.thresholdVideos &&
          (remoteHasMore || foldersSynced < foldersToSync.length)
        ) {
          videosSinceCooldown = 0;
          await sleep(cooldownPolicy.delayMs);
        }
        if (!remoteHasMore) {
          delete resumePageByFolder[String(remoteFolder.remoteId)];
          break;
        }
        await sleep(resolveFavoritesPageGapMs(throttleState));
      }

      const incompleteReason = folderFailed
        ? riskBlocked
          ? "Bilibili risk-control interrupted the folder scan"
          : "A remote request failed before the folder scan completed"
        : folderHasUnresolved
          ? "One or more remote rows could not be resolved to a BV id"
          : folderIncompleteReason;

      if (incompleteReason) {
        incompleteFolders.push({
          remoteFolderId: remoteFolder.remoteId,
          folder: remoteFolder.title,
          expected: expectedRemoteCount,
          observed: observedRowCount,
          reason: incompleteReason,
        });
        incompleteFolderCount = incompleteFolders.length;
        if (job) {
          if (!folderFailed) {
            job.nextPage = 1;
            job.seenBvidKeysByFolder[String(remoteFolder.remoteId)] = [];
            job.observedRowCountByFolder[String(remoteFolder.remoteId)] = 0;
          }
          await checkpointJob();
        }
      } else if (folderUnavailableCount > 0) {
        unavailableRemoteVideos += folderUnavailableCount;
        unavailableFolders.push({
          remoteFolderId: remoteFolder.remoteId,
          folder: remoteFolder.title,
          expected: expectedRemoteCount,
          observed: observedRowCount,
          unavailable: folderUnavailableCount,
          reason:
            "Bilibili did not return these entries; they are usually invalid, private, or otherwise unavailable",
        });
        // The returned rows are safe to import, but an inferred unavailable gap
        // must never authorize remote-deletion reconciliation.
        if (job) {
          job.completedRemoteFolderIds = Array.from(
            new Set([...job.completedRemoteFolderIds, remoteFolder.remoteId]),
          ).sort((left, right) => left - right);
          delete job.seenBvidKeysByFolder[String(remoteFolder.remoteId)];
          delete job.observedRowCountByFolder[String(remoteFolder.remoteId)];
          job.currentFolderRemoteId = null;
          job.currentFolderTitle = remoteFolder.title;
          job.currentFolderIndex = folderPosition;
          job.nextPage = 1;
          await checkpointJob();
        }
      } else {
        const existingLocalKeys = new Set<string>();
        for (const item of state.folderItems) {
          if (item.folderId !== localFolder.id) continue;
          const video = state.videos.find(
            (candidate) => candidate.id === item.videoId,
          );
          const key = normalizeKey(video?.bvid);
          if (key) existingLocalKeys.add(key);
        }
        const omittedKeys = Array.from(existingLocalKeys)
          .filter((key) => !remoteBvidKeys.has(key))
          .sort();
        const priorCandidates = new Set(
          deletionCandidatesByFolder[String(remoteFolder.remoteId)] ?? [],
        );
        const confirmedRemovalKeys = new Set(
          omittedKeys.filter((key) => priorCandidates.has(key)),
        );
        if (confirmedRemovalKeys.size > 0) {
          state.folderItems = state.folderItems.filter((item) => {
            if (item.folderId !== localFolder.id) return true;
            const video = state.videos.find(
              (candidate) => candidate.id === item.videoId,
            );
            if (!confirmedRemovalKeys.has(normalizeKey(video?.bvid)))
              return true;
            folderLinksRemoved += 1;
            return false;
          });
          markOrphanVideosDeleted(state);
        }
        deletionCandidatesByFolder[String(remoteFolder.remoteId)] = omittedKeys;
        if (job) {
          job.completedRemoteFolderIds = Array.from(
            new Set([...job.completedRemoteFolderIds, remoteFolder.remoteId]),
          ).sort((left, right) => left - right);
          delete job.seenBvidKeysByFolder[String(remoteFolder.remoteId)];
          delete job.observedRowCountByFolder[String(remoteFolder.remoteId)];
          job.currentFolderRemoteId = null;
          job.currentFolderTitle = remoteFolder.title;
          job.currentFolderIndex = folderPosition;
          job.nextPage = 1;
          await checkpointJob();
        }
      }

      if (riskBlocked) {
        errors.push({
          folder: "__sync__",
          message:
            "Bilibili risk-control (412) detected. Stop and retry later.",
        });
        if (job) await checkpointJob();
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
        message,
      });
      const isRiskBlocked = isBiliRequestError(error)
        ? error.status === 412 || isRiskControlError(message)
        : isRiskControlError(message);
      if (job) applyFavoritesSyncFailurePolicy(job, error, message);
      if (isRiskBlocked) {
        riskBlocked = true;
        errors.push({
          folder: "__sync__",
          message:
            "Bilibili risk-control (412) detected. Stop and retry later.",
        });
        if (job) {
          await checkpointJob();
        }
        break;
      }
      if (job) {
        await checkpointJob();
      }
    }
  }

  const summary: SyncSummary = {
    foldersDetected: foldersToSync.length,
    foldersSynced,
    videosProcessed,
    videosUpserted,
    skippedMissingBvid,
    unresolvedMissingBvid,
    unavailableRemoteVideos,
    incompleteFolders: incompleteFolderCount,
    folderLinksAdded,
    folderLinksRemoved,
    tagsBound,
    errorCount: errors.length,
  };

  const MAX_RETURN_ERRORS = 20;
  const returnedErrors = errors.slice(0, MAX_RETURN_ERRORS);
  const errorsOmitted = Math.max(0, errors.length - returnedErrors.length);
  const invalidVideoIds = Array.from(invalidVideoIdSet).sort((a, b) => a - b);

  if (job) {
    job.summary = { ...summary };
    job.invalidVideoIds = invalidVideoIds;
    job.errors = errors.slice(-100);
    job.unresolvedItems = unresolvedItems.slice(-100);
    job.incompleteFolders = incompleteFolders.slice(-100);
    job.unavailableFolders = unavailableFolders.slice(-100);
    job.riskBlocked = riskBlocked;
    job.lastError = returnedErrors.at(-1)?.message ?? null;
    job.current = videosProcessed;
    job.updatedAt = now();
    if (riskBlocked || stopped) job.phase = "paused";
  }

  return {
    ok: true,
    summary,
    stopped,
    completed: job
      ? !stopped &&
        foldersToSync.every((folder) =>
          job.completedRemoteFolderIds.includes(folder.remoteId),
        )
      : !riskBlocked &&
        incompleteFolders.length === 0 &&
        Object.keys(resumePageByFolder).length === 0,
    hasMore: false,
    nextOffset: null,
    hasMorePage: false,
    nextPage: null,
    riskBlocked,
    resumePageByFolder,
    invalidVideosDetected: invalidVideoIds.length,
    invalidVideoIds,
    unresolvedItems: unresolvedItems.slice(-100),
    incompleteFolders: incompleteFolders.slice(-100),
    unavailableFolders: unavailableFolders.slice(-100),
    errors: returnedErrors,
    errorsOmitted,
    syncedAt: now(),
  };
}

function getFavoritesSyncStatus(state: LocalState) {
  const meta = state.syncMeta.favoritesJob;
  const status = meta.active
    ? statusFromFavoritesSyncJob(
        meta.active,
        Boolean(favoritesSyncTask) && meta.active.phase === "running",
      )
    : meta.lastStatus;
  return {
    ...status,
    resumePageByFolder: { ...status.resumePageByFolder },
    invalidVideoIds: [...status.invalidVideoIds],
    summary: { ...status.summary },
    errors: status.errors.slice(-30),
    unresolvedItems: status.unresolvedItems.slice(-100),
    incompleteFolders: status.incompleteFolders.slice(-100),
    unavailableFolders: status.unavailableFolders.slice(-100),
  };
}

function getInvalidVideoRecoveryStatus() {
  return {
    ...invalidVideoRecoveryStatus,
  };
}

function updateInvalidVideoRecoveryStatus(
  patch: Partial<InvalidVideoRecoveryStatus>,
) {
  invalidVideoRecoveryStatus = {
    ...invalidVideoRecoveryStatus,
    ...patch,
  };
}

function getFollowingUpImportStatus() {
  return {
    ...followingUpImportStatus,
  };
}

function updateFollowingUpImportStatus(
  patch: Partial<FollowingUpImportStatus>,
) {
  followingUpImportStatus = {
    ...followingUpImportStatus,
    ...patch,
  };
}

async function importFollowingUpsToState(initialState: LocalState) {
  const baseFollowedUps = [...initialState.followedUps];
  const importedRecords: NormalizedFollowedUpRecord[] = [];
  let total = 0;
  let current = 0;
  let failed = 0;
  let page = 1;

  while (true) {
    const query = new URLSearchParams({
      vmid: String(
        (
          await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(
            BILI_NAV_API,
            "nav",
          )
        ).mid ?? 0,
      ),
      pn: String(page),
      ps: String(BILI_FOLLOWING_UPS_PAGE_SIZE),
      order: "desc",
    });

    let payload: BiliFollowingUpsListData;
    try {
      payload = await fetchBiliJson<BiliFollowingUpsListData>(
        `${BILI_FOLLOWING_UPS_API}?${query.toString()}`,
        "followings",
      );
    } catch (error) {
      failed += 1;
      const message = isBiliRequestError(error)
        ? formatBiliRequestError(error)
        : error instanceof Error
          ? error.message
          : String(error);
      const isRisk = isBiliRequestError(error)
        ? error.status === 412 || isRiskControlError(message)
        : isRiskControlError(message);
      updateFollowingUpImportStatus({
        running: true,
        total,
        current,
        failed,
        lastError: message,
      });
      if (isRisk) {
        break;
      }
      break;
    }

    const rows = payload.list ?? payload.items ?? payload.cards ?? [];
    const totalCandidate = toInt(payload.total, total);
    if (totalCandidate > 0) {
      total = totalCandidate;
    }
    if (rows.length === 0) {
      break;
    }

    const normalizedPageRecords = rows
      .map((item) => normalizeFollowedUpRecord(item))
      .filter((item): item is NormalizedFollowedUpRecord => !!item);

    importedRecords.push(...normalizedPageRecords);
    current = importedRecords.length;

    await withState((state) => {
      const merged = mergeFollowedUpRecords(
        baseFollowedUps,
        importedRecords,
        now(),
      );
      state.followedUps = merged.records;
      updateFollowingUpImportStatus({
        running: true,
        total: Math.max(total, current),
        current,
        created: merged.created,
        updated: merged.updated,
        failed,
        lastError: null,
      });
    }, true);

    if (rows.length < BILI_FOLLOWING_UPS_PAGE_SIZE) {
      break;
    }

    page += 1;
    await sleep(BILI_FOLLOWING_UPS_PAGE_GAP_MS);
  }

  await withState((state) => {
    const merged = mergeFollowedUpRecords(
      baseFollowedUps,
      importedRecords,
      now(),
    );
    state.followedUps = merged.records;
    updateFollowingUpImportStatus({
      running: true,
      total: Math.max(total, current),
      current,
      created: merged.created,
      updated: merged.updated,
      failed,
      lastError: followingUpImportStatus.lastError,
    });
  }, true);
}

async function runFollowingUpImportTask() {
  const nav = await fetchBiliJson<{ isLogin?: boolean; mid?: number }>(
    BILI_NAV_API,
    "nav",
  );
  const mid = toInt(nav.mid ?? 0, 0);
  if (!nav.isLogin || mid <= 0) {
    throw new Error("Please login to Bilibili in current browser first");
  }

  updateFollowingUpImportStatus({
    running: true,
    total: 0,
    current: 0,
    created: 0,
    updated: 0,
    failed: 0,
    lastError: null,
  });

  const initialState = await readState();
  await importFollowingUpsToState(initialState);
}

function startFollowingUpImportTask() {
  if (followingUpImportTask) {
    return false;
  }

  updateFollowingUpImportStatus({
    ...defaultFollowingUpImportStatus(),
    running: true,
  });

  followingUpImportTask = runFollowingUpImportTask()
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      updateFollowingUpImportStatus({
        running: false,
        lastError: message,
      });
    })
    .finally(() => {
      updateFollowingUpImportStatus({
        running: false,
      });
      followingUpImportTask = null;
    });

  return true;
}

async function fetchInvalidVideoRecoveryMetadataFromBiliPlus(
  video: Pick<VideoRecord, "bvid">,
) {
  const bvid = normalizeOutputBvid(normalizeText(video.bvid));
  if (!bvid) {
    return {
      kind: "not_found" as const,
    };
  }

  const query = new URLSearchParams({
    id: bvid,
  });

  const response = await fetchWithTimeout(
    `${INVALID_VIDEO_RECOVERY_API}?${query.toString()}`,
    {
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    },
    INVALID_VIDEO_RECOVERY_TIMEOUT_MS,
    "Invalid video recovery request",
  );

  if (!response.ok) {
    if (response.status === 404) {
      return {
        kind: "not_found" as const,
      };
    }
    throw new Error(
      `Invalid video recovery request failed (${response.status})`,
    );
  }

  const payload = (await response.json()) as {
    code?: number;
    message?: string;
    data?: Record<string, unknown> | null;
  };

  if (payload?.code && payload.code !== 0 && !payload.data) {
    return {
      kind: "not_found" as const,
    };
  }

  const providerData = payload?.data ?? null;
  const recovered = normalizeRecoveredInvalidVideoMetadata({
    title: typeof providerData?.title === "string" ? providerData.title : null,
    coverUrl: typeof providerData?.pic === "string" ? providerData.pic : null,
    description:
      typeof providerData?.description === "string"
        ? providerData.description
        : null,
  });

  if (!recovered.title && !recovered.coverUrl && !recovered.description) {
    return {
      kind: "not_found" as const,
    };
  }

  return {
    kind: "ok" as const,
    recovered,
  };
}

async function runInvalidVideoRecoveryTask(videoIds: number[]) {
  const dedupedVideoIds = Array.from(
    new Set(videoIds.map((id) => toInt(id)).filter((id) => id > 0)),
  );
  const targets = await withState((state) => {
    const targetIdSet = new Set(dedupedVideoIds);
    return state.videos
      .filter((video) => targetIdSet.has(video.id))
      .filter((video) => video.deletedAt === null && video.isInvalid)
      .map((video) => ({
        id: video.id,
        bvid: video.bvid,
      }));
  }, false);

  updateInvalidVideoRecoveryStatus({
    running: true,
    total: targets.length,
    current: 0,
    recovered: 0,
    notFound: 0,
    failed: 0,
    lastError: null,
  });

  for (const target of targets) {
    try {
      const result =
        await fetchInvalidVideoRecoveryMetadataFromBiliPlus(target);
      if (result.kind === "not_found") {
        updateInvalidVideoRecoveryStatus({
          current: invalidVideoRecoveryStatus.current + 1,
          notFound: invalidVideoRecoveryStatus.notFound + 1,
        });
        continue;
      }

      await withState((state) => {
        const video = state.videos.find(
          (item) => item.id === target.id && item.deletedAt === null,
        );
        if (!video || !video.isInvalid) return false;
        const merged = mergeRecoveredInvalidVideoFields(
          video,
          result.recovered,
        );
        if (merged.changed) {
          video.updatedAt = now();
        }
        return merged.changed;
      }, true);

      updateInvalidVideoRecoveryStatus({
        current: invalidVideoRecoveryStatus.current + 1,
        recovered: invalidVideoRecoveryStatus.recovered + 1,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateInvalidVideoRecoveryStatus({
        current: invalidVideoRecoveryStatus.current + 1,
        failed: invalidVideoRecoveryStatus.failed + 1,
        lastError: message,
      });
    }

    if (invalidVideoRecoveryStatus.current < invalidVideoRecoveryStatus.total) {
      await sleep(INVALID_VIDEO_RECOVERY_GAP_MS);
    }
  }
}

async function startInvalidVideoRecoveryTask(videoIds: number[]) {
  if (invalidVideoRecoveryTask) return false;
  const dedupedVideoIds = Array.from(
    new Set(videoIds.map((id) => toInt(id)).filter((id) => id > 0)),
  );
  if (dedupedVideoIds.length === 0) {
    throw new Error("No invalid videos selected for recovery");
  }

  invalidVideoRecoveryTask = runInvalidVideoRecoveryTask(dedupedVideoIds)
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      updateInvalidVideoRecoveryStatus({
        running: false,
        lastError: message,
      });
    })
    .finally(() => {
      updateInvalidVideoRecoveryStatus({
        running: false,
      });
      invalidVideoRecoveryTask = null;
    });

  return true;
}

function isWriteRequestBlockedByFavoritesSync(method: string, path: string) {
  if (!favoritesSyncTask) return false;
  if (method === "GET") return false;
  // Keep sync control and probe endpoints callable while sync is running.
  if (path.startsWith("/sync/bilibili/history-model/")) return false;
  if (path === "/sync/bilibili/history-model/status") return false;
  if (path === "/sync/bilibili/folders") return false;
  if (path.startsWith("/sync/bilibili/tag-enrichment/")) return false;
  if (path === "/sync/bilibili/bidirectional/settings") return false;
  if (path === "/ai/settings") return false;
  if (path === "/ai/settings/test") return false;
  if (path === "/ai/settings/models") return false;
  if (path === "/backup/webdav/settings") return false;
  if (path === "/backup/webdav/test") return false;
  if (path === "/backup/webdav/upload") return false;
  if (path === "/backup/webdav/download") return false;
  return true;
}

async function startFavoritesSyncTask(params: {
  selectedRemoteFolderIds: number[];
  resumePageByFolder?: Record<string, number>;
  restart?: boolean;
}) {
  if (favoritesSyncTask || favoritesSyncStartPending) {
    return false;
  }
  const existingState = await readState();
  const existingJob = existingState.syncMeta.favoritesJob.active;
  if (
    existingJob?.phase === "paused" &&
    !existingJob.retry.automatic &&
    existingJob.retry.nextRetryAt &&
    existingJob.retry.nextRetryAt > now()
  ) {
    return false;
  }
  favoritesSyncStopRequested = false;
  favoritesSyncStartPending = true;
  try {
    const jobId = await withState((state) => {
      if (params.restart) state.syncMeta.favoritesJob.active = null;
      const job = prepareFavoritesSyncJob(
        state.syncMeta.favoritesJob,
        params.selectedRemoteFolderIds,
        now(),
      );
      return job.id;
    }, true);

    favoritesSyncTask = withState(async (state) => {
      const job = state.syncMeta.favoritesJob.active;
      if (!job || job.id !== jobId) {
        throw new Error("Favorites sync checkpoint is no longer active");
      }
      favoritesSyncWorkingState = state;
      try {
        return await syncFromBilibiliToState(state, {
          selectedRemoteFolderIds: job.selectedRemoteFolderIds,
          job,
          shouldStop: () => favoritesSyncStopRequested,
          onCheckpoint: async () => {
            await writeState(state);
          },
        });
      } finally {
        if (favoritesSyncWorkingState === state) {
          favoritesSyncWorkingState = null;
        }
      }
    }, false)
      .then(async (result) => {
        let retryJob: FavoritesSyncJob | null = null;
        await withState((state) => {
          const meta = state.syncMeta.favoritesJob;
          const active = meta.active;
          if (!active || active.id !== jobId) return;
          active.summary = { ...result.summary };
          active.invalidVideoIds = [...result.invalidVideoIds];
          active.errors = [...result.errors];
          active.unresolvedItems = [...result.unresolvedItems];
          active.incompleteFolders = [...result.incompleteFolders];
          active.unavailableFolders = [...result.unavailableFolders];
          active.riskBlocked = Boolean(result.riskBlocked);
          active.lastError = result.errors.at(-1)?.message ?? null;
          active.updatedAt = now();
          if (result.completed && !result.riskBlocked && !result.stopped) {
            completeFavoritesSyncJob(meta, active, now());
          } else if (result.stopped) {
            active.phase = "paused";
            active.retry = {
              attempt: active.retry.attempt,
              nextRetryAt: null,
              automatic: false,
              reason: "user-stopped",
              riskCount: active.retry.riskCount,
            };
            active.lastError = null;
          } else {
            active.phase = result.riskBlocked
              ? "paused"
              : active.retry.automatic
                ? "waiting"
                : "failed";
            retryJob = active;
          }
        }, true);
        scheduleFavoritesSyncRetry(retryJob);
      })
      .catch(async (error) => {
        const message = isBiliRequestError(error)
          ? formatBiliRequestError(error)
          : error instanceof Error
            ? error.message
            : String(error);
        let retryJob: FavoritesSyncJob | null = null;
        await withState((state) => {
          const active = state.syncMeta.favoritesJob.active;
          if (!active || active.id !== jobId) return;
          applyFavoritesSyncFailurePolicy(active, error, message);
          active.lastError = message;
          active.errors = [
            ...active.errors,
            { folder: "__sync__", message },
          ].slice(-100);
          active.summary.errorCount = active.errors.length;
          active.updatedAt = now();
          retryJob = active;
        }, true);
        scheduleFavoritesSyncRetry(retryJob);
      })
      .finally(async () => {
        favoritesSyncWorkingState = null;
        favoritesSyncTask = null;
        favoritesSyncStopRequested = false;
        if (!TAG_SYNC_ENABLED) return;
        const queuedMeta = await withState((state) => {
          const current = ensureTagEnrichmentMeta(state);
          if (
            current.paused ||
            current.phase !== "waiting" ||
            !current.waitingForVideoSync
          ) {
            return null;
          }
          current.waitingForVideoSync = false;
          current.nextRunAt = now() + 1000;
          current.updatedAt = now();
          return { ...current };
        }, true);
        if (!queuedMeta) return;
        scheduleTagEnrichment(queuedMeta);
        void triggerTagEnrichment();
      });

    return true;
  } finally {
    favoritesSyncStartPending = false;
  }
}

async function stopFavoritesSyncTask() {
  favoritesSyncStopRequested = true;
  if (chrome.alarms?.clear) chrome.alarms.clear(FAVORITES_SYNC_RETRY_ALARM);

  if (!favoritesSyncTask && !favoritesSyncStartPending) {
    await withState((state) => {
      const active = state.syncMeta.favoritesJob.active;
      if (!active) return;
      active.phase = "paused";
      active.retry = {
        attempt: active.retry.attempt,
        nextRetryAt: null,
        automatic: false,
        reason: "user-stopped",
        riskCount: active.retry.riskCount,
      };
      active.lastError = null;
      active.updatedAt = now();
    }, true);
  }

  const snapshot = await readState();
  return getFavoritesSyncStatus(snapshot);
}

async function dismissFavoritesSyncStatus() {
  return withState((state) => {
    const meta = ensureFavoritesSyncJobMeta(state);
    meta.active = null;
    meta.lastStatus = defaultFavoritesSyncStatus();
    return getFavoritesSyncStatus(state);
  }, true);
}

function buildExportPayload(state: LocalState) {
  const exportedAt = now();
  const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, "-");
  const exportFolders = state.folders.filter(
    (folder) => folder.deletedAt === null,
  );
  const exportFolderIds = new Set(exportFolders.map((folder) => folder.id));
  const exportVideos = state.videos.filter((video) => video.deletedAt === null);
  const exportVideoIds = new Set(exportVideos.map((video) => video.id));
  const exportFolderItems = state.folderItems.filter(
    (item) =>
      exportFolderIds.has(item.folderId) && exportVideoIds.has(item.videoId),
  );
  const referencedTagIds = new Set(
    state.videoTags
      .filter((edge) => exportVideoIds.has(edge.videoId))
      .map((edge) => edge.tagId),
  );
  const exportTags = state.tags.filter(
    (tag) => tag.archivedAt === null && referencedTagIds.has(tag.id),
  );
  const exportTagIds = new Set(exportTags.map((tag) => tag.id));
  const exportVideoTags = state.videoTags.filter(
    (edge) => exportVideoIds.has(edge.videoId) && exportTagIds.has(edge.tagId),
  );
  const exportComments = (state.comments ?? [])
    .filter((comment) => comment.deletedAt == null)
    .sort((left, right) => right.savedAt - left.savedAt || right.id - left.id);
  const activeExportArticles = (state.articles ?? []).filter(
    (article) => article.deletedAt == null,
  );
  const legacyArticleFolderIds = new Set(
    activeExportArticles.flatMap((article) => article.folderIds ?? []),
  );
  const exportArticleFolders =
    (state.articleFolders ?? []).length > 0
      ? activeArticleFolders(state)
      : state.folders
          .filter(
            (folder) =>
              folder.deletedAt === null &&
              legacyArticleFolderIds.has(folder.id),
          )
          .map((folder, index) => ({
            id: folder.id,
            name: folder.name,
            description: folder.description,
            groupName: folder.groupName,
            sortOrder: index + 1,
            deletedAt: null,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
          }));
  const exportArticleFolderById = new Map(
    exportArticleFolders.map((folder) => [folder.id, folder]),
  );
  const exportArticles = activeExportArticles
    .sort((left, right) => right.savedAt - left.savedAt || right.id - left.id)
    .map((article) => {
      const folderIds = (article.folderIds ?? []).filter((folderId) =>
        exportArticleFolderById.has(folderId),
      );
      return {
        ...article,
        folderIds,
        folders: folderIds
          .map((folderId) => exportArticleFolderById.get(folderId)?.name ?? "")
          .filter(Boolean),
      };
    });
  const exportFollowedUps = [...(state.followedUps ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.uid - right.uid,
  );
  const {
    folderNamesByVideo,
    folderCountByVideo,
    latestAddedAtByVideo,
    customTagsByVideo,
    systemTagsByVideo,
  } = buildVideoExportMaps(
    {
      ...state,
      folders: exportFolders,
      folderItems: exportFolderItems,
      tags: exportTags,
      videoTags: exportVideoTags,
    },
    exportVideoIds,
  );

  return {
    exportedAt,
    stamp,
    exportFolders,
    exportVideos,
    exportFolderItems,
    exportTags,
    exportVideoTags,
    exportComments,
    exportArticleFolders,
    exportArticles,
    exportFollowedUps,
    folderNamesByVideo,
    folderCountByVideo,
    latestAddedAtByVideo,
    customTagsByVideo,
    systemTagsByVideo,
  };
}

export function buildJsonExportResult(state: LocalState) {
  const {
    exportedAt,
    stamp,
    exportFolders,
    exportVideos: activeExportVideos,
    exportFolderItems,
    exportTags,
    exportVideoTags,
    exportComments,
    exportArticleFolders,
    exportArticles,
    exportFollowedUps,
    latestAddedAtByVideo,
    folderCountByVideo,
    folderNamesByVideo,
    customTagsByVideo,
    systemTagsByVideo,
  } = buildExportPayload(state);
  const summary = {
    folders: exportFolders.length,
    articleFolders: exportArticleFolders.length,
    videos: activeExportVideos.length,
    tags: exportTags.length,
    comments: exportComments.length,
    articles: exportArticles.length,
    followedUps: exportFollowedUps.length,
  };

  const exportVideos = activeExportVideos.map((video) => {
    const metadata = buildExportVideoMetadata(video, {
      folderNamesByVideo,
      folderCountByVideo,
      latestAddedAtByVideo,
      customTagsByVideo,
      systemTagsByVideo,
    });
    const { partition: _partition, ...videoWithoutPartition } = video;
    return {
      ...videoWithoutPartition,
      uploaderSpaceUrl: normalizeBiliSpaceUrl(video.uploaderSpaceUrl),
      folderCount: metadata.folderCount,
      publishAtText: formatTimestamp(video.publishAt),
      favoriteAt: metadata.favoriteAt,
      favoriteAtText: formatTimestamp(metadata.favoriteAt),
    };
  });
  const exportFolderItemsWithText = exportFolderItems.map((item) => ({
    ...item,
    addedAtText: formatTimestamp(item.addedAt),
  }));
  const content = JSON.stringify(
    {
      meta: {
        version: "v1",
        exportedAt,
        exportedAtText: formatTimestamp(exportedAt),
        source: "bilishelf-extension-local",
      },
      folders: exportFolders,
      articleFolders: exportArticleFolders,
      videos: exportVideos,
      folderItems: exportFolderItemsWithText,
      tags: exportTags,
      videoTags: exportVideoTags,
      followedUps: exportFollowedUps,
      comments: exportComments,
      articles: exportArticles,
    },
    null,
    2,
  );

  return {
    format: "json" as const,
    filename: `bilishelf-export-${stamp}.json`,
    mimeType: "application/json;charset=utf-8",
    content,
    summary,
    stamp,
  };
}

function listVideoFinalFolders(state: LocalState, videoId: number) {
  return state.folderItems
    .filter((item) => item.videoId === videoId)
    .map((item) => state.folders.find((folder) => folder.id === item.folderId))
    .filter(
      (folder): folder is FolderRecord => !!folder && folder.deletedAt === null,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((folder) => ({ id: folder.id, name: folder.name }));
}

export function saveVideoSelectionToState(
  state: LocalState,
  body: Record<string, unknown>,
): ApiResult {
  const bvid = normalizeText(body.bvid);
  const title = normalizeText(body.title);
  const bvidUrl = normalizeBiliVideoUrl(body.bvidUrl, bvid);
  if (!bvid || !title || !bvidUrl)
    return fail(400, "Video payload is incomplete");

  const folderIds = Array.isArray(body.folderIds)
    ? body.folderIds.map((id) => toInt(id))
    : [];
  const uniqueFolderIds = Array.from(new Set(folderIds.filter((id) => id > 0)));
  const activeFolderIdSet = new Set(
    activeFolders(state).map((folder) => folder.id),
  );
  const validFolderIds = uniqueFolderIds.filter((id) =>
    activeFolderIdSet.has(id),
  );
  const existed = state.videos.find(
    (video) => normalizeKey(video.bvid) === normalizeKey(bvid),
  );
  if (validFolderIds.length === 0 && !existed) {
    return fail(400, "At least one folder is required");
  }

  const timestamp = now();
  const video: VideoRecord = existed || {
    id: state.counters.video++,
    bvid,
    title,
    coverUrl: normalizeText(body.coverUrl),
    uploader: normalizeText(body.uploader),
    uploaderSpaceUrl: normalizeBiliSpaceUrl(body.uploaderSpaceUrl),
    description: normalizeText(body.description),
    partition: normalizeVideoPartition(body.partition),
    publishAt: toIntOrNull(body.publishAt),
    bvidUrl,
    isInvalid: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  video.bvid = bvid;
  video.title = title;
  video.coverUrl = normalizeText(body.coverUrl);
  video.uploader = normalizeText(body.uploader);
  video.uploaderSpaceUrl = normalizeBiliSpaceUrl(body.uploaderSpaceUrl);
  video.description = normalizeText(body.description);
  video.partition = normalizeVideoPartition(body.partition);
  video.publishAt = toIntOrNull(body.publishAt);
  video.bvidUrl = bvidUrl;
  video.isInvalid = Boolean(body.isInvalid);
  video.deletedAt = null;
  video.updatedAt = timestamp;

  if (!existed) {
    state.videos.push(video);
  }

  const addedFolderIds: number[] = [];
  const existingFolderIds: number[] = [];
  for (const folderId of validFolderIds) {
    if (folderItemExists(state, folderId, video.id)) {
      existingFolderIds.push(folderId);
      continue;
    }
    state.folderItems.push({
      id: state.counters.folderItem++,
      folderId,
      videoId: video.id,
      addedAt: timestamp,
    });
    addedFolderIds.push(folderId);
  }

  const validFolderIdSet = new Set(validFolderIds);
  const removedFolderIds: number[] = [];
  state.folderItems = state.folderItems.filter((item) => {
    if (item.videoId !== video.id) return true;
    if (validFolderIdSet.has(item.folderId)) return true;
    if (!removedFolderIds.includes(item.folderId)) {
      removedFolderIds.push(item.folderId);
    }
    return false;
  });

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

  const finalFolders = listVideoFinalFolders(state, video.id);
  const finalFolderIds = finalFolders.map((folder) => folder.id);
  const deleted = finalFolderIds.length === 0;
  if (deleted) {
    removeVideoCompletely(state, video.id);
  }

  return ok(
    {
      video: mapVideo(state, video),
      created: !existed,
      deleted,
      addedFolderIds,
      existingFolderIds,
      removedFolderIds,
      finalFolderIds,
      finalFolders,
    },
    existed ? 200 : 201,
  );
}

function applyImportRowsToState(
  state: LocalState,
  rows: ImportVideoRow[],
  skippedRows: number,
  commentRows: ImportCommentRow[] = [],
  skippedComments = 0,
  articleRows: ImportArticleRow[] = [],
  followedUpRows: ImportFollowedUpRow[] = [],
) {
  state.articles ??= [];
  state.followedUps ??= [];
  const summary = {
    videosUpserted: 0,
    folderLinksAdded: 0,
    tagsBound: 0,
    foldersCreated: 0,
    tagsCreated: 0,
    rowsSkipped: skippedRows,
    commentsUpserted: 0,
    commentsSkipped: skippedComments,
    articlesUpserted: 0,
    articlesSkipped: 0,
    followedUpsUpserted: 0,
  };

  for (const row of rows) {
    const timestamp = now();
    const existed = state.videos.find(
      (video) => normalizeKey(video.bvid) === normalizeKey(row.bvid),
    );
    const video: VideoRecord = existed || {
      id: state.counters.video++,
      bvid: row.bvid,
      title: row.title,
      coverUrl: normalizeCoverUrl(row.coverUrl),
      uploader: row.uploader,
      uploaderSpaceUrl: normalizeBiliSpaceUrl(row.uploaderSpaceUrl),
      description: row.description,
      partition: normalizeVideoPartition(row.partition),
      publishAt: row.publishAt,
      bvidUrl: row.bvidUrl,
      isInvalid: row.isInvalid,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    video.bvid = row.bvid;
    video.title = row.title;
    video.coverUrl = normalizeCoverUrl(row.coverUrl);
    video.uploader = row.uploader || "Unknown uploader";
    video.uploaderSpaceUrl = normalizeBiliSpaceUrl(row.uploaderSpaceUrl);
    video.description = row.description;
    video.partition = normalizeVideoPartition(row.partition);
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
      const importedGroupName = row.folderGroups?.[folderName];
      if (importedGroupName)
        ensured.folder.groupName = normalizeText(importedGroupName) || null;
      if (ensured.created) summary.foldersCreated += 1;

      const addedAt = row.addedAt > 0 ? row.addedAt : timestamp;
      const existingLink = state.folderItems.find(
        (item) =>
          item.folderId === ensured.folder.id && item.videoId === video.id,
      );
      if (!existingLink) {
        state.folderItems.push({
          id: state.counters.folderItem++,
          folderId: ensured.folder.id,
          videoId: video.id,
          addedAt,
        });
        summary.folderLinksAdded += 1;
      }
    }

    for (const tagName of row.customTags) {
      const existedTag = state.tags.some(
        (candidate) =>
          candidate.archivedAt === null &&
          candidate.type === "custom" &&
          normalizeKey(candidate.name) === normalizeKey(tagName),
      );
      const tag = ensureTag(state, tagName, "custom");
      if (!tag) continue;
      if (!existedTag) summary.tagsCreated += 1;
      const before = state.videoTags.length;
      ensureVideoTag(state, video.id, tag.id);
      if (state.videoTags.length > before) summary.tagsBound += 1;
    }
    for (const tagName of row.systemTags) {
      if (BLOCKED_SYSTEM_TAGS.has(normalizeText(tagName).toLowerCase()))
        continue;
      const existedTag = state.tags.some(
        (candidate) =>
          candidate.archivedAt === null &&
          candidate.type === "system" &&
          normalizeKey(candidate.name) === normalizeKey(tagName),
      );
      const tag = ensureTag(state, tagName, "system");
      if (!tag) continue;
      if (!existedTag) summary.tagsCreated += 1;
      const before = state.videoTags.length;
      ensureVideoTag(state, video.id, tag.id);
      if (state.videoTags.length > before) summary.tagsBound += 1;
    }
  }

  for (const row of commentRows) {
    const existing = state.comments.find(
      (comment) => comment.sourceKey === row.sourceKey,
    );
    if (existing) {
      const id = existing.id;
      const savedAt = Math.min(existing.savedAt, row.savedAt);
      Object.assign(existing, row, {
        id,
        savedAt,
        updatedAt: Math.max(existing.updatedAt, row.updatedAt),
        deletedAt: null,
      });
    } else {
      state.comments.push({
        ...row,
        id: state.counters.comment++,
        deletedAt: null,
      });
    }
    summary.commentsUpserted += 1;
  }

  for (const row of articleRows) {
    try {
      const normalized = normalizeFavoriteArticle(row, now());
      const folderIds: number[] = [];
      for (const folderName of uniqueTextList(row.folderNames ?? [])) {
        const ensured = ensureArticleFolderByNameForImport(state, folderName);
        if (!ensured) continue;
        const importedGroupName = row.folderGroups?.[folderName];
        if (importedGroupName) {
          ensured.folder.groupName = normalizeText(importedGroupName) || null;
        }
        if (ensured.created) summary.foldersCreated += 1;
        folderIds.push(ensured.folder.id);
      }
      normalized.folderIds = folderIds;
      const existing = state.articles.find(
        (article) => article.sourceKey === normalized.sourceKey,
      );
      if (existing) {
        const id = existing.id;
        const savedAt = Math.min(existing.savedAt, normalized.savedAt);
        Object.assign(existing, normalized, {
          id,
          savedAt,
          updatedAt: Math.max(existing.updatedAt, normalized.updatedAt),
          deletedAt: null,
        });
      } else {
        state.articles.push({
          ...normalized,
          id: state.counters.article++,
          deletedAt: null,
        });
      }
      summary.articlesUpserted += 1;
    } catch {
      summary.articlesSkipped += 1;
    }
  }

  if (followedUpRows.length > 0) {
    const merged = mergeFollowedUpRecords(
      state.followedUps,
      followedUpRows,
      now(),
    );
    state.followedUps = merged.records;
    summary.followedUpsUpserted = followedUpRows.length;
  }

  return summary;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function queryFavoriteComments(state: LocalState, params: URLSearchParams) {
  const keyword = normalizeText(params.get("q")).toLocaleLowerCase();
  const items = state.comments
    .filter((comment) => comment.deletedAt == null)
    .filter((comment) => {
      if (!keyword) return true;
      return [
        comment.content,
        comment.authorName,
        comment.replyToName,
        comment.videoTitle,
        comment.bvid,
      ].some((value) =>
        normalizeText(value).toLocaleLowerCase().includes(keyword),
      );
    })
    .sort((left, right) => right.savedAt - left.savedAt || right.id - left.id);
  return paginate(items, params.get("page"), params.get("pageSize"));
}

function queryFavoriteArticles(state: LocalState, params: URLSearchParams) {
  state.articles ??= [];
  const keyword = normalizeText(params.get("q")).toLocaleLowerCase();
  const folderId = params.get("folderId") ? toInt(params.get("folderId")) : 0;
  const items = state.articles
    .filter((article) => article.deletedAt == null)
    .filter((article) => {
      if (folderId > 0 && !(article.folderIds ?? []).includes(folderId))
        return false;
      if (!keyword) return true;
      return [
        article.title,
        article.summary,
        article.content,
        article.authorName,
        article.opusId,
      ].some((value) =>
        normalizeText(value).toLocaleLowerCase().includes(keyword),
      );
    })
    .sort((left, right) => right.savedAt - left.savedAt || right.id - left.id);
  return paginate(items, params.get("page"), params.get("pageSize"));
}

function toggleFavoriteArticle(state: LocalState, raw: unknown) {
  state.articles ??= [];
  const normalized = normalizeFavoriteArticle(raw, now());
  const existing = state.articles.find(
    (article) => article.sourceKey === normalized.sourceKey,
  );
  if (existing && existing.deletedAt == null) {
    moveFavoriteArticleToTrash(state, existing.id);
    return { saved: false, article: existing };
  }
  if (existing) {
    const timestamp = now();
    Object.assign(existing, normalized, {
      id: existing.id,
      savedAt: existing.savedAt,
      updatedAt: timestamp,
      deletedAt: null,
    });
    return { saved: true, article: existing };
  }
  const timestamp = now();
  const article: FavoriteArticleRecord = {
    ...normalized,
    id: state.counters.article++,
    savedAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  state.articles.push(article);
  return { saved: true, article };
}

export function saveArticleSelectionToState(
  state: LocalState,
  raw: Record<string, unknown>,
): ApiResult {
  state.articles ??= [];
  state.articleFolders ??= [];
  const timestamp = now();
  const normalized = normalizeFavoriteArticle(raw, timestamp);
  const requestedIds = Array.isArray(raw.folderIds)
    ? [
        ...new Set(
          raw.folderIds.map((item) => toInt(item)).filter((id) => id > 0),
        ),
      ]
    : [];
  const activeIds = new Set(
    activeArticleFolders(state).map((folder) => folder.id),
  );
  const folderIds = requestedIds.filter((id) => activeIds.has(id));
  const existingIndex = state.articles.findIndex(
    (article) => article.sourceKey === normalized.sourceKey,
  );
  const existing = existingIndex >= 0 ? state.articles[existingIndex] : null;
  if ((!existing || existing.deletedAt != null) && folderIds.length === 0) {
    return fail(400, "At least one article folder is required");
  }

  const previousIds = new Set(existing?.folderIds ?? []);
  const addedFolderIds = folderIds.filter((id) => !previousIds.has(id));
  const existingFolderIds = folderIds.filter((id) => previousIds.has(id));
  const nextIds = new Set(folderIds);
  const removedFolderIds = [...previousIds].filter((id) => !nextIds.has(id));

  if (existing && existing.deletedAt == null && folderIds.length === 0) {
    moveFavoriteArticleToTrash(state, existing.id, timestamp);
    return ok({
      saved: false,
      deleted: true,
      article: existing,
      addedFolderIds,
      existingFolderIds,
      removedFolderIds,
      finalFolderIds: [],
      finalFolders: [],
    });
  }

  const article: FavoriteArticleRecord = existing
    ? Object.assign(existing, normalized, {
        id: existing.id,
        folderIds,
        savedAt: existing.savedAt,
        updatedAt: timestamp,
        deletedAt: null,
      })
    : {
        ...normalized,
        id: state.counters.article++,
        folderIds,
        savedAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };
  if (!existing) state.articles.push(article);

  const folderById = new Map(
    activeArticleFolders(state).map((folder) => [folder.id, folder]),
  );
  const finalFolders = folderIds
    .map((id) => folderById.get(id))
    .filter((folder): folder is ArticleFolderRecord => Boolean(folder))
    .map((folder) => ({ id: folder.id, name: folder.name }));
  return ok(
    {
      saved: true,
      deleted: false,
      created: !existing,
      article,
      addedFolderIds,
      existingFolderIds,
      removedFolderIds,
      finalFolderIds: folderIds,
      finalFolders,
    },
    existing ? 200 : 201,
  );
}

export function moveFavoriteCommentToTrash(
  state: LocalState,
  commentId: number,
  timestamp = now(),
) {
  const comment = state.comments.find(
    (item) => item.id === commentId && item.deletedAt == null,
  );
  if (!comment) return false;
  comment.deletedAt = timestamp;
  comment.updatedAt = timestamp;
  return true;
}

export function restoreFavoriteCommentFromTrash(
  state: LocalState,
  commentId: number,
  timestamp = now(),
) {
  const comment = state.comments.find(
    (item) => item.id === commentId && item.deletedAt != null,
  );
  if (!comment) return false;
  comment.deletedAt = null;
  comment.updatedAt = timestamp;
  return true;
}

export function purgeFavoriteCommentFromTrash(
  state: LocalState,
  commentId: number,
) {
  const index = state.comments.findIndex(
    (item) => item.id === commentId && item.deletedAt != null,
  );
  if (index < 0) return false;
  state.comments.splice(index, 1);
  return true;
}

export function moveFavoriteArticleToTrash(
  state: LocalState,
  articleId: number,
  timestamp = now(),
) {
  const article = state.articles.find(
    (item) => item.id === articleId && item.deletedAt == null,
  );
  if (!article) return false;
  article.deletedAt = timestamp;
  article.updatedAt = timestamp;
  return true;
}

export function restoreFavoriteArticleFromTrash(
  state: LocalState,
  articleId: number,
  timestamp = now(),
) {
  const article = state.articles.find(
    (item) => item.id === articleId && item.deletedAt != null,
  );
  if (!article) return false;
  article.deletedAt = null;
  article.updatedAt = timestamp;
  return true;
}

export function purgeFavoriteArticleFromTrash(
  state: LocalState,
  articleId: number,
) {
  const index = state.articles.findIndex(
    (item) => item.id === articleId && item.deletedAt != null,
  );
  if (index < 0) return false;
  state.articles.splice(index, 1);
  return true;
}

function toggleFavoriteComment(state: LocalState, raw: unknown) {
  const normalized = normalizeFavoriteComment(raw, now());
  const existing = state.comments.find(
    (comment) => comment.sourceKey === normalized.sourceKey,
  );
  if (existing && existing.deletedAt == null) {
    moveFavoriteCommentToTrash(state, existing.id);
    return { saved: false, comment: existing };
  }
  if (existing) {
    const timestamp = now();
    Object.assign(existing, normalized, {
      id: existing.id,
      savedAt: existing.savedAt,
      updatedAt: timestamp,
      deletedAt: null,
    });
    return { saved: true, comment: existing };
  }
  const timestamp = now();
  const comment: FavoriteCommentRecord = {
    ...normalized,
    id: state.counters.comment++,
    savedAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  state.comments.push(comment);
  return { saved: true, comment };
}

type BackupReminderRecord = {
  lastBackupAt: number;
  lastReminderDay: string;
};

function formatLocalCalendarDay(timestamp = now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeBackupReminderRecord(value: unknown): BackupReminderRecord {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<BackupReminderRecord>)
      : {};
  return {
    lastBackupAt: Math.max(0, toInt(raw.lastBackupAt, 0)),
    lastReminderDay: normalizeText(raw.lastReminderDay),
  };
}

async function readBackupReminderRecord() {
  const storage = chrome.storage?.local as StorageAreaLike | undefined;
  if (!storage) return normalizeBackupReminderRecord(null);
  const stored = await storage.get(BACKUP_REMINDER_STORAGE_KEY);
  return normalizeBackupReminderRecord(stored[BACKUP_REMINDER_STORAGE_KEY]);
}

async function patchBackupReminderRecord(patch: Partial<BackupReminderRecord>) {
  const storage = chrome.storage?.local as StorageAreaLike | undefined;
  if (!storage) return normalizeBackupReminderRecord(patch);
  const current = await readBackupReminderRecord();
  const next = normalizeBackupReminderRecord({ ...current, ...patch });
  await storage.set({ [BACKUP_REMINDER_STORAGE_KEY]: next });
  return next;
}

export function shouldShowExtensionBackupReminder(options: {
  hasData: boolean;
  now: number;
  lastBackupAt: number;
  lastReminderDay: string;
}) {
  if (!options.hasData) return false;
  if (options.lastReminderDay === formatLocalCalendarDay(options.now))
    return false;
  return (
    options.lastBackupAt <= 0 ||
    options.now - options.lastBackupAt >= BACKUP_REMINDER_INTERVAL_MS
  );
}

async function scheduleBackupReminderAlarm() {
  if (!chrome.alarms?.create) return;
  if (chrome.alarms.get) {
    const existing = await chrome.alarms.get(BACKUP_REMINDER_ALARM);
    if (existing) return;
  }
  chrome.alarms.create(BACKUP_REMINDER_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: BACKUP_REMINDER_CHECK_INTERVAL_MINUTES,
  });
}

async function checkAndNotifyBackupReminder() {
  const state = await readState();
  const record = await readBackupReminderRecord();
  const timestamp = now();
  if (
    !shouldShowExtensionBackupReminder({
      hasData:
        state.videos.some((video) => video.deletedAt === null) ||
        state.comments.some((comment) => comment.deletedAt == null) ||
        state.articles.some((article) => article.deletedAt == null),
      now: timestamp,
      lastBackupAt: record.lastBackupAt,
      lastReminderDay: record.lastReminderDay,
    })
  ) {
    return false;
  }

  await patchBackupReminderRecord({
    lastReminderDay: formatLocalCalendarDay(timestamp),
  });
  chrome.notifications?.create?.(BACKUP_REMINDER_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/128.png"),
    title: chrome.i18n?.getUILanguage?.().toLowerCase().startsWith("zh")
      ? "BiliShelf 建议定期备份"
      : "BiliShelf backup reminder",
    message: chrome.i18n?.getUILanguage?.().toLowerCase().startsWith("zh")
      ? "本地已有收藏数据，建议现在导出一次 JSON 完整备份。"
      : "You have local saved data. Export a complete JSON backup now.",
    priority: 1,
  });
  return true;
}

function handleReadOnlyApi(
  state: LocalState,
  path: string,
  params: URLSearchParams,
): ApiResult | null {
  if (path === "/health") {
    return ok({ ok: true });
  }

  if (path === "/sync/bilibili/bidirectional/settings") {
    const settings = state.syncMeta?.bidirectionalSync;
    return ok({
      biliToLocalEnabled: Boolean(settings?.biliToLocalEnabled),
      localToBiliEnabled: false,
      updatedAt: toInt(settings?.updatedAt, 0),
    });
  }

  if (path === "/ai/settings") {
    const settings = ensureAiMeta(state);
    return ok(getAiSettings(settings));
  }

  if (path === "/backup/webdav/settings") {
    const settings = ensureWebDavMeta(state);
    return ok(getWebDavSettings(settings));
  }

  if (path === "/folders") {
    return ok({ items: listActiveFoldersWithCounts(state) });
  }

  if (path === "/article-folders") {
    return ok({ items: listActiveArticleFoldersWithCounts(state) });
  }

  if (path === "/trash/folders") {
    const items = state.folders
      .filter((folder) => folder.deletedAt !== null)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))
      .map((folder) => {
        const itemCount = state.folderItems.filter(
          (item) => item.folderId === folder.id,
        ).length;
        return { ...folder, itemCount };
      });
    return ok({ items });
  }

  if (path === "/trash/comments") {
    const items = state.comments
      .filter((comment) => comment.deletedAt != null)
      .sort(
        (left, right) =>
          (right.deletedAt ?? 0) - (left.deletedAt ?? 0) || right.id - left.id,
      );
    return ok(paginate(items, params.get("page"), params.get("pageSize")));
  }

  if (path === "/trash/articles") {
    const items = state.articles
      .filter((article) => article.deletedAt != null)
      .sort(
        (left, right) =>
          (right.deletedAt ?? 0) - (left.deletedAt ?? 0) || right.id - left.id,
      );
    return ok(paginate(items, params.get("page"), params.get("pageSize")));
  }

  if (path === "/videos") {
    const folderIdRaw = params.get("folderId");
    const folderId = folderIdRaw ? toInt(folderIdRaw) : undefined;
    const data = queryVideoPage(
      state,
      {
        includeDeleted: false,
        folderId,
        tags: parseListParam(params, "tags"),
        title: params.get("title") || undefined,
        description: params.get("description") || undefined,
        uploader: params.get("uploader") || undefined,
        customTag: params.get("customTag") || undefined,
        systemTag: params.get("systemTag") || undefined,
        from: toIntOrNull(params.get("from")),
        to: toIntOrNull(params.get("to")),
      },
      params.get("page"),
      params.get("pageSize"),
    );
    return ok(data);
  }

  if (path === "/videos/by-bvid") {
    const bvid = normalizeOutputBvid(params.get("bvid") || "");
    if (!bvid) return ok(null);
    const video = state.videos.find(
      (row) =>
        row.deletedAt === null &&
        (normalizeOutputBvid(row.bvid) === bvid ||
          normalizeKey(normalizeOutputBvid(row.bvid)) === normalizeKey(bvid)),
    );
    if (!video) return ok(null);
    const folders = state.folderItems
      .filter((item) => item.videoId === video.id)
      .map((item) =>
        state.folders.find((folder) => folder.id === item.folderId),
      )
      .filter(
        (folder): folder is FolderRecord =>
          !!folder && folder.deletedAt === null,
      )
      .map((folder) => ({ id: folder.id, name: folder.name }));
    return ok({ video: mapVideo(state, video), folders });
  }

  if (path === "/comments/keys") {
    return ok({
      items: state.comments
        .filter((comment) => comment.deletedAt == null)
        .map((comment) => comment.sourceKey),
    });
  }

  if (path === "/comments") {
    return ok(queryFavoriteComments(state, params));
  }

  if (path === "/articles/keys") {
    return ok({
      items: state.articles
        .filter((article) => article.deletedAt == null)
        .map((article) => article.sourceKey),
    });
  }

  if (path === "/articles/by-key") {
    const sourceKey = normalizeText(params.get("sourceKey"));
    const article = state.articles.find(
      (item) => item.sourceKey === sourceKey && item.deletedAt == null,
    );
    return ok(article ?? null);
  }

  if (path === "/articles") {
    return ok(queryFavoriteArticles(state, params));
  }

  if (path === "/videos/search") {
    const folderIdRaw = params.get("folderId");
    const folderId = folderIdRaw ? toInt(folderIdRaw) : undefined;
    const data = queryVideoPage(
      state,
      {
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
        to: toIntOrNull(params.get("to")),
      },
      params.get("page"),
      params.get("pageSize"),
    );
    return ok(data);
  }

  if (path === "/tags") {
    const data = listTagsWithUsageCounts(state, {
      page: params.get("page"),
      pageSize: params.get("pageSize"),
      type: params.get("type"),
      search: normalizeText(params.get("search")),
    });
    return ok(data);
  }

  if (path === "/trash/videos") {
    const data = queryVideoPage(
      state,
      { includeDeleted: true },
      params.get("page"),
      params.get("pageSize"),
    );
    return ok(data);
  }

  const folderAiCategoryMatch = matchFolderAiCategoriesPath(path);
  if (folderAiCategoryMatch) {
    if (!AI_CATEGORIES_ENABLED) {
      return ok(null);
    }
    const folderId = toInt(folderAiCategoryMatch[1]);
    return ok(
      normalizeFolderAiCategoriesResponse(getFolderAiAnalysis(state, folderId)),
    );
  }

  return null;
}

async function handleApi(request: LocalApiRequest): Promise<ApiResult> {
  const method = normalizeText(request.method || "GET").toUpperCase();
  const fullPath = normalizeText(request.path);
  const url = new URL(
    fullPath.startsWith("/")
      ? `https://local${fullPath}`
      : `https://local/${fullPath}`,
  );
  const path = url.pathname;
  const params = url.searchParams;
  const body = (request.body ?? {}) as Record<string, unknown>;
  const startedAt = Date.now();

  try {
    // Fast-path status endpoints must bypass withState queue, otherwise
    // long-running sync tasks block polling and trigger frontend timeouts.
    if (method === "GET" && path === "/app/update/status") {
      return ok(await checkExtensionUpdate(false));
    }
    if (method === "POST" && path === "/app/update/check") {
      return ok(await checkExtensionUpdate(true));
    }
    if (method === "POST" && path === "/app/update/acknowledge") {
      return ok(await acknowledgeExtensionUpdateNotice());
    }
    if (method === "GET" && path === "/ai/organizer/status") {
      return ok(buildAiOrganizerStatus(await readAiOrganizerTask()));
    }

    if (method === "POST" && path === "/ai/settings/test") {
      return await testAiSettingsOutsideStateQueue(body);
    }

    if (method === "GET" && path === "/ai/organizer/preview") {
      return ok(await listAiOrganizerPreview(params));
    }

    if (method === "PATCH" && path === "/ai/organizer/assignments") {
      if (aiOrganizerStartPending || aiOrganizerApplyPending) {
        return fail(423, "AI organization is busy");
      }
      const task = await readAiOrganizerTask();
      if (!task || task.stage !== "ready") {
        return fail(409, "AI organization plan is not ready to edit");
      }
      const videoId = toInt(body.videoId);
      const folderKey = normalizeText(body.folderKey);
      const allowedKeys = new Set(task.taxonomy.map((folder) => folder.key));
      if (!task.sourceVideoIds.includes(videoId)) {
        return fail(
          404,
          "Video is not part of the current AI organization plan",
        );
      }
      if (folderKey !== REVIEW_FOLDER_KEY && !allowedKeys.has(folderKey)) {
        return fail(400, "Target AI folder is invalid");
      }
      const updated = await updateAiOrganizerTask(task.id, (current) => ({
        ...(current.stage === "ready"
          ? {
              ...current,
              assignments: current.assignments.map((assignment) =>
                assignment.videoId === videoId
                  ? {
                      ...assignment,
                      folderKey,
                      confidence: 1,
                      lowConfidence: folderKey === REVIEW_FOLDER_KEY,
                      reason: "User adjusted this classification",
                    }
                  : assignment,
              ),
              updatedAt: now(),
            }
          : current),
      }));
      return ok(buildAiOrganizerStatus(updated));
    }

    if (method === "GET" && path === "/ai/organizer/backup") {
      const task = await readAiOrganizerTask();
      if (!task) return fail(404, "No AI organizer snapshot is available");
      const snapshot = await readAiOrganizerSnapshot(task);
      return ok(buildJsonExportResult(snapshot.state));
    }

    if (method === "POST" && path === "/ai/organizer/start") {
      if (favoritesSyncTask || favoritesSyncStartPending) {
        return fail(
          423,
          "Favorites sync is running. Start AI organization after it finishes",
        );
      }
      try {
        const task = await startAiOrganizerTask(body);
        return ok(buildAiOrganizerStatus(task), 202);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(message.includes("already") ? 409 : 400, message);
      }
    }

    if (method === "POST" && path === "/ai/organizer/pause") {
      return ok(buildAiOrganizerStatus(await pauseAiOrganizerTask()));
    }

    if (method === "POST" && path === "/ai/organizer/resume") {
      try {
        return ok(buildAiOrganizerStatus(await resumeAiOrganizerTask()));
      } catch (error) {
        return fail(
          400,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (method === "POST" && path === "/ai/organizer/cancel") {
      return ok(buildAiOrganizerStatus(await cancelAiOrganizerTask()));
    }

    if (method === "POST" && path === "/ai/organizer/apply") {
      if (favoritesSyncTask || favoritesSyncStartPending) {
        return fail(
          423,
          "Favorites sync is running. Apply AI organization after it finishes",
        );
      }
      try {
        const task = await applyReadyAiOrganizerTask();
        return ok(buildAiOrganizerStatus(task));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(message.includes("changed") ? 409 : 400, message);
      }
    }

    if (method === "POST" && path === "/ai/organizer/undo") {
      if (favoritesSyncTask || favoritesSyncStartPending) {
        return fail(
          423,
          "Favorites sync is running. Undo AI organization after it finishes",
        );
      }
      try {
        const task = await undoAppliedAiOrganizerTask();
        return ok(buildAiOrganizerStatus(task));
      } catch (error) {
        return fail(
          400,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (
      method === "GET" &&
      path === "/sync/bilibili/invalid-video-recovery/status"
    ) {
      return ok(getInvalidVideoRecoveryStatus());
    }

    if (method === "GET" && path === "/sync/bilibili/history-model/status") {
      const snapshot = await readState();
      return ok(getFavoritesSyncStatus(snapshot));
    }

    if (method === "POST" && path === "/sync/bilibili/history-model/stop") {
      return ok({
        ok: true,
        status: await stopFavoritesSyncTask(),
      });
    }

    if (method === "POST" && path === "/sync/bilibili/history-model/dismiss") {
      if (favoritesSyncTask || favoritesSyncStartPending) {
        return fail(409, "Stop the active favorites sync before dismissing it");
      }
      return ok({
        ok: true,
        status: await dismissFavoritesSyncStatus(),
      });
    }

    if (method === "GET" && path === "/sync/bilibili/tag-enrichment/status") {
      const snapshot = await readState();
      return ok(getTagEnrichmentStatus(snapshot));
    }

    if (method === "GET" && path === "/sync/bilibili/tag-enrichment/settings") {
      const snapshot = await readState();
      return ok(getTagEnrichmentStatus(snapshot));
    }

    if (method === "GET" && path === "/sync/bilibili/following-ups/status") {
      return ok(getFollowingUpImportStatus());
    }

    if (method === "GET" && path === "/following-ups") {
      const snapshot = await readState();
      return ok({
        items: [...snapshot.followedUps].sort(
          (left, right) =>
            left.sortOrder - right.sortOrder || left.uid - right.uid,
        ),
      });
    }

    if (method === "POST" && path === "/sync/bilibili/history-model/start") {
      const selectedRemoteFolderIds = Array.isArray(
        body.selectedRemoteFolderIds,
      )
        ? body.selectedRemoteFolderIds
            .map((item) => toInt(item))
            .filter((item) => item > 0)
        : [];
      const resumePageByFolderRaw =
        body.resumePageByFolder && typeof body.resumePageByFolder === "object"
          ? (body.resumePageByFolder as Record<string, unknown>)
          : {};
      const resumePageByFolder: Record<string, number> = {};
      for (const [remoteIdRaw, pageRaw] of Object.entries(
        resumePageByFolderRaw,
      )) {
        const remoteId = toInt(remoteIdRaw);
        const page = toInt(pageRaw);
        if (remoteId > 0 && page > 1) {
          resumePageByFolder[String(remoteId)] = page;
        }
      }
      const started = await startFavoritesSyncTask({
        selectedRemoteFolderIds,
        resumePageByFolder,
        restart: Boolean(body.restart),
      });
      const snapshot = await readState();
      return ok({
        ok: true,
        started,
        status: getFavoritesSyncStatus(snapshot),
      });
    }

    if (method === "POST" && path === "/backup/reminder/backup-completed") {
      const timestamp = Math.max(1, toInt(body.timestamp, now()));
      const current = await readBackupReminderRecord();
      const record = await patchBackupReminderRecord({
        lastBackupAt: body.migration
          ? Math.max(current.lastBackupAt, timestamp)
          : timestamp,
        lastReminderDay: body.migration ? current.lastReminderDay : "",
      });
      return ok({ ok: true, ...record });
    }

    if (method === "POST" && path === "/backup/reminder/shown") {
      const record = await patchBackupReminderRecord({
        lastReminderDay: formatLocalCalendarDay(now()),
      });
      return ok({ ok: true, ...record });
    }

    if (
      method === "POST" &&
      path.startsWith("/sync/bilibili/tag-enrichment/")
    ) {
      if (!TAG_SYNC_ENABLED) {
        const snapshot = await readState();
        return ok(getTagEnrichmentStatus(snapshot));
      }
      if (
        path === "/sync/bilibili/tag-enrichment/stop" ||
        path === "/sync/bilibili/tag-enrichment/pause"
      ) {
        await pauseTagEnrichmentTask();
      } else if (path === "/sync/bilibili/tag-enrichment/dismiss") {
        await dismissTagEnrichmentStatus();
      } else if (path === "/sync/bilibili/tag-enrichment/restart") {
        await startTagEnrichmentTask({
          reset: true,
          immediate: true,
          force: true,
          ...(Array.isArray(body.selectedFolderIds)
            ? {
                selectedFolderIds: normalizePositiveIntList(
                  body.selectedFolderIds,
                ),
              }
            : {}),
        });
      } else if (
        path === "/sync/bilibili/tag-enrichment/resume" ||
        path === "/sync/bilibili/tag-enrichment/run"
      ) {
        await startTagEnrichmentTask({ immediate: true, force: true });
      } else if (path === "/sync/bilibili/tag-enrichment/start") {
        await startTagEnrichmentTask({
          immediate: true,
          force: true,
          ...(Array.isArray(body.selectedFolderIds)
            ? {
                selectedFolderIds: normalizePositiveIntList(
                  body.selectedFolderIds,
                ),
              }
            : {}),
        });
      } else {
        return fail(404, `Route not found: ${method} ${path}`);
      }
      const snapshot = await readState();
      return ok(getTagEnrichmentStatus(snapshot));
    }

    if (
      method === "PATCH" &&
      path === "/sync/bilibili/tag-enrichment/settings"
    ) {
      return ok(await updateTagEnrichmentSettings(body));
    }

    if (method === "POST" && path === "/sync/bilibili/following-ups/start") {
      const started = startFollowingUpImportTask();
      return ok({
        ok: true,
        started,
        status: getFollowingUpImportStatus(),
      });
    }

    if (method === "POST" && path === "/playback/folder-session") {
      try {
        const state = await readState();
        const request = body as FolderPlaybackRequest;
        const payload = buildFolderPlaybackSessionFromState(state, request);
        if (payload.session) {
          await setStoredFolderPlaybackSession(payload.session);
        } else {
          await clearStoredFolderPlaybackSession();
        }
        let opened = false;
        if (
          request.openTab === true &&
          payload.firstItem?.url &&
          chrome.tabs?.create
        ) {
          try {
            await chrome.tabs.create({
              url:
                markFolderPlaybackUrl(payload.firstItem.url) ||
                payload.firstItem.url,
            });
            opened = true;
          } catch (error) {
            // The queue is already persisted; report the tab failure without
            // turning a valid playback session into a failed request.
            console.warn("[BiliShelf] failed to open playback tab", error);
          }
        }
        return ok({ ...payload, opened });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(400, message);
      }
    }

    if (method === "GET" && path === "/playback/session") {
      return ok(await getStoredFolderPlaybackSession());
    }

    if (method === "PATCH" && path === "/playback/session/current") {
      try {
        const session = await updateStoredFolderPlaybackCurrent(
          body as FolderPlaybackCursor,
        );
        return ok(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return fail(400, message);
      }
    }

    if (method === "DELETE" && path === "/playback/session") {
      await clearStoredFolderPlaybackSession();
      return ok(undefined, 204);
    }

    if (isWriteRequestBlockedByFavoritesSync(method, path)) {
      return fail(
        423,
        "Favorites sync is running. Wait for completion (or stop sync) before modifying local folders/videos.",
      );
    }

    const folderAiCategoryMatch = matchFolderAiCategoriesPath(path);
    if (folderAiCategoryMatch && method === "POST") {
      if (!AI_CATEGORIES_ENABLED) {
        return fail(403, "AI categorization is temporarily disabled");
      }
      const folderId = toInt(folderAiCategoryMatch[1]);
      if (folderAiCategoryTask || folderAiCategoryFolderId !== null) {
        return fail(
          409,
          `AI categorization is already running for folder ${folderAiCategoryFolderId ?? "unknown"}`,
        );
      }
      folderAiCategoryFolderId = folderId;
      await withState((state) => {
        const aiMeta = ensureAiMeta(state);
        const currentAnalysis = getFolderAiAnalysis(state, folderId);
        const startedAt = now();
        writeFolderAiAnalysis(
          state,
          applyFolderCategoryAttempt(currentAnalysis, {
            folderId,
            status: "running",
            lastError: null,
            startedAt,
            finishedAt: null,
            updatedAt: startedAt,
            provider: aiMeta.provider,
            model: aiMeta.model,
            videos: [],
          }),
        );
      }, true);
      const task = withState(async (state) => {
        const data = await runFolderAiCategoriesInState(state, folderId);
        return ok(data);
      }, true);
      folderAiCategoryTask = task.finally(() => {
        folderAiCategoryTask = null;
        folderAiCategoryFolderId = null;
      });
      try {
        return await task;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI categorization failed";
        await withState((state) => {
          const aiMeta = ensureAiMeta(state);
          const currentAnalysis = getFolderAiAnalysis(state, folderId);
          const finishedAt = now();
          writeFolderAiAnalysis(
            state,
            applyFolderCategoryAttempt(currentAnalysis, {
              folderId,
              status: "error",
              lastError: message,
              startedAt: currentAnalysis?.startedAt ?? finishedAt,
              finishedAt,
              updatedAt: finishedAt,
              provider: aiMeta.provider,
              model: aiMeta.model,
              videos: [],
            }),
          );
        }, true);
        return fail(400, message);
      }
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

        if (
          method === "GET" &&
          path === "/sync/bilibili/bidirectional/settings"
        ) {
          const meta = ensureBidirectionalSyncMeta(state);
          return ok({
            biliToLocalEnabled: meta.biliToLocalEnabled,
            localToBiliEnabled: false,
            updatedAt: meta.updatedAt,
          });
        }

        if (
          method === "POST" &&
          path === "/sync/bilibili/invalid-video-recovery/start"
        ) {
          const videoIds = Array.isArray(body.videoIds)
            ? body.videoIds.map((item) => toInt(item)).filter((id) => id > 0)
            : [];
          try {
            const started = await startInvalidVideoRecoveryTask(videoIds);
            return ok({
              ok: true,
              started,
              status: getInvalidVideoRecoveryStatus(),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            return fail(400, message);
          }
        }

        if (method === "PATCH" && path === "/ai/settings") {
          const meta = ensureAiMeta(state);
          applyAiSettingsPatch(meta, body);
          if (meta.enabled) {
            try {
              validateAiSettings(meta);
            } catch (error) {
              return fail(
                400,
                error instanceof Error
                  ? error.message
                  : "AI settings are invalid",
              );
            }
          }
          meta.updatedAt = now();
          return ok(getAiSettings(meta));
        }

        if (method === "POST" && path === "/ai/settings/models") {
          const current = ensureAiMeta(state);
          const provider = normalizeAiProvider(
            body.provider ?? current.provider,
          );
          const customProviderName = normalizeText(
            body.customProviderName ?? current.customProviderName,
          );
          const baseUrl = normalizeAiProviderBaseUrl(
            provider,
            Object.prototype.hasOwnProperty.call(body, "baseUrl")
              ? normalizeAiBaseUrl(body.baseUrl)
              : current.baseUrl,
          );
          const apiKey = normalizeText(body.apiKey ?? current.apiKey);

          try {
            const result = await listAiProviderModels({
              provider,
              baseUrl,
              apiKey,
            });
            return ok({
              provider,
              customProviderName,
              baseUrl: result.baseUrl,
              models: result.models,
              source: result.source,
              supportsRemoteFetch: result.supportsRemoteFetch,
            });
          } catch (error) {
            return fail(
              400,
              error instanceof Error
                ? error.message
                : "Failed to load AI models",
            );
          }
        }

        if (
          method === "PATCH" &&
          path === "/sync/bilibili/bidirectional/settings"
        ) {
          const meta = ensureBidirectionalSyncMeta(state);
          if (
            Object.prototype.hasOwnProperty.call(body, "biliToLocalEnabled")
          ) {
            meta.biliToLocalEnabled = Boolean(body.biliToLocalEnabled);
          }
          meta.localToBiliEnabled = false;
          meta.updatedAt = now();
          return ok({
            biliToLocalEnabled: meta.biliToLocalEnabled,
            localToBiliEnabled: false,
            updatedAt: meta.updatedAt,
          });
        }

        if (method === "PATCH" && path === "/backup/webdav/settings") {
          const meta = ensureWebDavMeta(state);

          if (Object.prototype.hasOwnProperty.call(body, "enabled")) {
            meta.enabled = Boolean(body.enabled);
          }
          if (Object.prototype.hasOwnProperty.call(body, "baseUrl")) {
            meta.baseUrl = normalizeWebDavBaseUrl(body.baseUrl);
          }
          if (Object.prototype.hasOwnProperty.call(body, "username")) {
            meta.username = normalizeText(body.username);
          }
          if (Object.prototype.hasOwnProperty.call(body, "password")) {
            meta.password = String(body.password ?? "");
          }
          if (Object.prototype.hasOwnProperty.call(body, "remotePath")) {
            meta.remotePath = normalizeWebDavRemotePath(body.remotePath);
          }
          if (meta.enabled && !meta.baseUrl) {
            return fail(
              400,
              "WebDAV server URL is required when enabling WebDAV",
            );
          }
          if (meta.enabled && !meta.username) {
            return fail(
              400,
              "WebDAV username is required when enabling WebDAV",
            );
          }
          if (meta.enabled && !meta.password) {
            return fail(
              400,
              "WebDAV password is required when enabling WebDAV",
            );
          }
          meta.updatedAt = now();
          return ok({
            ok: true,
            ...getWebDavSettings(meta),
          });
        }

        if (method === "POST" && path === "/backup/webdav/test") {
          const meta = ensureWebDavMeta(state);
          try {
            if (!meta.baseUrl) {
              throw new Error("WebDAV server URL is not configured");
            }
            if (!meta.username) {
              throw new Error("WebDAV username is not configured");
            }
            if (!meta.password) {
              throw new Error("WebDAV password is not configured");
            }
            await ensureWebDavRemoteDirectory(meta);
            const probeName = `.bilishelf-probe-${Date.now()}.txt`;
            const putResponse = await requestWebDav(
              meta,
              "PUT",
              probeName,
              `bilishelf-probe ${new Date().toISOString()}`,
            );
            if (![200, 201, 204].includes(putResponse.status)) {
              throw new Error(
                `WebDAV write probe failed (${putResponse.status})`,
              );
            }
            const deleteResponse = await requestWebDav(
              meta,
              "DELETE",
              probeName,
            );
            if (![200, 202, 204, 404].includes(deleteResponse.status)) {
              throw new Error(
                `WebDAV cleanup failed (${deleteResponse.status})`,
              );
            }
            meta.lastTestAt = now();
            meta.lastTestOk = true;
            meta.lastError = null;
            return ok({
              ok: true,
              ...getWebDavSettings(meta),
            });
          } catch (error) {
            const baseMessage =
              error instanceof Error
                ? error.message
                : "WebDAV connectivity test failed";
            const has401 = /(?:\(|\s)401\)?/.test(baseMessage);
            const message = has401
              ? `${baseMessage}. Check WebDAV username/password (or app password), then save and retest.`
              : baseMessage;
            meta.lastTestAt = now();
            meta.lastTestOk = false;
            meta.lastError = message;
            return fail(400, message);
          }
        }

        if (method === "POST" && path === "/backup/webdav/upload") {
          const meta = ensureWebDavMeta(state);
          try {
            if (!meta.enabled) {
              throw new Error("WebDAV backup is disabled");
            }
            await ensureWebDavRemoteDirectory(meta);
            const jsonBackup = buildJsonExportResult(state);
            const latestFileName = WEBDAV_LATEST_FILE_NAME;
            const snapshotFileName = `bilishelf-${jsonBackup.stamp}.json`;
            const latestPut = await requestWebDav(
              meta,
              "PUT",
              latestFileName,
              jsonBackup.content,
            );
            if (![200, 201, 204].includes(latestPut.status)) {
              throw new Error(`WebDAV upload failed (${latestPut.status})`);
            }
            const snapshotPut = await requestWebDav(
              meta,
              "PUT",
              snapshotFileName,
              jsonBackup.content,
            );
            if (![200, 201, 204].includes(snapshotPut.status)) {
              throw new Error(
                `WebDAV snapshot upload failed (${snapshotPut.status})`,
              );
            }
            meta.lastBackupAt = now();
            meta.lastBackupFile = latestFileName;
            meta.lastError = null;
            await patchBackupReminderRecord({
              lastBackupAt: meta.lastBackupAt,
              lastReminderDay: "",
            });
            return ok({
              ok: true,
              latestFileName,
              snapshotFileName,
              summary: jsonBackup.summary,
              ...getWebDavSettings(meta),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "WebDAV backup failed";
            meta.lastError = message;
            return fail(400, message);
          }
        }

        if (method === "POST" && path === "/backup/webdav/download") {
          const meta = ensureWebDavMeta(state);
          try {
            const fileName =
              normalizeText(body.fileName) || WEBDAV_LATEST_FILE_NAME;
            const response = await requestWebDav(meta, "GET", fileName);
            if (response.status === 404) {
              throw new Error(`Remote backup file not found: ${fileName}`);
            }
            if (!response.ok) {
              throw new Error(`WebDAV download failed (${response.status})`);
            }
            const text = await response.text();
            if (!text || text.trim().length < 2) {
              throw new Error("Remote backup file is empty");
            }
            if (text.length > WEBDAV_MAX_DOWNLOAD_SIZE) {
              throw new Error("Remote backup file is too large");
            }
            meta.lastError = null;
            return ok({
              ok: true,
              fileName,
              mimeType: "application/json;charset=utf-8",
              content: text,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "WebDAV download failed";
            meta.lastError = message;
            return fail(400, message);
          }
        }

        if (method === "POST" && path === "/backup/webdav/restore") {
          if (favoritesSyncTask) {
            return fail(
              423,
              "Favorites sync is running. Please retry restore after sync finishes.",
            );
          }
          const meta = ensureWebDavMeta(state);
          try {
            const fileName =
              normalizeText(body.fileName) || WEBDAV_LATEST_FILE_NAME;
            const response = await requestWebDav(meta, "GET", fileName);
            if (response.status === 404) {
              throw new Error(`Remote backup file not found: ${fileName}`);
            }
            if (!response.ok) {
              throw new Error(
                `WebDAV restore download failed (${response.status})`,
              );
            }
            const content = await response.text();
            if (!content || content.trim().length < 2) {
              throw new Error("Remote backup file is empty");
            }
            const parsed = parseImportRows("json", content);
            const summary = applyImportRowsToState(
              state,
              parsed.rows,
              parsed.skipped,
              parsed.comments,
              parsed.commentsSkipped,
              parsed.articles,
              parsed.followedUps,
            );
            meta.lastRestoreAt = now();
            meta.lastError = null;
            return ok({
              ok: true,
              fileName,
              summary,
              restoredAt: now(),
              webdav: getWebDavSettings(meta),
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "WebDAV restore failed";
            meta.lastError = message;
            return fail(400, message);
          }
        }

        if (method === "POST" && path === "/sync/bilibili/video/pull") {
          const meta = ensureBidirectionalSyncMeta(state);
          if (!meta.biliToLocalEnabled) {
            return fail(403, "Bilibili->local action sync is disabled");
          }
          try {
            const result = await pullSingleFavoriteVideoFromBiliToLocal(state, {
              bvid: body.bvid,
              aid: body.aid,
            });
            return ok({
              ok: true,
              ...result,
            });
          } catch (error) {
            const message = isBiliRequestError(error)
              ? formatBiliRequestError(error)
              : error instanceof Error
                ? error.message
                : "Action sync failed";
            if (isBiliRequestError(error) && error.status === 412) {
              return fail(412, message);
            }
            return fail(500, message);
          }
        }

        if (method === "POST" && path === "/sync/bilibili") {
          const selectedRemoteFolderIds = Array.isArray(
            body.selectedRemoteFolderIds,
          )
            ? body.selectedRemoteFolderIds
                .map((item) => toInt(item))
                .filter((item) => item > 0)
            : [];

          try {
            const data = await syncFromBilibiliToState(state, {
              selectedRemoteFolderIds,
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
                `${message}. Open any Bilibili page in a tab, keep login active, and retry with one folder.`,
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
              total: items.length,
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
                `${message}. Open any Bilibili page in a tab and retry folder discovery.`,
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
            const summary = applyImportRowsToState(
              state,
              parsed.rows,
              parsed.skipped,
              parsed.comments,
              parsed.commentsSkipped,
              parsed.articles,
              parsed.followedUps,
            );

            return ok({
              ok: true,
              summary,
              importedAt: now(),
            });
          } catch (error) {
            return fail(
              400,
              error instanceof Error ? error.message : "Import failed",
            );
          }
        }

        if (method === "GET" && path === "/export") {
          const format = params.get("format") === "csv" ? "csv" : "json";
          const {
            stamp,
            exportFolders,
            exportVideos,
            exportArticleFolders,
            exportTags,
            exportComments,
            exportArticles,
            exportFollowedUps,
            folderNamesByVideo,
            folderCountByVideo,
            latestAddedAtByVideo,
            customTagsByVideo,
            systemTagsByVideo,
          } = buildExportPayload(state);
          const summary = {
            folders: exportFolders.length,
            articleFolders: format === "json" ? exportArticleFolders.length : 0,
            videos: exportVideos.length,
            tags: exportTags.length,
            comments: format === "json" ? exportComments.length : 0,
            articles: format === "json" ? exportArticles.length : 0,
            followedUps: format === "json" ? exportFollowedUps.length : 0,
          };

          if (format === "json") {
            return ok(buildJsonExportResult(state));
          }

          const header = [...LIBRARY_EXPORT_VIDEO_CSV_HEADER];
          const lines = [header.join(",")];

          for (const video of exportVideos) {
            const metadata = buildExportVideoMetadata(video, {
              folderNamesByVideo,
              folderCountByVideo,
              latestAddedAtByVideo,
              customTagsByVideo,
              systemTagsByVideo,
            });
            const row = [
              video.bvid,
              video.title,
              video.uploader,
              normalizeBiliSpaceUrl(video.uploaderSpaceUrl) ?? "",
              video.bvidUrl,
              video.coverUrl,
              metadata.folders.join("|"),
              metadata.folderCount,
              metadata.systemTags.join("|"),
              metadata.customTags.join("|"),
              formatTimestamp(video.publishAt),
              formatTimestamp(metadata.favoriteAt),
              video.isInvalid ? "1" : "0",
              formatTimestamp(video.deletedAt),
              video.description,
            ].map(csvEscape);
            lines.push(row.join(","));
          }

          return ok({
            format: "csv",
            filename: `bilishelf-export-${stamp}.csv`,
            mimeType: "text/csv;charset=utf-8",
            content: `\uFEFF${lines.join("\n")}`,
            summary,
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

        if (method === "POST" && path === "/comments/toggle") {
          try {
            return ok(toggleFavoriteComment(state, body));
          } catch (error) {
            return fail(
              400,
              error instanceof Error
                ? error.message
                : "Comment favorite failed",
            );
          }
        }

        if (method === "POST" && path === "/articles/toggle") {
          try {
            return ok(toggleFavoriteArticle(state, body));
          } catch (error) {
            return fail(
              400,
              error instanceof Error
                ? error.message
                : "Article favorite failed",
            );
          }
        }

        if (method === "POST" && path === "/articles") {
          try {
            return saveArticleSelectionToState(state, body);
          } catch (error) {
            return fail(
              400,
              error instanceof Error
                ? error.message
                : "Article favorite failed",
            );
          }
        }

        const articleFoldersMatch = path.match(/^\/articles\/(\d+)\/folders$/);
        if (articleFoldersMatch && method === "PATCH") {
          const articleId = toInt(articleFoldersMatch[1]);
          const article = state.articles.find(
            (row) => row.id === articleId && row.deletedAt == null,
          );
          if (!article) return fail(404, "Article favorite not found");
          const requestedIds = Array.isArray(body.folderIds)
            ? [
                ...new Set(
                  body.folderIds
                    .map((item) => toInt(item))
                    .filter((id) => id > 0),
                ),
              ]
            : [];
          const activeFolderIds = new Set(
            activeArticleFolders(state).map((folder) => folder.id),
          );
          article.folderIds = requestedIds.filter((folderId) =>
            activeFolderIds.has(folderId),
          );
          article.updatedAt = now();
          return ok(article);
        }

        const commentMatch = path.match(/^\/comments\/(\d+)$/);
        if (commentMatch && method === "DELETE") {
          const commentId = toInt(commentMatch[1]);
          if (!moveFavoriteCommentToTrash(state, commentId)) {
            return fail(404, "Comment favorite not found");
          }
          return ok({ ok: true });
        }

        const restoreCommentMatch = path.match(
          /^\/trash\/comments\/(\d+)\/restore$/,
        );
        if (restoreCommentMatch && method === "POST") {
          const commentId = toInt(restoreCommentMatch[1]);
          if (!restoreFavoriteCommentFromTrash(state, commentId)) {
            return fail(404, "Comment favorite not found in trash");
          }
          return ok({ ok: true });
        }

        const purgeCommentMatch = path.match(/^\/trash\/comments\/(\d+)$/);
        if (purgeCommentMatch && method === "DELETE") {
          const commentId = toInt(purgeCommentMatch[1]);
          if (!purgeFavoriteCommentFromTrash(state, commentId)) {
            return fail(404, "Comment favorite not found in trash");
          }
          return ok(undefined, 204);
        }

        const articleMatch = path.match(/^\/articles\/(\d+)$/);
        if (articleMatch && method === "DELETE") {
          const articleId = toInt(articleMatch[1]);
          if (!moveFavoriteArticleToTrash(state, articleId)) {
            return fail(404, "Article favorite not found");
          }
          return ok({ ok: true });
        }

        const restoreArticleMatch = path.match(
          /^\/trash\/articles\/(\d+)\/restore$/,
        );
        if (restoreArticleMatch && method === "POST") {
          const articleId = toInt(restoreArticleMatch[1]);
          if (!restoreFavoriteArticleFromTrash(state, articleId)) {
            return fail(404, "Article favorite not found in trash");
          }
          return ok({ ok: true });
        }

        const purgeArticleMatch = path.match(/^\/trash\/articles\/(\d+)$/);
        if (purgeArticleMatch && method === "DELETE") {
          const articleId = toInt(purgeArticleMatch[1]);
          if (!purgeFavoriteArticleFromTrash(state, articleId)) {
            return fail(404, "Article favorite not found in trash");
          }
          return ok(undefined, 204);
        }

        if (method === "POST" && path === "/folders") {
          const name = normalizeText(body.name);
          if (!name) return fail(400, "Folder name is required");

          const hasConflict = activeFolders(state).some(
            (folder) => normalizeKey(folder.name) === normalizeKey(name),
          );
          if (hasConflict) return fail(409, "Folder name already exists");

          const created: FolderRecord = {
            id: state.counters.folder++,
            name,
            description: normalizeText(body.description) || null,
            groupName: normalizeText(body.groupName) || null,
            remoteMediaId: null,
            sortOrder: activeFolders(state).length + 1,
            deletedAt: null,
            createdAt: now(),
            updatedAt: now(),
          };
          state.folders.push(created);
          return ok(created, 201);
        }

        if (method === "POST" && path === "/article-folders") {
          state.articleFolders ??= [];
          const name = normalizeText(body.name);
          if (!name) return fail(400, "Article folder name is required");
          const hasConflict = activeArticleFolders(state).some(
            (folder) => normalizeKey(folder.name) === normalizeKey(name),
          );
          if (hasConflict)
            return fail(409, "Article folder name already exists");
          const timestamp = now();
          const nextId = Math.max(1, toInt(state.counters.articleFolder, 1));
          const created: ArticleFolderRecord = {
            id: nextId,
            name,
            description: normalizeText(body.description) || null,
            groupName: normalizeText(body.groupName) || null,
            sortOrder: activeArticleFolders(state).length + 1,
            deletedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          state.counters.articleFolder = nextId + 1;
          state.articleFolders.push(created);
          return ok(created, 201);
        }

        const articleFolderMatch = path.match(/^\/article-folders\/(\d+)$/);
        if (articleFolderMatch && method === "PATCH") {
          state.articleFolders ??= [];
          const folderId = toInt(articleFolderMatch[1]);
          const folder = state.articleFolders.find(
            (item) => item.id === folderId,
          );
          if (!folder || folder.deletedAt !== null) {
            return fail(404, "Article folder not found");
          }
          const nextName = normalizeText(body.name);
          if (nextName) {
            const hasConflict = activeArticleFolders(state).some(
              (item) =>
                item.id !== folderId &&
                normalizeKey(item.name) === normalizeKey(nextName),
            );
            if (hasConflict)
              return fail(409, "Article folder name already exists");
            folder.name = nextName;
          }
          if (Object.prototype.hasOwnProperty.call(body, "description")) {
            folder.description = normalizeText(body.description) || null;
          }
          if (Object.prototype.hasOwnProperty.call(body, "groupName")) {
            folder.groupName = normalizeText(body.groupName) || null;
          }
          folder.updatedAt = now();
          return ok(folder);
        }

        if (articleFolderMatch && method === "DELETE") {
          state.articleFolders ??= [];
          const folderId = toInt(articleFolderMatch[1]);
          const folder = state.articleFolders.find(
            (item) => item.id === folderId,
          );
          if (!folder || folder.deletedAt !== null) {
            return fail(404, "Article folder not found");
          }
          state.articleFolders = state.articleFolders.filter(
            (item) => item.id !== folderId,
          );
          state.articles = state.articles.map((article) => ({
            ...article,
            folderIds: article.folderIds.filter((id) => id !== folderId),
          }));
          return ok({ ok: true });
        }

        if (method === "PATCH" && path === "/article-folders/order") {
          state.articleFolders ??= [];
          const requestedIds = Array.isArray(body.folderIds)
            ? body.folderIds.map((item) => toInt(item))
            : [];
          if (requestedIds.length === 0)
            return fail(400, "folderIds is required");
          const active = activeArticleFolders(state);
          const activeIds = new Set(active.map((folder) => folder.id));
          const ordered = requestedIds.filter(
            (id, index) =>
              activeIds.has(id) && requestedIds.indexOf(id) === index,
          );
          for (const folder of active) {
            if (!ordered.includes(folder.id)) ordered.push(folder.id);
          }
          ordered.forEach((id, index) => {
            const folder = state.articleFolders.find((item) => item.id === id);
            if (folder) folder.sortOrder = index + 1;
          });
          return ok({ ok: true, orderedIds: ordered });
        }

        const folderMatch = path.match(/^\/folders\/(\d+)$/);
        const folderAiCategoryWriteMatch = matchFolderAiCategoriesPath(path);
        if (folderAiCategoryWriteMatch && method === "DELETE") {
          if (!AI_CATEGORIES_ENABLED) {
            return fail(403, "AI categorization is temporarily disabled");
          }
          const folderId = toInt(folderAiCategoryWriteMatch[1]);
          ensureAiMeta(state);
          state.ai.folderAnalyses = state.ai.folderAnalyses.filter(
            (item) => item.folderId !== folderId,
          );
          state.ai.videoAnalyses = state.ai.videoAnalyses.filter(
            (item) => item.folderId !== folderId,
          );
          state.ai.updatedAt = now();
          return ok(undefined, 204);
        }

        if (folderMatch && method === "PATCH") {
          const folderId = toInt(folderMatch[1]);
          const folder = state.folders.find((row) => row.id === folderId);
          if (!folder || folder.deletedAt !== null)
            return fail(404, "Folder not found");

          const nextName = normalizeText(body.name);
          if (nextName) {
            const hasConflict = activeFolders(state).some(
              (row) =>
                row.id !== folderId &&
                normalizeKey(row.name) === normalizeKey(nextName),
            );
            if (hasConflict) return fail(409, "Folder name already exists");
            folder.name = nextName;
          }

          if (Object.prototype.hasOwnProperty.call(body, "description")) {
            folder.description = normalizeText(body.description) || null;
          }
          if (Object.prototype.hasOwnProperty.call(body, "groupName")) {
            folder.groupName = normalizeText(body.groupName) || null;
          }

          folder.updatedAt = now();
          return ok(folder);
        }

        if (folderMatch && method === "DELETE") {
          const folderId = toInt(folderMatch[1]);
          const folder = state.folders.find((row) => row.id === folderId);
          if (!folder || folder.deletedAt !== null)
            return fail(404, "Folder not found");
          folder.deletedAt = now();
          folder.updatedAt = now();
          markOrphanVideosDeleted(state);
          return ok({ ok: true });
        }

        if (method === "PATCH" && path === "/folders/order") {
          const folderIds = Array.isArray(body.folderIds)
            ? body.folderIds.map((item) => toInt(item))
            : [];
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
              const itemCount = state.folderItems.filter(
                (item) => item.folderId === folder.id,
              ).length;
              return { ...folder, itemCount };
            });
          return ok({ items });
        }

        const restoreFolderMatch = path.match(
          /^\/trash\/folders\/(\d+)\/restore$/,
        );
        if (restoreFolderMatch && method === "POST") {
          const folderId = toInt(restoreFolderMatch[1]);
          const folder = state.folders.find((row) => row.id === folderId);
          if (!folder || folder.deletedAt === null)
            return fail(404, "Folder not found");

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
          if (!folder || folder.deletedAt === null)
            return fail(404, "Folder not found");

          const linkedVideoIds = state.folderItems
            .filter((item) => item.folderId === folderId)
            .map((item) => item.videoId);

          state.folderItems = state.folderItems.filter(
            (item) => item.folderId !== folderId,
          );
          state.folders = state.folders.filter((row) => row.id !== folderId);

          for (const videoId of linkedVideoIds) {
            const stillLinked = state.folderItems.some(
              (item) => item.videoId === videoId,
            );
            if (!stillLinked) {
              removeVideoCompletely(state, videoId);
            }
          }
          return ok(undefined, 204);
        }

        if (method === "POST" && path === "/videos") {
          return saveVideoSelectionToState(state, body);
        }

        const videoByIdMatch = path.match(/^\/videos\/(\d+)$/);
        if (videoByIdMatch && method === "GET") {
          const videoId = toInt(videoByIdMatch[1]);
          const video = state.videos.find(
            (row) => row.id === videoId && row.deletedAt === null,
          );
          if (!video) return fail(404, "Video not found");

          const folders = state.folderItems
            .filter((item) => item.videoId === videoId)
            .map((item) =>
              state.folders.find((folder) => folder.id === item.folderId),
            )
            .filter(
              (folder): folder is FolderRecord =>
                !!folder && folder.deletedAt === null,
            )
            .map((folder) => ({ id: folder.id, name: folder.name }));

          const tags = state.videoTags
            .filter((edge) => edge.videoId === videoId)
            .map((edge) => state.tags.find((tag) => tag.id === edge.tagId))
            .filter((tag): tag is TagRecord => !!tag && tag.archivedAt === null)
            .map((tag) => ({ id: tag.id, name: tag.name, type: tag.type }));

          return ok({
            ...mapVideo(state, video),
            folders,
            tags,
          });
        }

        if (videoByIdMatch && method === "PATCH") {
          const videoId = toInt(videoByIdMatch[1]);
          const video = state.videos.find(
            (row) => row.id === videoId && row.deletedAt === null,
          );
          if (!video) return fail(404, "Video not found");

          const hasAnyPatchField = [
            "title",
            "coverUrl",
            "uploader",
            "uploaderSpaceUrl",
            "description",
            "partition",
            "publishAt",
            "bvidUrl",
            "isInvalid",
            "customTags",
            "systemTags",
          ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
          if (!hasAnyPatchField)
            return fail(400, "At least one field is required");

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
            video.uploaderSpaceUrl = normalizeBiliSpaceUrl(
              body.uploaderSpaceUrl,
            );
          }
          if (Object.prototype.hasOwnProperty.call(body, "description")) {
            video.description = normalizeText(body.description);
          }
          if (Object.prototype.hasOwnProperty.call(body, "partition")) {
            video.partition = normalizeVideoPartition(body.partition);
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
                  return (
                    !!tag && tag.archivedAt === null && tag.type === "custom"
                  );
                })
                .map((edge) => edge.tagId),
            );

            if (customTagIds.size > 0) {
              state.videoTags = state.videoTags.filter(
                (edge) =>
                  !(edge.videoId === videoId && customTagIds.has(edge.tagId)),
              );
            }

            const customTagNames = uniqueTextList(
              Array.isArray(body.customTags) ? body.customTags : [],
            );
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
                  return (
                    !!tag && tag.archivedAt === null && tag.type === "system"
                  );
                })
                .map((edge) => edge.tagId),
            );

            if (systemTagIds.size > 0) {
              state.videoTags = state.videoTags.filter(
                (edge) =>
                  !(edge.videoId === videoId && systemTagIds.has(edge.tagId)),
              );
            }

            const systemTagNames = uniqueTextList(
              Array.isArray(body.systemTags) ? body.systemTags : [],
            ).filter(
              (tagName) => !BLOCKED_SYSTEM_TAGS.has(normalizeKey(tagName)),
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
          const video = state.videos.find(
            (row) => row.id === videoId && row.deletedAt === null,
          );
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
            to: toIntOrNull(params.get("to")),
          });
          const data = paginate(
            items,
            params.get("page"),
            params.get("pageSize"),
          );
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
            to: toIntOrNull(params.get("to")),
          });
          const data = paginate(
            items,
            params.get("page"),
            params.get("pageSize"),
          );
          return ok(data);
        }

        if (method === "POST" && path === "/videos/batch/folders") {
          const mode =
            body.mode === "move" ? "move" : body.mode === "copy" ? "copy" : "";
          const folderId = toInt(body.folderId);
          const targetFolder = state.folders.find(
            (row) => row.id === folderId && row.deletedAt === null,
          );
          if (!targetFolder) return fail(400, "Target folder is invalid");
          if (!mode) return fail(400, "mode must be move or copy");

          const sourceFolderId = params.get("sourceFolderId")
            ? toInt(params.get("sourceFolderId"))
            : null;
          const videoIds = Array.isArray(body.videoIds)
            ? body.videoIds.map((id) => toInt(id))
            : [];
          let affected = 0;

          for (const videoId of videoIds) {
            const video = state.videos.find(
              (row) => row.id === videoId && row.deletedAt === null,
            );
            if (!video) continue;

            if (mode === "move") {
              if (sourceFolderId) {
                state.folderItems = state.folderItems.filter(
                  (item) =>
                    !(
                      item.videoId === videoId &&
                      item.folderId === sourceFolderId
                    ),
                );
              }

              if (!folderItemExists(state, folderId, videoId)) {
                state.folderItems.push({
                  id: state.counters.folderItem++,
                  folderId,
                  videoId,
                  addedAt: now(),
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
              partition: video.partition,
              publishAt: video.publishAt,
              bvidUrl: video.bvidUrl,
              isInvalid: video.isInvalid,
              deletedAt: null,
              createdAt: clonedAt,
              updatedAt: clonedAt,
            };
            state.videos.push(clonedVideo);

            state.folderItems.push({
              id: state.counters.folderItem++,
              folderId,
              videoId: clonedVideo.id,
              addedAt: clonedAt,
            });

            const sourceTagRows = state.videoTags.filter(
              (edge) => edge.videoId === video.id,
            );
            for (const sourceTag of sourceTagRows) {
              state.videoTags.push({
                id: state.counters.videoTag++,
                videoId: clonedVideo.id,
                tagId: sourceTag.tagId,
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
          const mode =
            body.mode === "folderOnly"
              ? "folderOnly"
              : body.mode === "global"
                ? "global"
                : "";
          if (!mode) return fail(400, "mode is invalid");

          const videoIds = Array.isArray(body.videoIds)
            ? body.videoIds.map((id) => toInt(id))
            : [];
          let affected = 0;

          if (mode === "folderOnly") {
            const folderId = toInt(body.folderId);
            if (!folderId) return fail(400, "folderId is required");
            const scopedVideoIds = Array.from(
              new Set(
                state.folderItems
                  .filter(
                    (item) =>
                      item.folderId === folderId &&
                      videoIds.includes(item.videoId),
                  )
                  .map((item) => item.videoId),
              ),
            );
            if (scopedVideoIds.length === 0) {
              return ok({ ok: true, affected: 0 });
            }
            const scopedVideoIdSet = new Set(scopedVideoIds);

            const folderCountByVideo = new Map<number, number>();
            for (const item of state.folderItems) {
              if (!scopedVideoIdSet.has(item.videoId)) continue;
              folderCountByVideo.set(
                item.videoId,
                (folderCountByVideo.get(item.videoId) ?? 0) + 1,
              );
            }

            const toSoftDelete = scopedVideoIds.filter(
              (videoId) => (folderCountByVideo.get(videoId) ?? 0) <= 1,
            );
            const toDetachOnly = scopedVideoIds.filter(
              (videoId) => (folderCountByVideo.get(videoId) ?? 0) > 1,
            );
            const toSoftDeleteSet = new Set(toSoftDelete);
            const toDetachOnlySet = new Set(toDetachOnly);

            if (toSoftDelete.length > 0) {
              const deletedAt = now();
              for (const video of state.videos) {
                if (!toSoftDeleteSet.has(video.id)) continue;
                if (video.deletedAt !== null) continue;
                video.deletedAt = deletedAt;
                video.updatedAt = deletedAt;
              }
            }

            if (toDetachOnly.length > 0) {
              state.folderItems = state.folderItems.filter(
                (item) =>
                  !(
                    item.folderId === folderId &&
                    toDetachOnlySet.has(item.videoId)
                  ),
              );
            }

            affected = scopedVideoIds.length;
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
          const startedAt = Date.now();
          const tagCount = state.tags.length;
          const videoTagCount = state.videoTags.length;
          const videoCount = state.videos.length;

          const items = state.tags
            .filter((tag) => tag.archivedAt === null)
            .filter((tag) =>
              type === "system" || type === "custom" ? tag.type === type : true,
            )
            .filter((tag) =>
              search ? includesIgnoreCase(tag.name, search) : true,
            )
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((tag) => {
              const linkedVideoIds = state.videoTags
                .filter((edge) => edge.tagId === tag.id)
                .map((edge) => edge.videoId);
              const usageCount = state.videos.filter(
                (video) =>
                  video.deletedAt === null && linkedVideoIds.includes(video.id),
              ).length;
              return {
                id: tag.id,
                name: tag.name,
                type: tag.type,
                usageCount,
                createdAt: tag.createdAt,
              };
            });

          const data = paginate(items, page, pageSize);
          const elapsedMs = Date.now() - startedAt;
          if (elapsedMs > 400) {
            console.warn(
              `[tags] computed in ${elapsedMs}ms (tags=${tagCount}, videoTags=${videoTagCount}, videos=${videoCount}, page=${page ?? "1"}, pageSize=${pageSize ?? "30"})`,
            );
          }
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
              normalizeKey(tag.name) === normalizeKey(name),
          );

          if (existing) {
            return ok({
              id: existing.id,
              name: existing.name,
              type: existing.type,
              usageCount: 0,
              createdAt: existing.createdAt,
            });
          }

          const created: TagRecord = {
            id: state.counters.tag++,
            name,
            type,
            createdAt: now(),
            archivedAt: null,
          };
          state.tags.push(created);
          return ok(
            {
              id: created.id,
              name: created.name,
              type: created.type,
              usageCount: 0,
              createdAt: created.createdAt,
            },
            201,
          );
        }

        const tagMatch = path.match(/^\/tags\/(\d+)$/);
        if (tagMatch && method === "PATCH") {
          const tagId = toInt(tagMatch[1]);
          const tag = state.tags.find(
            (row) => row.id === tagId && row.archivedAt === null,
          );
          if (!tag) return fail(404, "Tag not found");

          const nextName = normalizeText(body.name);
          if (!nextName) return fail(400, "Tag name is required");

          const mergedTarget = state.tags.find(
            (row) =>
              row.id !== tag.id &&
              row.archivedAt === null &&
              row.type === tag.type &&
              normalizeKey(row.name) === normalizeKey(nextName),
          );

          if (mergedTarget) {
            for (const edge of state.videoTags.filter(
              (row) => row.tagId === tag.id,
            )) {
              ensureVideoTag(state, edge.videoId, mergedTarget.id);
            }
            state.videoTags = state.videoTags.filter(
              (row) => row.tagId !== tag.id,
            );
            tag.archivedAt = now();

            return ok({
              id: mergedTarget.id,
              name: mergedTarget.name,
              type: mergedTarget.type,
              usageCount: 0,
              createdAt: mergedTarget.createdAt,
            });
          }

          tag.name = nextName;
          return ok({
            id: tag.id,
            name: tag.name,
            type: tag.type,
            usageCount: 0,
            createdAt: tag.createdAt,
          });
        }

        if (tagMatch && method === "DELETE") {
          const tagId = toInt(tagMatch[1]);
          const tag = state.tags.find(
            (row) => row.id === tagId && row.archivedAt === null,
          );
          if (!tag) return fail(404, "Tag not found");
          tag.archivedAt = now();
          state.videoTags = state.videoTags.filter(
            (edge) => edge.tagId !== tagId,
          );
          return ok(undefined, 204);
        }

        if (method === "GET" && path === "/trash/videos") {
          const items = filterVideoList(state, { includeDeleted: true })
            .filter((video) => video.deletedAt !== null)
            .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
          const data = paginate(
            items,
            params.get("page"),
            params.get("pageSize"),
          );
          return ok(data);
        }

        const restoreVideoMatch = path.match(
          /^\/trash\/videos\/(\d+)\/restore$/,
        );
        if (restoreVideoMatch && method === "POST") {
          const videoId = toInt(restoreVideoMatch[1]);
          const video = state.videos.find(
            (row) => row.id === videoId && row.deletedAt !== null,
          );
          if (!video) return fail(404, "Video not found");
          const restoredAt = now();
          video.deletedAt = null;
          video.updatedAt = restoredAt;
          // Backward-compat: old folderOnly delete logic could drop folder links.
          // Ensure restored videos are visible in manager by attaching one active folder link.
          if (!hasActiveFolder(state, videoId)) {
            const fallbackFolder = activeFolders(state)[0];
            if (
              fallbackFolder &&
              !folderItemExists(state, fallbackFolder.id, videoId)
            ) {
              state.folderItems.push({
                id: state.counters.folderItem++,
                folderId: fallbackFolder.id,
                videoId,
                addedAt: restoredAt,
              });
            }
          }
          return ok({ ok: true });
        }

        const purgeVideoMatch = path.match(/^\/trash\/videos\/(\d+)$/);
        if (purgeVideoMatch && method === "DELETE") {
          const videoId = toInt(purgeVideoMatch[1]);
          const video = state.videos.find(
            (row) => row.id === videoId && row.deletedAt !== null,
          );
          if (!video) return fail(404, "Video not found");
          removeVideoCompletely(state, videoId);
          return ok(undefined, 204);
        }

        return fail(404, `Route not found: ${method} ${path}`);
      }, method !== "GET");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return fail(500, message);
    }
  } finally {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > SLOW_API_THRESHOLD_MS) {
      console.warn(`[api] ${method} ${path} took ${elapsedMs}ms`);
    }
  }
}

export default defineBackground(() => {
  scheduleExtensionUpdateCheckAlarm();
  void checkExtensionUpdate(false).catch((error) => {
    console.warn("[extension-update] initial check failed:", error);
  });
  void scheduleBackupReminderAlarm().catch((error) => {
    console.warn("[backup-reminder] alarm setup failed:", error);
  });
  void checkAndNotifyBackupReminder().catch((error) => {
    console.warn("[backup-reminder] initial check failed:", error);
  });
  void readState()
    .then((state) =>
      scheduleFavoritesSyncRetry(state.syncMeta.favoritesJob.active),
    )
    .catch(() => undefined);
  void restoreTagEnrichmentTask().catch((error) => {
    console.warn("[tag-enrich] restore failed:", error);
  });
  void readAiOrganizerTask()
    .then((task) => {
      if (
        task &&
        !task.paused &&
        (task.stage === "planning" || task.stage === "classifying")
      ) {
        scheduleAiOrganizerAlarm(task);
        void triggerAiOrganizerWorker();
      }
    })
    .catch((error) => {
      console.warn("[ai-organizer] restore failed:", error);
    });

  if (chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === EXTENSION_UPDATE_ALARM) {
        void checkExtensionUpdate(false).catch((error) => {
          console.warn("[extension-update] scheduled check failed:", error);
        });
        return;
      }
      if (alarm.name === BACKUP_REMINDER_ALARM) {
        void checkAndNotifyBackupReminder().catch((error) => {
          console.warn("[backup-reminder] alarm failed:", error);
        });
        return;
      }
      if (alarm.name === AI_ORGANIZER_ALARM) {
        clearAiOrganizerAlarm();
        void triggerAiOrganizerWorker().catch((error) => {
          console.warn("[ai-organizer] alarm failed:", error);
        });
        return;
      }
      if (alarm.name === TAG_ENRICH_ALARM) {
        if (chrome.alarms?.clear) chrome.alarms.clear(TAG_ENRICH_ALARM);
        void (async () => {
          const state = await readState();
          const meta = ensureTagEnrichmentMeta(state);
          if (meta.paused || meta.phase !== "waiting") return;
          if (meta.nextRunAt && meta.nextRunAt > now()) {
            scheduleTagEnrichment(meta);
            return;
          }
          await triggerTagEnrichment();
        })().catch((error) => {
          console.warn("[tag-enrich] alarm failed:", error);
        });
        return;
      }
      if (alarm.name === FAVORITES_SYNC_RETRY_ALARM) {
        if (chrome.alarms?.clear)
          chrome.alarms.clear(FAVORITES_SYNC_RETRY_ALARM);
        void (async () => {
          const state = await readState();
          const job = state.syncMeta.favoritesJob.active;
          if (!job?.retry.automatic || !job.retry.nextRetryAt) return;
          if (job.retry.nextRetryAt > now()) {
            scheduleFavoritesSyncRetry(job);
            return;
          }
          await startFavoritesSyncTask({
            selectedRemoteFolderIds: job.selectedRemoteFolderIds,
          });
        })().catch(() => undefined);
        return;
      }
    });
  }

  chrome.notifications?.onClicked?.addListener((notificationId) => {
    if (notificationId !== BACKUP_REMINDER_NOTIFICATION_ID) return;
    chrome.notifications?.clear?.(notificationId);
    chrome.runtime.openOptionsPage?.();
  });

  chrome.runtime.onInstalled?.addListener((details) => {
    if (details.reason !== "update") return;
    void recordExtensionUpdate(details.previousVersion).catch((error) => {
      console.warn("[extension-update] update notice failed:", error);
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) return false;

    const request = (message.request || {}) as LocalApiRequest;
    handleApi(request)
      .then(sendResponse)
      .catch((error) => {
        sendResponse(
          fail(
            500,
            error instanceof Error ? error.message : "Internal server error",
          ),
        );
      });
    return true;
  });
});
