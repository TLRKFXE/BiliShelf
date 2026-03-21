import type {
  FolderAiAnalysisRecord,
  VideoAiAnalysisRecord,
} from "./ai-state.js";

export type FolderAnalysisVideoInput = {
  videoId: number;
  bvid: string;
  title: string;
  uploader: string;
  description: string;
  publishAt: number | null;
  addedAt: number | null;
  customTags: string[];
  systemTags: string[];
};

export type FolderAnalysisInput = {
  folderId: number;
  folderName: string;
  folderDescription: string;
  videos: FolderAnalysisVideoInput[];
};

export type FolderCategorySnapshot = FolderAiAnalysisRecord & {
  videos: VideoAiAnalysisRecord[];
};

export type FolderAiCategoriesResponse = Omit<FolderCategorySnapshot, "status"> & {
  status: "running" | "success" | "error";
};

export type RunFolderAiCategoriesOptions = {
  folderId: number;
  input: FolderAnalysisInput;
  provider: string;
  model: string;
  now?: () => number;
  classifyVideo: (
    context: {
      folderId: number;
      input: FolderAnalysisInput;
      provider: string;
      model: string;
    },
    video: FolderAnalysisVideoInput,
  ) => Promise<{ category?: unknown } | null | undefined>;
};

export function matchFolderAiCategoriesPath(path: string): RegExpMatchArray | null;
export function buildFolderAnalysisInput(state: unknown, folderId: number): FolderAnalysisInput;
export function buildFolderCategorizationInput(
  state: unknown,
  folderId: number,
): FolderAnalysisInput;
export function runFolderAiCategories(
  options: RunFolderAiCategoriesOptions,
): Promise<FolderCategorySnapshot>;
export function applyFolderCategoryAttempt(
  previousAnalysis: FolderCategorySnapshot | null | undefined,
  nextAttempt: FolderCategorySnapshot | null | undefined,
): FolderCategorySnapshot | null;
export function normalizeFolderAiCategoriesResponse(
  snapshot: FolderCategorySnapshot | null | undefined,
): FolderAiCategoriesResponse | null;
