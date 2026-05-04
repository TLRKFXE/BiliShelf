export type FollowedUpInput = {
  uid?: unknown;
  mid?: unknown;
  id?: unknown;
  name?: unknown;
  uname?: unknown;
  username?: unknown;
  avatarUrl?: unknown;
  face?: unknown;
  avatar?: unknown;
  spaceUrl?: unknown;
  href?: unknown;
};

export type NormalizedFollowedUpRecord = {
  uid: number;
  name: string;
  avatarUrl: string;
  spaceUrl: string;
};

export type StoredFollowedUpRecord = NormalizedFollowedUpRecord & {
  sortOrder: number;
  importedAt: number;
  updatedAt: number;
};

export function normalizeFollowedUpRecord(
  input?: FollowedUpInput
): NormalizedFollowedUpRecord | null;

export function mergeFollowedUpRecords(
  existingRecords: StoredFollowedUpRecord[],
  importedRecords: NormalizedFollowedUpRecord[],
  nowTs: number
): {
  records: StoredFollowedUpRecord[];
  created: number;
  updated: number;
};

export function searchFollowedUps(
  records: StoredFollowedUpRecord[],
  keyword: string
): StoredFollowedUpRecord[];
