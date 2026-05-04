import type { FollowedUp } from "@/types";

export declare const FOLLOWING_UP_PAGE_SIZE_OPTIONS: readonly number[];
export declare const DEFAULT_FOLLOWING_UP_PAGE_SIZE: number;

export declare function normalizeFollowingUpPageSize(value: unknown): number;

export declare function paginateFollowingUps(
  records: FollowedUp[] | null | undefined,
  page?: number,
  pageSize?: number
): {
  items: FollowedUp[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
