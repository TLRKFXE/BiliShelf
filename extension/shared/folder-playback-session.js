const FOLDER_PLAYBACK_STORAGE_KEY = "folderPlaybackSession";
const FOLDER_PLAYBACK_QUEUE_CAP = 1000;

function normalizePlaybackSession(session) {
  if (!session) return null;
  return {
    ...session,
    queue: Array.isArray(session.queue) ? session.queue : [],
    currentIndex: Number.isFinite(session.currentIndex) ? session.currentIndex : 0,
  };
}

function buildFolderPlaybackSession(videos = []) {
  const queue = [];
  let skippedInvalid = 0;
  let truncated = false;

  for (const video of videos) {
    if (!video) continue;

    if (video.isInvalid) {
      skippedInvalid += 1;
      continue;
    }

    if (queue.length >= FOLDER_PLAYBACK_QUEUE_CAP) {
      truncated = true;
      break;
    }

    queue.push({
      id: Number.isFinite(video.id) ? video.id : null,
      videoId: Number.isFinite(video.videoId)
        ? video.videoId
        : Number.isFinite(video.id)
          ? video.id
          : null,
      bvid: typeof video.bvid === "string" ? video.bvid : null,
      title: typeof video.title === "string" ? video.title.trim() : null,
      url: typeof video.url === "string" ? video.url : null,
      coverUrl: typeof video.coverUrl === "string" ? video.coverUrl : null,
      isInvalid: Boolean(video.isInvalid),
    });
  }

  return {
    queue,
    skippedInvalid,
    truncated,
  };
}

function findPlaybackQueueIndex(queue = [], { videoId, bvid } = {}) {
  if (!Array.isArray(queue) || !queue.length) return -1;

  if (Number.isFinite(videoId)) {
    const indexById = queue.findIndex(
      (item) => item.videoId === videoId || item.id === videoId,
    );
    if (indexById !== -1) return indexById;
  }

  if (typeof bvid === "string" && bvid) {
    const indexByBvid = queue.findIndex((item) => item.bvid === bvid);
    if (indexByBvid !== -1) return indexByBvid;
  }

  return -1;
}

function getAdjacentPlaybackItems(queue = [], currentIndex = 0) {
  const normalizedQueue = Array.isArray(queue) ? queue : [];

  if (!normalizedQueue.length) {
    return {
      previous: { disabled: true, item: null },
      next: { disabled: true, item: null },
    };
  }

  const index = Number.isFinite(currentIndex)
    ? Math.max(0, Math.min(normalizedQueue.length - 1, currentIndex))
    : 0;

  const previousDisabled = index <= 0;
  const nextDisabled = index >= normalizedQueue.length - 1;

  return {
    previous: {
      item: previousDisabled ? null : normalizedQueue[index - 1],
      disabled: previousDisabled,
    },
    next: {
      item: nextDisabled ? null : normalizedQueue[index + 1],
      disabled: nextDisabled,
    },
  };
}

export {
  FOLDER_PLAYBACK_STORAGE_KEY,
  FOLDER_PLAYBACK_QUEUE_CAP,
  normalizePlaybackSession,
  buildFolderPlaybackSession,
  findPlaybackQueueIndex,
  getAdjacentPlaybackItems,
};
