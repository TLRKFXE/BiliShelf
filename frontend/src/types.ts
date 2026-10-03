export type Folder = {
  id: number;
  name: string;
  description: string | null;
  groupName?: string | null;
  sortOrder?: number;
  deletedAt?: number | null;
  itemCount?: number;
  createdAt: number;
  updatedAt: number;
};

export type Video = {
  id: number;
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  uploaderSpaceUrl?: string | null;
  description: string;
  partition?: string;
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean;
  deletedAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
  addedAt?: number;
  folderCount?: number;
  tags?: string[];
  customTags?: string[];
  systemTags?: string[];
};

export type ArticleFolder = Folder;

export type FavoriteComment = {
  id: number;
  sourceKey: string;
  rpid: string;
  rootRpid: string;
  bvid: string;
  videoTitle: string;
  videoUrl: string;
  sourceUrl: string;
  content: string;
  contentImageUrls: string[];
  authorName: string;
  authorMid: string;
  authorAvatarUrl: string;
  authorSpaceUrl: string;
  replyToName: string;
  likeCount: number;
  publishedAt: number | null;
  publishedAtText: string;
  savedAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type FavoriteArticle = {
  id: number;
  sourceKey: string;
  opusId: string;
  title: string;
  summary: string;
  content: string;
  coverUrl: string;
  authorName: string;
  authorMid: string;
  authorAvatarUrl: string;
  sourceUrl: string;
  folderIds: number[];
  savedAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type Tag = {
  id: number;
  name: string;
  type: "system" | "custom";
  usageCount: number;
  createdAt: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type CreateVideoPayload = {
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  uploaderSpaceUrl?: string | null;
  description: string;
  partition?: string;
  publishAt?: number | null;
  bvidUrl: string;
  isInvalid?: boolean;
  folderIds: number[];
  customTags?: string[];
  systemTags?: string[];
};

export type VideoFilter = {
  title?: string;
  description?: string;
  uploader?: string;
  customTag?: string;
  systemTag?: string;
  from?: number;
  to?: number;
};

export type AiProvider =
  | "openai"
  | "gemini"
  | "claude"
  | "grok"
  | "deepseek"
  | "kimi"
  | "openai-compatible";

export type AiSettings = {
  provider: AiProvider;
  customProviderName: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  apiKeySet: boolean;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  updatedAt: number;
};

export type AiSettingsModelOption = {
  id: string;
  label: string;
};

export type AiSettingsModelsResponse = {
  provider: AiProvider;
  customProviderName: string;
  baseUrl: string;
  models: AiSettingsModelOption[];
  source: "builtin" | "remote";
  supportsRemoteFetch: boolean;
};

export type AiOrganizerConfig = {
  scope: "all" | "folder";
  folderId: number | null;
  locale: "zh-CN" | "en-US";
  folderCount: number;
  referenceExistingFolders: boolean;
  instructions: string;
  confidenceThreshold: number;
  batchSize: number;
};

export type AiOrganizerPhase =
  | "idle"
  | "planning"
  | "classifying"
  | "waiting"
  | "paused"
  | "ready"
  | "failed"
  | "cancelled"
  | "completed"
  | "undone";

export type AiOrganizerStatus = {
  id?: string;
  phase: AiOrganizerPhase;
  stage?: Exclude<AiOrganizerPhase, "idle" | "waiting" | "paused">;
  running: boolean;
  paused: boolean;
  config?: AiOrganizerConfig;
  sourceFolderName?: string | null;
  total: number;
  processed: number;
  progress: number;
  skippedInvalid?: number;
  estimatedFolderLinksAdded?: number;
  estimatedFolderLinksRemoved?: number;
  taxonomy: Array<{
    key: string;
    name: string;
    description: string;
    include: string;
    exclude: string;
    count: number;
  }>;
  lowConfidence: number;
  invalidResults: number;
  provider?: string;
  model?: string;
  retryAttempt?: number;
  nextRunAt?: number | null;
  startedAt?: number | null;
  updatedAt?: number | null;
  finishedAt?: number | null;
  appliedAt?: number | null;
  undoneAt?: number | null;
  canApply: boolean;
  canUndo: boolean;
  lastError: string | null;
  applySummary?: {
    foldersCreated: number;
    folderLinksAdded: number;
    folderLinksRemoved: number;
    lowConfidence: number;
  } | null;
};

export type AiOrganizerPreviewItem = {
  videoId: number;
  bvid: string;
  title: string;
  uploader: string;
  currentFolders: string[];
  suggestedFolderKey: string;
  suggestedFolderName: string;
  appliedFolderName: string;
  confidence: number;
  lowConfidence: boolean;
  reason: string;
};

export type AiCategoryKey =
  | "animation"
  | "music"
  | "dance"
  | "game"
  | "knowledge"
  | "tech"
  | "sports"
  | "car"
  | "life"
  | "food"
  | "animal"
  | "fashion"
  | "ent"
  | "cinephile"
  | "news"
  | "other";

export type FolderAiCategories = {
  folderId: number;
  status: "running" | "success" | "error";
  lastError: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  provider: string;
  model: string;
  videos: Array<{
    videoId: number;
    category: AiCategoryKey;
    analyzedAt: number | null;
    provider: string;
    model: string;
  }>;
};

export type FollowedUp = {
  uid: number;
  name: string;
  avatarUrl: string;
  spaceUrl: string;
  sortOrder: number;
  importedAt: number;
  updatedAt: number;
};

export type FollowingUpImportStatus = {
  running: boolean;
  total: number;
  current: number;
  created: number;
  updated: number;
  failed: number;
  lastError: string | null;
};

export type FavoritesSyncSummary = {
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
  resumePageByFolder?: Record<string, number>;
  summary: FavoritesSyncSummary;
  invalidVideosDetected?: number;
  invalidVideoIds?: number[];
  errors: Array<{ folder: string; message: string }>;
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
  unavailableFolders: Array<{
    remoteFolderId: number;
    folder: string;
    expected: number;
    observed: number;
    unavailable: number;
    reason: string;
  }>;
};
