export type AiProvider =
  | "openai"
  | "gemini"
  | "claude"
  | "grok"
  | "deepseek"
  | "kimi"
  | "openai-compatible";

export type AiMeta = {
  provider: AiProvider;
  customProviderName: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  lastTestAt: number | null;
  lastTestOk: boolean;
  lastError: string | null;
  updatedAt: number;
};

export type AiCategoryKey = string;

export type FolderAiAnalysisRecord = {
  folderId: number;
  status: "idle" | "running" | "success" | "error";
  lastError: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  provider: AiProvider;
  model: string;
};

export type VideoAiAnalysisRecord = {
  folderId: number;
  videoId: number;
  category: AiCategoryKey;
  analyzedAt: number | null;
  provider: AiProvider;
  model: string;
};

export type AiState = AiMeta & {
  folderAnalyses: FolderAiAnalysisRecord[];
  videoAnalyses: VideoAiAnalysisRecord[];
};

export function normalizeAiProvider(value: unknown): AiProvider;
export function createDefaultAiState(nowValue?: number): AiState;
export function normalizeAiState(rawState: unknown, nowValue?: number): AiState;
