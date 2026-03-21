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

export function buildFolderAnalysisInput(state: unknown, folderId: number): FolderAnalysisInput;
export function applyFolderCategoryAttempt(
  previousAnalysis: FolderCategorySnapshot | null | undefined,
  nextAttempt: FolderCategorySnapshot | null | undefined,
): FolderCategorySnapshot | null;
