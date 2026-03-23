function normalizeFolderId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? Math.trunc(id) : 0;
}

function normalizeMediaCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

export function selectAllFolderIds(folders) {
  return (Array.isArray(folders) ? folders : [])
    .map((folder) => normalizeFolderId(folder?.remoteId))
    .filter(Boolean);
}

export function clearFolderSelection() {
  return [];
}

export function toggleFolderSelection(selectedFolderIds, remoteId, checked) {
  const normalizedRemoteId = normalizeFolderId(remoteId);
  const selected = Array.isArray(selectedFolderIds)
    ? selectedFolderIds.map((id) => normalizeFolderId(id)).filter(Boolean)
    : [];

  if (!normalizedRemoteId) return selected;
  if (!checked) {
    return selected.filter((id) => id !== normalizedRemoteId);
  }

  if (selected.includes(normalizedRemoteId)) {
    return selected;
  }

  return [...selected, normalizedRemoteId];
}

export function orderSelectedFolderIds(selectedFolderIds, folders) {
  const selected = new Set(
    (Array.isArray(selectedFolderIds) ? selectedFolderIds : [])
      .map((id) => normalizeFolderId(id))
      .filter(Boolean),
  );

  return selectAllFolderIds(folders).filter((remoteId) => selected.has(remoteId));
}

export function estimateSelectedVideoCount(selectedFolderIds, folders) {
  const selected = new Set(orderSelectedFolderIds(selectedFolderIds, folders));

  return (Array.isArray(folders) ? folders : []).reduce((sum, folder) => {
    const remoteId = normalizeFolderId(folder?.remoteId);
    if (!selected.has(remoteId)) return sum;
    return sum + normalizeMediaCount(folder?.mediaCount);
  }, 0);
}
