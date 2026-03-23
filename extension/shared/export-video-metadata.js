function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeVideoPartition(value) {
  return normalizeText(value);
}

export const LIBRARY_EXPORT_VIDEO_CSV_HEADER = Object.freeze([
  "bvid",
  "title",
  "uploader",
  "uploaderSpaceUrl",
  "description",
  "coverUrl",
  "bvidUrl",
  "partition",
  "publishAt",
  "publishAtMs",
  "favoriteAt",
  "favoriteAtMs",
  "addedAt",
  "addedAtMs",
  "folderCount",
  "folders",
  "customTags",
  "systemTags",
  "isInvalid",
  "deletedAt",
]);

export function buildVideoExportMaps(state) {
  const folderById = new Map(
    (Array.isArray(state?.folders) ? state.folders : []).map((folder) => [folder.id, folder.name]),
  );
  const tagById = new Map(
    (Array.isArray(state?.tags) ? state.tags : []).map((tag) => [tag.id, tag]),
  );

  const folderNamesByVideo = new Map();
  const folderCountByVideo = new Map();
  const latestAddedAtByVideo = new Map();
  const folderIdsByVideo = new Map();

  for (const relation of Array.isArray(state?.folderItems) ? state.folderItems : []) {
    const folderName = folderById.get(relation.folderId);
    if (folderName) {
      const names = folderNamesByVideo.get(relation.videoId) ?? [];
      if (!names.includes(folderName)) names.push(folderName);
      folderNamesByVideo.set(relation.videoId, names);

      const ids = folderIdsByVideo.get(relation.videoId) ?? new Set();
      ids.add(relation.folderId);
      folderIdsByVideo.set(relation.videoId, ids);
      folderCountByVideo.set(relation.videoId, ids.size);
    }

    const latestAddedAt = latestAddedAtByVideo.get(relation.videoId) ?? 0;
    if (relation.addedAt > latestAddedAt) {
      latestAddedAtByVideo.set(relation.videoId, relation.addedAt);
    }
  }

  const customTagsByVideo = new Map();
  const systemTagsByVideo = new Map();
  for (const relation of Array.isArray(state?.videoTags) ? state.videoTags : []) {
    const tag = tagById.get(relation.tagId);
    if (!tag) continue;
    const target = tag.type === "custom" ? customTagsByVideo : systemTagsByVideo;
    const bucket = target.get(relation.videoId) ?? [];
    if (!bucket.includes(tag.name)) bucket.push(tag.name);
    target.set(relation.videoId, bucket);
  }

  return {
    folderNamesByVideo,
    folderCountByVideo,
    latestAddedAtByVideo,
    customTagsByVideo,
    systemTagsByVideo,
  };
}

export function buildExportVideoMetadata(video, maps) {
  const folders = maps.folderNamesByVideo.get(video.id) ?? [];
  return {
    partition: normalizeVideoPartition(video.partition),
    folderCount: maps.folderCountByVideo.get(video.id) ?? folders.length,
    folders,
    favoriteAt: maps.latestAddedAtByVideo.get(video.id) ?? null,
    customTags: maps.customTagsByVideo.get(video.id) ?? [],
    systemTags: maps.systemTagsByVideo.get(video.id) ?? [],
  };
}
