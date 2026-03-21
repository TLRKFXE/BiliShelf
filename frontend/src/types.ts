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
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean;
  deletedAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
  addedAt?: number;
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
  baseUrl: string;
  model: string;
  enabled: boolean;
  apiKeySet: boolean;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  updatedAt: number;
};

export type AiFolderAnalysisStatus = "idle" | "running" | "success" | "error";

export type AiCategoryKey = string;

export type AiVideoAnalysis = {
  folderId: number;
  videoId: number;
  category: AiCategoryKey;
  analyzedAt: number | null;
  provider: string;
  model: string;
};

export type AiFolderAnalysis = {
  folderId: number;
  status: AiFolderAnalysisStatus;
  lastError: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  provider: string;
  model: string;
  videos: AiVideoAnalysis[];
};
