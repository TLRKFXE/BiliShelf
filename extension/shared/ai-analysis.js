import { STABLE_CATEGORY_KEYS } from "./ai-provider.js";

function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

const DEFAULT_CATEGORY_KEY = "other";
const STABLE_CATEGORY_KEY_SET = new Set(STABLE_CATEGORY_KEYS);

export function matchFolderAiCategoriesPath(path) {
  return (
    String(path ?? "").match(/^\/folders\/(\d+)\/ai-categories$/) ||
    String(path ?? "").match(/^\/folders\/(\d+)\/ai-analysis$/)
  );
}

function toIntOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeCategoryKey(value) {
  const key = normalizeText(value).toLowerCase();
  return STABLE_CATEGORY_KEY_SET.has(key) ? key : DEFAULT_CATEGORY_KEY;
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
  const category = normalizeCategoryKey(
    normalizeText(record?.category) ||
      normalizeText(Array.isArray(record?.categories) ? record.categories[0] : "") ||
      DEFAULT_CATEGORY_KEY,
  );
  return {
    folderId: Number(fallbackFolderId),
    videoId: Number(record?.videoId) > 0 ? Number(record.videoId) : 0,
    category,
    analyzedAt: toIntOrNull(record?.analyzedAt),
    provider: normalizeText(record?.provider) || normalizeText(fallbackProvider),
    model: normalizeText(record?.model) || normalizeText(fallbackModel),
  };
}

function deriveResponseStatus(snapshot) {
  if (!snapshot) return null;
  if (
    snapshot.status === "running" ||
    snapshot.status === "success" ||
    snapshot.status === "error"
  ) {
    return snapshot.status;
  }
  if (snapshot.videos.length > 0) return "success";
  if (snapshot.lastError) return "error";
  return null;
}

export function normalizeFolderAiCategoriesResponse(snapshot) {
  const normalized = normalizeFolderCategorySnapshot(snapshot);
  if (!normalized) return null;
  const status = deriveResponseStatus(normalized);
  if (!status) return null;
  return {
    ...normalized,
    status,
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
      .filter((item) => item.videoId > 0),
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
      lastError: next.lastError || "AI category result was incomplete",
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

export async function runFolderAiCategories(options) {
  const folderId = Number(options?.folderId);
  const input = options?.input ?? {};
  const provider = normalizeText(options?.provider);
  const model = normalizeText(options?.model);
  const nowFn = typeof options?.now === "function" ? options.now : Date.now;
  const classifyVideo = options?.classifyVideo;

  if (!Number.isFinite(folderId) || folderId <= 0) {
    throw new Error("folderId must be a positive number");
  }
  if (typeof classifyVideo !== "function") {
    throw new Error("classifyVideo must be a function");
  }

  const videos = Array.isArray(input?.videos) ? input.videos : [];
  if (videos.length === 0) {
    throw new Error("Folder has no videos to analyze");
  }

  const startedAt = Number(nowFn());
  const categorizedVideos = [];

  for (const video of videos) {
    const classified = await classifyVideo(
      {
        folderId,
        input,
        provider,
        model,
      },
      video,
    );
    categorizedVideos.push({
      folderId,
      videoId: Number(video?.videoId) || 0,
      category: normalizeText(classified?.category) || DEFAULT_CATEGORY_KEY,
      analyzedAt: Number(nowFn()),
      provider,
      model,
    });
  }

  const finishedAt = Number(nowFn());
  return {
    folderId,
    status: "success",
    lastError: null,
    startedAt,
    finishedAt,
    updatedAt: finishedAt,
    provider,
    model,
    videos: categorizedVideos,
  };
}

export function buildFolderCategorizationInput(state, folderId) {
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

export const buildFolderAnalysisInput = buildFolderCategorizationInput;
