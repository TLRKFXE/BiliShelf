export type FavoritesSyncThrottleState = {
  folderMediaCount: number;
  folderPressure: number;
  pagesFetched: number;
  folderVideosProcessed: number;
  totalVideosProcessed: number;
  slowResponseStreak: number;
  lastResponseMs: number;
};

export function createFavoritesSyncThrottleState(options?: {
  folderMediaCount?: number;
  totalVideosProcessed?: number;
}): FavoritesSyncThrottleState;

export function updateFavoritesSyncThrottleState(
  state: FavoritesSyncThrottleState,
  metrics?: {
    responseMs?: number;
    pageMediaCount?: number;
    totalVideosProcessed?: number;
  }
): FavoritesSyncThrottleState;

export function resolveFavoritesPageGapMs(
  state: FavoritesSyncThrottleState
): number;

export function resolveFavoritesFolderGapMs(
  state: FavoritesSyncThrottleState
): number;

export function resolveFavoritesCooldownPolicy(
  state: FavoritesSyncThrottleState
): {
  thresholdVideos: number;
  delayMs: number;
};
