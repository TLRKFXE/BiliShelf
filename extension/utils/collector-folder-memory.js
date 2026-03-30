export const COLLECTOR_LAST_FOLDER_IDS_STORAGE_KEY =
  "bili_like_collector_last_folder_ids_v1";

function toPositiveInteger(value) {
  const normalized =
    typeof value === "string" ? Number.parseInt(value.trim(), 10) : Number(value);
  if (!Number.isFinite(normalized)) return null;
  const integer = Math.trunc(normalized);
  return integer > 0 ? integer : null;
}

export function normalizeRememberedCollectorFolderIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];

  const normalized = [];
  const seen = new Set();
  for (const value of rawIds) {
    const id = toPositiveInteger(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

export function resolveRememberedCollectorFolderIds(rawIds, folders) {
  const rememberedIdSet = new Set(normalizeRememberedCollectorFolderIds(rawIds));
  if (!rememberedIdSet.size || !Array.isArray(folders)) return [];

  return folders
    .map((folder) => toPositiveInteger(folder?.id))
    .filter((id) => id && rememberedIdSet.has(id));
}
