function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

const DEFAULT_CATEGORY_KEY = "other";
const RETRY_DELAY_PATTERN = /^(\d+)s$/i;

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
  const category =
    normalizeText(record?.category) ||
    normalizeText(Array.isArray(record?.categories) ? record.categories[0] : "") ||
    DEFAULT_CATEGORY_KEY;
  return {
    folderId: Number(fallbackFolderId),
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

function parseAiProviderErrorDetails(rawMessage) {
  const message = normalizeText(rawMessage);
  if (!message) return null;
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const rootError =
    parsed.error && typeof parsed.error === "object" ? parsed.error : parsed;
  const code = Number(rootError.code);
  const status = normalizeText(rootError.status).toUpperCase();
  const providerMessage = normalizeText(rootError.message);
  const details = Array.isArray(rootError.details) ? rootError.details : [];

  let retryDelay = "";
  for (const detail of details) {
    if (!detail || typeof detail !== "object") continue;
    const candidate = normalizeText(detail.retryDelay);
    if (candidate) {
      retryDelay = candidate;
      break;
    }
  }

  const isQuotaError =
    code === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    status.includes("QUOTA") ||
    providerMessage.toLowerCase().includes("quota");
  if (!isQuotaError) return null;

  const retryLabel = retryDelay
    ? ` Retry after ${RETRY_DELAY_PATTERN.test(retryDelay) ? retryDelay : retryDelay}.`
    : "";
  const suffix = providerMessage ? ` ${providerMessage}` : "";
  return `AI provider quota exceeded.${suffix}${retryLabel}`.trim();
}

function normalizeCategorizationErrorMessage(error) {
  const fallback =
    error instanceof Error ? normalizeText(error.message) : normalizeText(error);
  return (
    parseAiProviderErrorDetails(fallback) ||
    fallback ||
    "AI categorization failed"
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
    let classified;
    try {
      classified = await classifyVideo(
        {
          folderId,
          input,
          provider,
          model,
        },
        video,
      );
    } catch (error) {
      throw new Error(normalizeCategorizationErrorMessage(error));
    }
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
