export type Folder = {
  id: number;
  name: string;
  description: string | null;
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
