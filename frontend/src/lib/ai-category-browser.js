export function canOpenAiCategoryBrowser(result) {
  return Boolean(result && Array.isArray(result.videos) && result.videos.length > 0);
}

export async function loadAllAiBrowserVideos(options) {
  const pageSize = Math.max(1, Number(options?.pageSize) || 100);
  const loaded = [];
  let page = 1;
  let expectedTotal = null;

  while (true) {
    const response = await options.fetchPage({
      folderId: options.folderId,
      page,
      pageSize,
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    const totalValue = Number(response?.pagination?.total);

    if (Number.isFinite(totalValue) && totalValue >= 0) {
      expectedTotal = totalValue;
    }

    loaded.push(...items);

    if (items.length === 0) break;
    if (expectedTotal !== null && loaded.length >= expectedTotal) break;
    if (expectedTotal === null && items.length < pageSize) break;

    page += 1;
  }

  return loaded;
}
