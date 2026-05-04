import { normalizeBiliSpaceUrl } from "./library-export.js";

function normalizeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizeUid(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function normalizeAvatarUrl(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return "";
  const candidate = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^https?:\/\//i.test(trimmed)
      ? trimmed
      : "";
  if (!candidate) return "";

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeFollowedUpRecord(input = {}) {
  const uid = normalizeUid(
    input.uid ??
      input.mid ??
      input.id
  );
  const name = normalizeText(
    input.name ??
      input.uname ??
      input.username
  );
  if (!uid || !name) return null;

  return {
    uid,
    name,
    avatarUrl: normalizeAvatarUrl(
      input.avatarUrl ??
        input.face ??
        input.avatar
    ),
    spaceUrl: normalizeBiliSpaceUrl(
      input.spaceUrl ??
        input.href ??
        uid
    ) || `https://space.bilibili.com/${uid}`,
  };
}

function mergeFollowedUpRecords(existingRecords, importedRecords, nowTs) {
  const existing = Array.isArray(existingRecords) ? existingRecords : [];
  const imported = Array.isArray(importedRecords) ? importedRecords : [];
  const byUid = new Map(existing.map((item) => [item.uid, item]));
  const seenImportedUid = new Set();
  let created = 0;
  let updated = 0;

  const mergedImported = imported
    .map((record, index) => {
      if (!record || !record.uid || seenImportedUid.has(record.uid)) return null;
      seenImportedUid.add(record.uid);

      const current = byUid.get(record.uid);
      if (!current) {
        created += 1;
        return {
          uid: record.uid,
          name: record.name,
          avatarUrl: record.avatarUrl || "",
          spaceUrl: record.spaceUrl,
          sortOrder: index,
          importedAt: nowTs,
          updatedAt: nowTs,
        };
      }

      const changed =
        current.name !== record.name ||
        current.avatarUrl !== (record.avatarUrl || "") ||
        current.spaceUrl !== record.spaceUrl ||
        current.sortOrder !== index;

      if (changed) updated += 1;

      return {
        ...current,
        name: record.name,
        avatarUrl: record.avatarUrl || "",
        spaceUrl: record.spaceUrl,
        sortOrder: index,
        updatedAt: changed ? nowTs : current.updatedAt,
      };
    })
    .filter(Boolean);

  const mergedExisting = existing
    .filter((item) => !seenImportedUid.has(item.uid))
    .map((item) => ({ ...item }));

  return {
    records: [...mergedImported, ...mergedExisting],
    created,
    updated,
  };
}

function searchFollowedUps(records, keyword) {
  const normalizedKeyword = normalizeText(keyword).toLocaleLowerCase();
  const list = Array.isArray(records) ? records : [];
  if (!normalizedKeyword) return list;
  return list.filter((item) => {
    const name = normalizeText(item?.name).toLocaleLowerCase();
    const uid = normalizeText(item?.uid).toLocaleLowerCase();
    return name.includes(normalizedKeyword) || uid.includes(normalizedKeyword);
  });
}

export {
  mergeFollowedUpRecords,
  normalizeFollowedUpRecord,
  searchFollowedUps,
};
