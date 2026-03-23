import type { SyncRemoteFolder } from "./api";

export function selectAllFolderIds(folders: SyncRemoteFolder[]): number[];
export function clearFolderSelection(selectedFolderIds?: number[]): number[];
export function toggleFolderSelection(
  selectedFolderIds: number[],
  remoteId: number,
  checked: boolean
): number[];
export function orderSelectedFolderIds(
  selectedFolderIds: number[],
  folders: SyncRemoteFolder[]
): number[];
export function estimateSelectedVideoCount(
  selectedFolderIds: number[],
  folders: SyncRemoteFolder[]
): number;
