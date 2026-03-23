function toPositiveInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveFolderPressure(folderMediaCount) {
  const count = toPositiveInt(folderMediaCount);
  if (count >= 5000) return 3;
  if (count >= 1500) return 2;
  if (count >= 300) return 1;
  return 0;
}

export function createFavoritesSyncThrottleState(options = {}) {
  const folderMediaCount = toPositiveInt(options.folderMediaCount);
  const totalVideosProcessed = toPositiveInt(options.totalVideosProcessed);

  return {
    folderMediaCount,
    folderPressure: resolveFolderPressure(folderMediaCount),
    pagesFetched: 0,
    folderVideosProcessed: 0,
    totalVideosProcessed,
    slowResponseStreak: 0,
    lastResponseMs: 0,
  };
}

export function updateFavoritesSyncThrottleState(state, metrics = {}) {
  const responseMs = toPositiveInt(metrics.responseMs);
  const pageMediaCount = toPositiveInt(metrics.pageMediaCount);
  const totalVideosProcessed = toPositiveInt(
    metrics.totalVideosProcessed,
    state?.totalVideosProcessed ?? 0
  );

  let slowResponseStreak = toPositiveInt(state?.slowResponseStreak);
  if (responseMs >= 2600) {
    slowResponseStreak = clamp(slowResponseStreak + 2, 0, 6);
  } else if (responseMs >= 1600) {
    slowResponseStreak = clamp(slowResponseStreak + 1, 0, 6);
  } else {
    slowResponseStreak = clamp(slowResponseStreak - 1, 0, 6);
  }

  return {
    ...(state ?? createFavoritesSyncThrottleState()),
    pagesFetched: toPositiveInt(state?.pagesFetched) + 1,
    folderVideosProcessed:
      toPositiveInt(state?.folderVideosProcessed) + pageMediaCount,
    totalVideosProcessed,
    slowResponseStreak,
    lastResponseMs: responseMs,
  };
}

export function resolveFavoritesPageGapMs(state) {
  const pressure = toPositiveInt(state?.folderPressure);
  const pagesFetched = toPositiveInt(state?.pagesFetched);
  const slowResponseStreak = toPositiveInt(state?.slowResponseStreak);
  const lastResponseMs = toPositiveInt(state?.lastResponseMs);

  let gapMs = 420 + pressure * 160;
  gapMs += Math.min(pagesFetched * 35, 210);
  gapMs += Math.min(slowResponseStreak * 140, 560);

  if (lastResponseMs >= 2600) {
    gapMs += 180;
  } else if (lastResponseMs >= 1600) {
    gapMs += 80;
  }

  return gapMs;
}

export function resolveFavoritesFolderGapMs(state) {
  const pressure = toPositiveInt(state?.folderPressure);
  const slowResponseStreak = toPositiveInt(state?.slowResponseStreak);

  return 700 + pressure * 220 + slowResponseStreak * 90;
}

export function resolveFavoritesCooldownPolicy(state) {
  const pressure = toPositiveInt(state?.folderPressure);
  const totalVideosProcessed = toPositiveInt(state?.totalVideosProcessed);
  const slowResponseStreak = toPositiveInt(state?.slowResponseStreak);
  const lastResponseMs = toPositiveInt(state?.lastResponseMs);
  const progressPenalty = Math.min(Math.floor(totalVideosProcessed / 800) * 40, 120);

  const thresholdVideos = clamp(
    520 - pressure * 80 - progressPenalty - slowResponseStreak * 30,
    160,
    520
  );

  let delayMs =
    10_000 +
    pressure * 4_000 +
    Math.min(Math.floor(totalVideosProcessed / 800) * 2_500, 7_500) +
    slowResponseStreak * 2_000;

  if (lastResponseMs >= 2600) {
    delayMs += 1_500;
  }

  return {
    thresholdVideos,
    delayMs,
  };
}
