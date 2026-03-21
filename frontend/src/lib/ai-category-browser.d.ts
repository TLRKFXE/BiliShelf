import type { FolderAiCategories, Video } from "../types";

export function canOpenAiCategoryBrowser(
  result: FolderAiCategories | null | undefined
): boolean;

export function loadAllAiBrowserVideos(options: {
  folderId: number;
  pageSize?: number;
  fetchPage: (options: {
    folderId: number;
    page: number;
    pageSize: number;
  }) => Promise<{
    items?: Video[];
    pagination?: {
      total?: number;
    };
  }>;
}): Promise<Video[]>;
