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

function normalizeStatus(value) {
  const text = normalizeText(value);
  return text === "running" ||
    text === "success" ||
    text === "error" ||
    text === "idle"
    ? text
    : "idle";
}

function normalizeVideoAnalysisRecord(record, fallbackFolderId, fallbackProvider, fallbackModel) {
  const category = normalizeText(record?.category);
  return {
    folderId: Number(record?.folderId) > 0 ? Number(record.folderId) : Number(fallbackFolderId),
    videoId: Number(record?.videoId) > 0 ? Number(record.videoId) : 0,
    category,
    analyzedAt: toIntOrNull(record?.analyzedAt),
    provider: normalizeText(record?.provider) || normalizeText(fallbackProvider),
    model: normalizeText(record?.model) || normalizeText(fallbackModel),
  };
}

function normalizeFolderCategorySnapshot(snapshot) {
  if (!snapshot || Number(snapshot?.folderId) <= 0) return null;
  const folderId = Number(snapshot.folderId);
  const provider = normalizeText(snapshot.provider);
  const model = normalizeText(snapshot.model);
  return {
    folderId,
    status: normalizeStatus(snapshot.status),
    lastError: normalizeText(snapshot.lastError) || null,
    startedAt: toIntOrNull(snapshot.startedAt),
    finishedAt: toIntOrNull(snapshot.finishedAt),
    updatedAt: toIntOrNull(snapshot.updatedAt) ?? 0,
    provider,
    model,
    videos: (Array.isArray(snapshot.videos) ? snapshot.videos : [])
      .map((item) => normalizeVideoAnalysisRecord(item, folderId, provider, model))
      .filter((item) => item.videoId > 0 && item.category),
  };
}

function hasReusableCategoryData(snapshot) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.videos) &&
      snapshot.videos.length > 0,
  );
}

export function applyFolderCategoryAttempt(previousAnalysis, nextAttempt) {
  const previous = normalizeFolderCategorySnapshot(previousAnalysis);
  const next = normalizeFolderCategorySnapshot(nextAttempt);
  if (!next) return previous;

  if (next.status === "success" && hasReusableCategoryData(next)) {
    return next;
  }

  if (!hasReusableCategoryData(previous)) {
    return next;
  }

  if (next.status === "success") {
    return {
      ...previous,
      status: "error",
      lastError: next.lastError || "AI analysis result was incomplete",
      startedAt: next.startedAt,
      finishedAt: next.finishedAt,
      updatedAt: next.updatedAt,
      provider: next.provider || previous.provider,
      model: next.model || previous.model,
    };
  }

  return {
    ...previous,
    status: next.status,
    lastError: next.lastError,
    startedAt: next.startedAt,
    finishedAt: next.finishedAt,
    updatedAt: next.updatedAt,
    provider: next.provider || previous.provider,
    model: next.model || previous.model,
  };
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
