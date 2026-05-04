export declare const LIBRARY_EXPORT_VIDEO_CSV_HEADER: readonly string[];

export declare function normalizeVideoPartition(value: unknown): string;

export declare function buildVideoExportMaps(
  state: unknown,
  exportedVideoIds?: Pick<Set<number>, "has"> | null,
): {
  folderNamesByVideo: Map<number, string[]>;
  folderCountByVideo: Map<number, number>;
  latestAddedAtByVideo: Map<number, number>;
  customTagsByVideo: Map<number, string[]>;
  systemTagsByVideo: Map<number, string[]>;
};

export declare function buildExportVideoMetadata(
  video: { id: number },
  maps: ReturnType<typeof buildVideoExportMaps>,
): {
  folderCount: number;
  folders: string[];
  favoriteAt: number | null;
  customTags: string[];
  systemTags: string[];
};
