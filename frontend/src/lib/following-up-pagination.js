export const FOLLOWING_UP_PAGE_SIZE_OPTIONS = Object.freeze([12, 24, 48, 96]);

export const DEFAULT_FOLLOWING_UP_PAGE_SIZE = 24;

export function normalizeFollowingUpPageSize(value) {
  const normalized = Number(value);
  if (FOLLOWING_UP_PAGE_SIZE_OPTIONS.includes(normalized)) {
    return normalized;
  }
  return DEFAULT_FOLLOWING_UP_PAGE_SIZE;
}

export function paginateFollowingUps(records, page = 1, pageSize = DEFAULT_FOLLOWING_UP_PAGE_SIZE) {
  const items = Array.isArray(records) ? records : [];
  const normalizedPageSize = normalizeFollowingUpPageSize(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const normalizedPage = Math.min(
    Math.max(1, Number.isFinite(Number(page)) ? Math.trunc(Number(page)) : 1),
    totalPages
  );
  const start = (normalizedPage - 1) * normalizedPageSize;

  return {
    items: items.slice(start, start + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    totalPages,
  };
}
