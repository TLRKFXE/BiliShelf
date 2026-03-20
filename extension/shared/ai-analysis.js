function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function toIntOrNull(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function uniqueTextList(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.map((item) => normalizeText(item)).filter(Boolean)),
  );
}

export function buildFolderAnalysisInput(state, folderId) {
  const folder = Array.isArray(state?.folders)
    ? state.folders.find((item) => Number(item?.id) === Number(folderId) && item?.deletedAt === null)
    : null;
  if (!folder) {
    throw new Error("Folder not found");
  }

  const tagById = new Map(
    (Array.isArray(state?.tags) ? state.tags : []).map((tag) => [
      Number(tag?.id),
      tag,
    ]),
  );

  const activeVideoIds = new Set(
    (Array.isArray(state?.folderItems) ? state.folderItems : [])
      .filter((item) => Number(item?.folderId) === Number(folderId))
      .map((item) => Number(item?.videoId))
      .filter((videoId) => Number.isFinite(videoId) && videoId > 0),
  );

  const videos = (Array.isArray(state?.videos) ? state.videos : [])
    .filter((video) => activeVideoIds.has(Number(video?.id)))
    .filter((video) => video?.deletedAt === null)
    .map((video) => {
      const videoTags = (Array.isArray(state?.videoTags) ? state.videoTags : [])
        .filter((edge) => Number(edge?.videoId) === Number(video?.id))
        .map((edge) => tagById.get(Number(edge?.tagId)))
        .filter(Boolean);

      return {
        videoId: Number(video.id),
        bvid: normalizeText(video.bvid),
        title: normalizeText(video.title),
        uploader: normalizeText(video.uploader),
        description: normalizeText(video.description),
        publishAt: toIntOrNull(video.publishAt),
        addedAt: toIntOrNull(
          (Array.isArray(state?.folderItems) ? state.folderItems : []).find(
            (item) =>
              Number(item?.folderId) === Number(folderId) &&
              Number(item?.videoId) === Number(video?.id),
          )?.addedAt,
        ),
        customTags: uniqueTextList(
          videoTags
            .filter((tag) => tag?.type === "custom")
            .map((tag) => tag?.name),
        ),
        systemTags: uniqueTextList(
          videoTags
            .filter((tag) => tag?.type === "system")
            .map((tag) => tag?.name),
        ),
      };
    });

  return {
    folderId: Number(folder.id),
    folderName: normalizeText(folder.name),
    folderDescription: normalizeText(folder.description),
    videos,
  };
}
