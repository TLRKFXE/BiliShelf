function toPositiveInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function compareStableFolderOrder(left, right) {
  const leftSort = toPositiveInt(left?.sortOrder);
  const rightSort = toPositiveInt(right?.sortOrder);
  if (leftSort !== rightSort) return leftSort - rightSort;

  const leftCreatedAt = toPositiveInt(left?.createdAt);
  const rightCreatedAt = toPositiveInt(right?.createdAt);
  if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt - rightCreatedAt;

  return toPositiveInt(left?.id) - toPositiveInt(right?.id);
}

export function reconcileRemoteFolderSortOrder(folders, remoteFolders) {
  const remoteOrderIndex = new Map(
    (Array.isArray(remoteFolders) ? remoteFolders : [])
      .map((folder, index) => [toPositiveInt(folder?.remoteId), index])
      .filter(([remoteId]) => remoteId > 0),
  );

  const activeFolders = (Array.isArray(folders) ? folders : []).filter(
    (folder) => folder && folder.deletedAt === null,
  );
  const remoteKnown = [];
  const remoteUnknown = [];
  const localOnly = [];

  for (const folder of activeFolders) {
    const remoteMediaId = toPositiveInt(folder.remoteMediaId);
    if (remoteMediaId <= 0) {
      localOnly.push(folder);
      continue;
    }
    if (remoteOrderIndex.has(remoteMediaId)) {
      remoteKnown.push(folder);
      continue;
    }
    remoteUnknown.push(folder);
  }

  remoteKnown.sort(
    (left, right) =>
      remoteOrderIndex.get(toPositiveInt(left.remoteMediaId)) -
        remoteOrderIndex.get(toPositiveInt(right.remoteMediaId)) ||
      compareStableFolderOrder(left, right),
  );
  remoteUnknown.sort(compareStableFolderOrder);
  localOnly.sort(compareStableFolderOrder);

  const ordered = [...remoteKnown, ...remoteUnknown, ...localOnly];
  ordered.forEach((folder, index) => {
    folder.sortOrder = index + 1;
  });

  return ordered;
}
