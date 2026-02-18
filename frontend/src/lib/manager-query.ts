import type { LocationQuery } from "vue-router";
import {
  normalizeDateText,
  parseNullableFolderId,
  parsePositiveInt,
  readSingleQueryValue,
} from "./route-query";

export type ManagerQueryState = {
  keyword: string;
  selectedFolderId: number | null;
  fromDate: string;
  toDate: string;
  videoPage: number;
  videoPageSize: number;
};

export function buildManagerQueryFromState(
  state: ManagerQueryState,
  defaultPageSize = 30
) {
  const query: Record<string, string> = {};
  const normalizedKeyword = state.keyword.trim();
  if (normalizedKeyword) query.q = normalizedKeyword;
  if (state.selectedFolderId !== null) query.folderId = String(state.selectedFolderId);
  if (state.fromDate) query.from = state.fromDate;
  if (state.toDate) query.to = state.toDate;
  if (state.videoPage > 1) query.page = String(state.videoPage);
  if (state.videoPageSize !== defaultPageSize) {
    query.pageSize = String(state.videoPageSize);
  }
  return query;
}

export function parseManagerQuery(
  query: LocationQuery,
  pageSizeOptions: readonly number[],
  defaultPageSize = 30
): ManagerQueryState {
  return {
    keyword: String(readSingleQueryValue(query.q) ?? "").trim(),
    selectedFolderId: parseNullableFolderId(query.folderId),
    fromDate: normalizeDateText(query.from),
    toDate: normalizeDateText(query.to),
    videoPage: parsePositiveInt(query.page, 1),
    videoPageSize: parsePositiveInt(
      query.pageSize,
      defaultPageSize,
      pageSizeOptions
    ),
  };
}
