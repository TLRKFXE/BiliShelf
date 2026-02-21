import { and, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, sqlite } from "../db/client.js";
import { folderItems, folders, tags, videoTags, videos } from "../db/schema.js";

const BLOCKED_SYSTEM_TAGS = new Set(["uncategorized", "未分类"]);
const BILI_ORIGIN = "https://www.bilibili.com";

const upsertVideoSchema = z.object({
  bvid: z.string().min(3).max(32),
  title: z.string().min(1).max(200),
  coverUrl: z.string().url(),
  uploader: z.string().min(1).max(80),
  uploaderSpaceUrl: z.string().trim().url().nullable().optional(),
  description: z.string().max(5000).default(""),
  partition: z.string().min(1).max(50).optional(),
  publishAt: z.number().int().nullable().optional(),
  bvidUrl: z.string().url(),
  isInvalid: z.boolean().optional(),
  folderIds: z.array(z.number().int().positive()).default([]),
  customTags: z.array(z.string().min(1).max(40)).default([]),
  systemTags: z.array(z.string().min(1).max(40)).default([])
});

const patchVideoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    coverUrl: z.string().trim().url().optional(),
    uploader: z.string().trim().min(1).max(80).optional(),
    uploaderSpaceUrl: z.string().trim().url().nullable().optional(),
    description: z.string().trim().max(5000).optional(),
    publishAt: z.number().int().nullable().optional(),
    bvidUrl: z.string().trim().url().optional(),
    isInvalid: z.boolean().optional(),
    customTags: z.array(z.string().trim().min(1).max(40)).optional(),
    systemTags: z.array(z.string().trim().min(1).max(40)).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required"
  });

const listVideosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.coerce.number().int().positive().optional(),
  tags: z
    .union([z.string().trim(), z.array(z.string().trim())])
    .optional()
    .transform((value) => {
      if (!value) return [] as string[];
      return Array.isArray(value)
        ? value.filter(Boolean)
        : value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  uploader: z.string().trim().optional(),
  customTag: z.string().trim().optional(),
  systemTag: z.string().trim().optional(),
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
  sortBy: z.enum(["addedAt", "updatedAt", "publishAt", "title", "uploader"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

const addTagSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(["system", "custom"]).default("custom")
});

const batchActionSchema = z.object({
  videoIds: z.array(z.number().int().positive()).min(1),
  folderId: z.number().int().positive(),
  mode: z.enum(["move", "copy"])
});

const batchDeleteSchema = z.object({
  videoIds: z.array(z.number().int().positive()).min(1),
  mode: z.enum(["folderOnly", "global"]).default("folderOnly"),
  folderId: z.number().int().positive().optional()
});

type BaseVideoRow = {
  id: number;
  bvid: string;
  title: string;
  coverUrl: string;
  uploader: string;
  uploaderSpaceUrl: string | null;
  description: string;
  partition: string;
  publishAt: number | null;
  bvidUrl: string;
  isInvalid: boolean | number;
  createdAt?: number;
  updatedAt?: number;
  addedAt?: number;
};

function normalizeTags(input: string[]) {
  return [...new Set(input.map((item) => item.trim()).filter(Boolean))];
}

function normalizeCoverUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" && /(^|\.)hdslb\.com$/i.test(url.hostname)) {
      url.protocol = "https:";
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

function normalizeBiliVideoUrl(value: string, bvidFallback?: string) {
  const raw = value.trim();
  const fallbackBvid = (bvidFallback || "").trim();
  const fallback = fallbackBvid ? `${BILI_ORIGIN}/video/${fallbackBvid}/` : "";

  if (!raw) return fallback;

  const appSchemeMatch = raw.match(/^bilibili:\/\/video\/([^/?#]+)/i);
  if (appSchemeMatch) {
    const token = (appSchemeMatch[1] || "").trim();
    if (/^BV[0-9A-Za-z]+$/i.test(token)) return `${BILI_ORIGIN}/video/${token}/`;
    if (fallback) return fallback;
    if (/^\d+$/.test(token)) return `${BILI_ORIGIN}/video/av${token}/`;
    return `${BILI_ORIGIN}/video/${token}/`;
  }

  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/video/")) return `${BILI_ORIGIN}${raw}`;
  if (/^video\//i.test(raw)) return `${BILI_ORIGIN}/${raw}`;
  if (/^BV[0-9A-Za-z]+$/i.test(raw)) return `${BILI_ORIGIN}/video/${raw}/`;
  if (/^av\d+$/i.test(raw)) return `${BILI_ORIGIN}/video/${raw}/`;
  if (/^\d+$/.test(raw)) return fallback || `${BILI_ORIGIN}/video/av${raw}/`;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  if (/^https?:\/\//i.test(raw)) return raw;

  return fallback || raw;
}

function normalizeBiliSpaceUrl(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return `${BILI_ORIGIN}/space/${raw}`;
  if (raw.startsWith("//")) return `https:${raw}`;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeOutputBvid(value: string) {
  const copyMarker = "__copy__";
  const markerIndex = value.indexOf(copyMarker);
  if (markerIndex < 0) return value;
  return value.slice(0, markerIndex);
}

function normalizeVideoRows(rows: BaseVideoRow[]) {
  return rows.map((row) => ({
    ...row,
    bvid: normalizeOutputBvid(row.bvid),
    isInvalid: Boolean(row.isInvalid)
  }));
}

function enrichVideoTags<T extends { id: number }>(rows: T[]) {
  if (rows.length === 0) {
    return rows.map((row) => ({
      ...row,
      tags: [] as string[],
      customTags: [] as string[],
      systemTags: [] as string[]
    }));
  }

  const videoIds = [...new Set(rows.map((row) => row.id))];

  const tagRows = db
    .select({
      videoId: videoTags.videoId,
      name: tags.name,
      type: tags.type
    })
    .from(videoTags)
    .innerJoin(tags, eq(tags.id, videoTags.tagId))
    .where(inArray(videoTags.videoId, videoIds))
    .all();

  const tagMap = new Map<number, { tags: string[]; customTags: string[]; systemTags: string[] }>();

  for (const tagRow of tagRows) {
    if (!tagMap.has(tagRow.videoId)) {
      tagMap.set(tagRow.videoId, { tags: [], customTags: [], systemTags: [] });
    }

    const target = tagMap.get(tagRow.videoId);
    if (!target) continue;

    target.tags.push(tagRow.name);
    if (tagRow.type === "custom") {
      target.customTags.push(tagRow.name);
    } else {
      target.systemTags.push(tagRow.name);
    }
  }

  return rows.map((row) => {
    const tagInfo = tagMap.get(row.id);
    return {
      ...row,
      tags: tagInfo?.tags ?? [],
      customTags: tagInfo?.customTags ?? [],
      systemTags: tagInfo?.systemTags ?? []
    };
  });
}

function applyTagFilters<
  T extends {
    tags?: string[];
    customTags?: string[];
    systemTags?: string[];
  }
>(
  rows: T[],
  options: {
    exactTags?: string[];
    customTagKeyword?: string;
    systemTagKeyword?: string;
  }
) {
  const requiredExact = (options.exactTags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const customKeyword = (options.customTagKeyword ?? "").trim().toLowerCase();
  const systemKeyword = (options.systemTagKeyword ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    const allTags = (row.tags ?? []).map((tag) => tag.toLowerCase());
    const customTags = (row.customTags ?? []).map((tag) => tag.toLowerCase());
    const systemTags = (row.systemTags ?? []).map((tag) => tag.toLowerCase());

    if (
      requiredExact.length > 0 &&
      !requiredExact.every((tag) => allTags.includes(tag))
    ) {
      return false;
    }

    if (
      customKeyword &&
      !customTags.some((tag) => tag.includes(customKeyword))
    ) {
      return false;
    }

    if (
      systemKeyword &&
      !systemTags.some((tag) => tag.includes(systemKeyword))
    ) {
      return false;
    }

    return true;
  });
}

export const videoRoutes: FastifyPluginAsync = async (app) => {
  app.post("/videos", async (request, reply) => {
    const body = upsertVideoSchema.parse(request.body);
    const now = Date.now();
    const normalizedCoverUrl = normalizeCoverUrl(body.coverUrl);
    const normalizedBvidUrl = normalizeBiliVideoUrl(body.bvidUrl, body.bvid);
    const normalizedUploaderSpaceUrl = normalizeBiliSpaceUrl(body.uploaderSpaceUrl);
    const partitionValue = body.partition?.trim() || "uncategorized";

    const folderIds = [...new Set(body.folderIds)];
    if (folderIds.length > 0) {
      const folderRows = db
        .select({ id: folders.id })
        .from(folders)
        .where(and(inArray(folders.id, folderIds), isNull(folders.deletedAt)))
        .all();
      if (folderRows.length !== folderIds.length) {
        return reply.badRequest("One or more folders do not exist");
      }
    }

    const customTags = normalizeTags(body.customTags);
    const systemTags = normalizeTags(body.systemTags).filter((tagName) => !BLOCKED_SYSTEM_TAGS.has(tagName));

    const existing = db.select({ id: videos.id, deletedAt: videos.deletedAt }).from(videos).where(eq(videos.bvid, body.bvid)).get();

    let videoId: number;
    if (existing) {
      videoId = existing.id;

      db.update(videos)
        .set({
          title: body.title,
          coverUrl: normalizedCoverUrl,
          uploader: body.uploader,
          uploaderSpaceUrl: normalizedUploaderSpaceUrl,
          description: body.description,
          partition: partitionValue,
          publishAt: body.publishAt ?? null,
          bvidUrl: normalizedBvidUrl,
          isInvalid: body.isInvalid ?? false,
          deletedAt: null,
          updatedAt: now
        })
        .where(eq(videos.id, videoId))
        .run();
    } else {
      const result = db
        .insert(videos)
        .values({
          bvid: body.bvid,
          title: body.title,
          coverUrl: normalizedCoverUrl,
          uploader: body.uploader,
          uploaderSpaceUrl: normalizedUploaderSpaceUrl,
          description: body.description,
          partition: partitionValue,
          publishAt: body.publishAt ?? null,
          bvidUrl: normalizedBvidUrl,
          isInvalid: body.isInvalid ?? false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now
        })
        .run();

      videoId = Number(result.lastInsertRowid);
    }

    for (const folderId of folderIds) {
      db.insert(folderItems)
        .values({ folderId, videoId, addedAt: now })
        .onConflictDoNothing()
        .run();
    }

    for (const tagName of customTags) {
      db.insert(tags)
        .values({ name: tagName, type: "custom", createdAt: now })
        .onConflictDoNothing()
        .run();
    }

    for (const tagName of systemTags) {
      db.insert(tags)
        .values({ name: tagName, type: "system", createdAt: now })
        .onConflictDoNothing()
        .run();
    }

    const allTags = [...customTags, ...systemTags];
    if (allTags.length > 0) {
      const matchedTags = db.select({ id: tags.id }).from(tags).where(inArray(tags.name, allTags)).all();
      for (const tag of matchedTags) {
        db.insert(videoTags)
          .values({ videoId, tagId: tag.id })
          .onConflictDoNothing()
          .run();
      }
    }

    const saved = db.select().from(videos).where(eq(videos.id, videoId)).get();
    const normalizedSaved = saved ? normalizeVideoRows([saved as BaseVideoRow])[0] : null;
    return reply.code(existing ? 200 : 201).send(normalizedSaved);
  });

  app.patch("/videos/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = patchVideoSchema.parse(request.body ?? {});

    const existed = db
      .select({ id: videos.id })
      .from(videos)
      .where(and(eq(videos.id, params.id), isNull(videos.deletedAt)))
      .get();
    if (!existed) {
      return reply.notFound("Video not found");
    }

    const payload: Partial<typeof videos.$inferInsert> = {
      updatedAt: Date.now()
    };

    if (body.title !== undefined) payload.title = body.title;
    if (body.coverUrl !== undefined) payload.coverUrl = normalizeCoverUrl(body.coverUrl);
    if (body.uploader !== undefined) payload.uploader = body.uploader;
    if (body.uploaderSpaceUrl !== undefined) {
      payload.uploaderSpaceUrl = normalizeBiliSpaceUrl(body.uploaderSpaceUrl);
    }
    if (body.description !== undefined) payload.description = body.description;
    if (body.publishAt !== undefined) payload.publishAt = body.publishAt;
    if (body.bvidUrl !== undefined) payload.bvidUrl = normalizeBiliVideoUrl(body.bvidUrl);
    if (body.isInvalid !== undefined) payload.isInvalid = body.isInvalid;

    db.update(videos).set(payload).where(eq(videos.id, params.id)).run();

    const ensureTagIdForPatch = (tagName: string, type: "system" | "custom") => {
      const normalizedName = tagName.trim();
      if (!normalizedName) return null;

      const now = Date.now();
      let found = db
        .select({ id: tags.id, archivedAt: tags.archivedAt })
        .from(tags)
        .where(eq(tags.name, normalizedName))
        .get();

      if (!found) {
        db.insert(tags)
          .values({
            name: normalizedName,
            type,
            createdAt: now,
            archivedAt: null
          })
          .onConflictDoNothing()
          .run();

        found = db
          .select({ id: tags.id, archivedAt: tags.archivedAt })
          .from(tags)
          .where(eq(tags.name, normalizedName))
          .get();
      } else if (found.archivedAt !== null) {
        db.update(tags).set({ archivedAt: null }).where(eq(tags.id, found.id)).run();
      }

      return found?.id ?? null;
    };

    if (body.customTags !== undefined) {
      const customTagIds = db
        .select({ tagId: videoTags.tagId })
        .from(videoTags)
        .innerJoin(tags, eq(tags.id, videoTags.tagId))
        .where(and(eq(videoTags.videoId, params.id), eq(tags.type, "custom")))
        .all()
        .map((row) => row.tagId);

      if (customTagIds.length > 0) {
        db.delete(videoTags)
          .where(and(eq(videoTags.videoId, params.id), inArray(videoTags.tagId, customTagIds)))
          .run();
      }

      const normalizedCustomTags = normalizeTags(body.customTags);
      for (const tagName of normalizedCustomTags) {
        const tagId = ensureTagIdForPatch(tagName, "custom");
        if (!tagId) continue;
        db.insert(videoTags).values({ videoId: params.id, tagId }).onConflictDoNothing().run();
      }
    }

    if (body.systemTags !== undefined) {
      const systemTagIds = db
        .select({ tagId: videoTags.tagId })
        .from(videoTags)
        .innerJoin(tags, eq(tags.id, videoTags.tagId))
        .where(and(eq(videoTags.videoId, params.id), eq(tags.type, "system")))
        .all()
        .map((row) => row.tagId);

      if (systemTagIds.length > 0) {
        db.delete(videoTags)
          .where(and(eq(videoTags.videoId, params.id), inArray(videoTags.tagId, systemTagIds)))
          .run();
      }

      const normalizedSystemTags = normalizeTags(body.systemTags).filter(
        (tagName) => !BLOCKED_SYSTEM_TAGS.has(tagName.toLowerCase())
      );
      for (const tagName of normalizedSystemTags) {
        const tagId = ensureTagIdForPatch(tagName, "system");
        if (!tagId) continue;
        db.insert(videoTags).values({ videoId: params.id, tagId }).onConflictDoNothing().run();
      }
    }

    const updated = db.select().from(videos).where(eq(videos.id, params.id)).get();
    const normalized = updated ? normalizeVideoRows([updated as BaseVideoRow])[0] : null;
    return normalized;
  });

  app.get("/videos", async (request) => {
    const query = listVideosQuerySchema.parse(request.query);
    const offset = (query.page - 1) * query.pageSize;

    const exactTagFilterNames = [...query.tags].filter(Boolean) as string[];
    let tagFilteredIds: number[] | null = null;

    if (exactTagFilterNames.length > 0) {
      const tagRows = db
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.name, exactTagFilterNames))
        .all();

      if (tagRows.length < exactTagFilterNames.length) {
        return {
          items: [],
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total: 0
          }
        };
      }

      const tagRowsByVideo = db
        .select({ videoId: videoTags.videoId, tagId: videoTags.tagId })
        .from(videoTags)
        .where(inArray(videoTags.tagId, tagRows.map((item) => item.id)))
        .all();

      const expectedTagCount = tagRows.length;
      const counts = new Map<number, Set<number>>();
      for (const row of tagRowsByVideo) {
        if (!counts.has(row.videoId)) {
          counts.set(row.videoId, new Set<number>());
        }
        counts.get(row.videoId)?.add(row.tagId);
      }

      tagFilteredIds = [...counts.entries()]
        .filter(([, set]) => set.size >= expectedTagCount)
        .map(([videoId]) => videoId);

      if (tagFilteredIds.length === 0) {
        return {
          items: [],
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total: 0
          }
        };
      }
    }

    if (query.folderId) {
      const rows = db
        .select({
          id: videos.id,
          bvid: videos.bvid,
          title: videos.title,
          coverUrl: videos.coverUrl,
          uploader: videos.uploader,
          uploaderSpaceUrl: videos.uploaderSpaceUrl,
          description: videos.description,
          partition: videos.partition,
          publishAt: videos.publishAt,
          bvidUrl: videos.bvidUrl,
          isInvalid: videos.isInvalid,
          createdAt: videos.createdAt,
          updatedAt: videos.updatedAt,
          addedAt: folderItems.addedAt
        })
        .from(folderItems)
        .innerJoin(videos, eq(videos.id, folderItems.videoId))
        .where(
          and(
            eq(folderItems.folderId, query.folderId),
            isNull(videos.deletedAt),
            query.title ? like(videos.title, `%${query.title}%`) : undefined,
            query.description ? like(videos.description, `%${query.description}%`) : undefined,
            query.uploader ? like(videos.uploader, `%${query.uploader}%`) : undefined,
            query.from ? sql`${folderItems.addedAt} >= ${query.from}` : undefined,
            query.to ? sql`${folderItems.addedAt} <= ${query.to}` : undefined,
            tagFilteredIds && tagFilteredIds.length > 0 ? inArray(videos.id, tagFilteredIds) : undefined
          )
        )
        .orderBy(query.sortOrder === "asc" ? sql`${folderItems.addedAt} asc` : sql`${folderItems.addedAt} desc`)
        .all() as BaseVideoRow[];

      const enriched = applyTagFilters(
        enrichVideoTags(normalizeVideoRows(rows)),
        {
          exactTags: query.tags,
          customTagKeyword: query.customTag,
          systemTagKeyword: query.systemTag
        }
      );
      const pagedItems = enriched.slice(offset, offset + query.pageSize);

      return {
        items: pagedItems.map((item) => ({
          ...item,
          publishAt: item.addedAt
        })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: enriched.length
        }
      };
    }

    const rows = db
      .select()
      .from(videos)
      .where(
        and(
          isNull(videos.deletedAt),
          query.title ? like(videos.title, `%${query.title}%`) : undefined,
          query.description ? like(videos.description, `%${query.description}%`) : undefined,
          query.uploader ? like(videos.uploader, `%${query.uploader}%`) : undefined,
          query.from ? sql`${videos.publishAt} >= ${query.from}` : undefined,
          query.to ? sql`${videos.publishAt} <= ${query.to}` : undefined,
          tagFilteredIds && tagFilteredIds.length > 0 ? inArray(videos.id, tagFilteredIds) : undefined
        )
      )
      .orderBy(desc(videos.updatedAt))
      .all() as BaseVideoRow[];

    const enriched = applyTagFilters(
      enrichVideoTags(normalizeVideoRows(rows)),
      {
        exactTags: query.tags,
        customTagKeyword: query.customTag,
        systemTagKeyword: query.systemTag
      }
    );
    const pagedItems = enriched.slice(offset, offset + query.pageSize);

    return {
      items: pagedItems,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: enriched.length
      }
    };
  });

  app.get("/videos/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const video = db.select().from(videos).where(eq(videos.id, params.id)).get();

    if (!video || video.deletedAt !== null) {
      return reply.notFound("Video not found");
    }

    const folderRows = db
      .select({ id: folders.id, name: folders.name })
      .from(folderItems)
      .innerJoin(folders, eq(folders.id, folderItems.folderId))
      .where(eq(folderItems.videoId, params.id))
      .all();

    const tagRows = db
      .select({ id: tags.id, name: tags.name, type: tags.type })
      .from(videoTags)
      .innerJoin(tags, eq(tags.id, videoTags.tagId))
      .where(eq(videoTags.videoId, params.id))
      .all();

    return {
      ...video,
      bvid: normalizeOutputBvid(video.bvid),
      folders: folderRows,
      tags: tagRows,
      customTags: tagRows.filter((tag) => tag.type === "custom").map((tag) => tag.name),
      systemTags: tagRows.filter((tag) => tag.type === "system").map((tag) => tag.name)
    };
  });

  app.delete("/videos/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const now = Date.now();
    const deleted = db
      .update(videos)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(videos.id, params.id), isNull(videos.deletedAt)))
      .run();

    if (deleted.changes === 0) {
      return reply.notFound("Video not found");
    }

    return reply.code(204).send();
  });

  app.post("/videos/batch/folders", async (request, reply) => {
    const body = batchActionSchema.parse(request.body);
    const now = Date.now();

    const existingFolder = db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, body.folderId), isNull(folders.deletedAt)))
      .get();
    if (!existingFolder) {
      return reply.notFound("Folder not found");
    }

    if (body.mode === "move") {
      const sourceFolderId = z.coerce.number().int().positive().parse((request.query as { sourceFolderId?: string }).sourceFolderId);

      db.delete(folderItems)
        .where(and(eq(folderItems.folderId, sourceFolderId), inArray(folderItems.videoId, body.videoIds)))
        .run();

      for (const videoId of body.videoIds) {
        db.insert(folderItems)
          .values({ folderId: body.folderId, videoId, addedAt: now })
          .onConflictDoNothing()
          .run();
      }

      return { ok: true, affected: body.videoIds.length };
    }

    let copiedCount = 0;
    for (const sourceVideoId of body.videoIds) {
      const sourceVideo = db
        .select()
        .from(videos)
        .where(and(eq(videos.id, sourceVideoId), isNull(videos.deletedAt)))
        .get();
      if (!sourceVideo) continue;

      const cloneSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const copiedBvid = `${normalizeOutputBvid(sourceVideo.bvid)}__copy__${cloneSuffix}`;
      const inserted = db
        .insert(videos)
        .values({
          bvid: copiedBvid,
          title: sourceVideo.title,
          coverUrl: sourceVideo.coverUrl,
          uploader: sourceVideo.uploader,
          uploaderSpaceUrl: sourceVideo.uploaderSpaceUrl,
          description: sourceVideo.description,
          partition: sourceVideo.partition,
          publishAt: sourceVideo.publishAt,
          bvidUrl: sourceVideo.bvidUrl,
          isInvalid: sourceVideo.isInvalid,
          deletedAt: null,
          createdAt: now,
          updatedAt: now
        })
        .run();

      const copiedVideoId = Number(inserted.lastInsertRowid);
      db.insert(folderItems)
        .values({ folderId: body.folderId, videoId: copiedVideoId, addedAt: now })
        .onConflictDoNothing()
        .run();

      const sourceTagRows = db
        .select({ tagId: videoTags.tagId })
        .from(videoTags)
        .where(eq(videoTags.videoId, sourceVideoId))
        .all();
      for (const tagRow of sourceTagRows) {
        db.insert(videoTags)
          .values({ videoId: copiedVideoId, tagId: tagRow.tagId })
          .onConflictDoNothing()
          .run();
      }

      copiedCount += 1;
    }

    return { ok: true, affected: copiedCount };
  });

  app.post("/videos/batch/delete", async (request, reply) => {
    const body = batchDeleteSchema.parse(request.body);

    if (body.mode === "global") {
      db.update(videos)
        .set({ deletedAt: Date.now(), updatedAt: Date.now() })
        .where(and(inArray(videos.id, body.videoIds), isNull(videos.deletedAt)))
        .run();
      return { ok: true, affected: body.videoIds.length };
    }

    if (!body.folderId) {
      return reply.badRequest("folderId is required when mode=folderOnly");
    }

    const currentFolderRows = db
      .select({ videoId: folderItems.videoId })
      .from(folderItems)
      .where(and(eq(folderItems.folderId, body.folderId), inArray(folderItems.videoId, body.videoIds)))
      .all();
    const scopedVideoIds = [...new Set(currentFolderRows.map((row) => row.videoId))];

    if (scopedVideoIds.length === 0) {
      return { ok: true, affected: 0 };
    }

    const allFolderRows = db
      .select({ videoId: folderItems.videoId })
      .from(folderItems)
      .where(inArray(folderItems.videoId, scopedVideoIds))
      .all();
    const folderCountByVideo = new Map<number, number>();
    for (const row of allFolderRows) {
      folderCountByVideo.set(
        row.videoId,
        (folderCountByVideo.get(row.videoId) ?? 0) + 1
      );
    }

    const toSoftDelete = scopedVideoIds.filter(
      (videoId) => (folderCountByVideo.get(videoId) ?? 0) <= 1
    );
    const toDetachOnly = scopedVideoIds.filter(
      (videoId) => (folderCountByVideo.get(videoId) ?? 0) > 1
    );

    if (toSoftDelete.length > 0) {
      const now = Date.now();
      db.update(videos)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(videos.id, toSoftDelete), isNull(videos.deletedAt)))
        .run();
    }

    if (toDetachOnly.length > 0) {
      db.delete(folderItems)
        .where(and(eq(folderItems.folderId, body.folderId), inArray(folderItems.videoId, toDetachOnly)))
        .run();
    }

    return { ok: true, affected: scopedVideoIds.length };
  });

  app.post("/videos/:id/folders/:folderId", async (request, reply) => {
    const params = z
      .object({ id: z.coerce.number().int().positive(), folderId: z.coerce.number().int().positive() })
      .parse(request.params);

    const video = db.select({ id: videos.id }).from(videos).where(eq(videos.id, params.id)).get();
    if (!video) {
      return reply.notFound("Video not found");
    }

    const folder = db.select({ id: folders.id }).from(folders).where(eq(folders.id, params.folderId)).get();
    if (!folder) {
      return reply.notFound("Folder not found");
    }

    db.insert(folderItems)
      .values({ folderId: params.folderId, videoId: params.id, addedAt: Date.now() })
      .onConflictDoNothing()
      .run();

    return reply.code(201).send({ ok: true });
  });

  app.delete("/videos/:id/folders/:folderId", async (request, reply) => {
    const params = z
      .object({ id: z.coerce.number().int().positive(), folderId: z.coerce.number().int().positive() })
      .parse(request.params);

    db.delete(folderItems)
      .where(and(eq(folderItems.videoId, params.id), eq(folderItems.folderId, params.folderId)))
      .run();

    return reply.code(204).send();
  });

  app.post("/videos/:id/tags", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = addTagSchema.parse(request.body);

    const video = db.select({ id: videos.id }).from(videos).where(eq(videos.id, params.id)).get();
    if (!video) {
      return reply.notFound("Video not found");
    }

    db.insert(tags)
      .values({ name: body.name.trim(), type: body.type, createdAt: Date.now() })
      .onConflictDoNothing()
      .run();

    const matched = db.select({ id: tags.id }).from(tags).where(eq(tags.name, body.name.trim())).get();
    if (!matched) {
      return reply.badRequest("Tag create failed");
    }

    db.insert(videoTags)
      .values({ videoId: params.id, tagId: matched.id })
      .onConflictDoNothing()
      .run();

    return reply.code(201).send({ ok: true });
  });

  app.delete("/videos/:id/tags/:tagId", async (request, reply) => {
    const params = z
      .object({ id: z.coerce.number().int().positive(), tagId: z.coerce.number().int().positive() })
      .parse(request.params);

    db.delete(videoTags)
      .where(and(eq(videoTags.videoId, params.id), eq(videoTags.tagId, params.tagId)))
      .run();

    return reply.code(204).send();
  });

  app.get("/videos/search", async (request) => {
    const query = z
      .object({
        q: z.string().trim().min(1),
        folderId: z.coerce.number().int().positive().optional(),
        tags: z
          .union([z.string().trim(), z.array(z.string().trim())])
          .optional()
          .transform((value) => {
            if (!value) return [] as string[];
            return Array.isArray(value)
              ? value.filter(Boolean)
              : value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);
          }),
        uploader: z.string().trim().optional(),
        title: z.string().trim().optional(),
        description: z.string().trim().optional(),
        customTag: z.string().trim().optional(),
        systemTag: z.string().trim().optional(),
        from: z.coerce.number().int().optional(),
        to: z.coerce.number().int().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20)
      })
      .parse(request.query);

    const offset = (query.page - 1) * query.pageSize;

    const whereConditions = [
      isNull(videos.deletedAt),
      query.title ? like(videos.title, `%${query.title}%`) : undefined,
      query.description ? like(videos.description, `%${query.description}%`) : undefined,
      query.uploader ? like(videos.uploader, `%${query.uploader}%`) : undefined,
      query.from ? sql`${videos.publishAt} >= ${query.from}` : undefined,
      query.to ? sql`${videos.publishAt} <= ${query.to}` : undefined
    ].filter(Boolean);

    let rows = db
      .select()
      .from(videos)
      .where(and(...(whereConditions as Parameters<typeof and>)))
      .orderBy(desc(videos.updatedAt))
      .all() as BaseVideoRow[];

    if (query.folderId) {
      const folderVideoIds = db
        .select({ videoId: folderItems.videoId })
        .from(folderItems)
        .where(eq(folderItems.folderId, query.folderId))
        .all()
        .map((item) => item.videoId);
      const folderSet = new Set(folderVideoIds);
      rows = rows.filter((row) => folderSet.has(row.id));
    }

    let enriched = applyTagFilters(
      enrichVideoTags(normalizeVideoRows(rows)),
      {
        exactTags: query.tags,
        customTagKeyword: query.customTag,
        systemTagKeyword: query.systemTag
      }
    );

    const normalizedQuery = query.q.trim().toLowerCase();
    if (normalizedQuery) {
      enriched = enriched.filter((row) => {
        const titleMatched = row.title.toLowerCase().includes(normalizedQuery);
        if (titleMatched) return true;

        return (row.tags ?? []).some((tagName) => tagName.toLowerCase().includes(normalizedQuery));
      });
    }

    const pagedItems = enriched.slice(offset, offset + query.pageSize);

    return {
      items: pagedItems,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: enriched.length
      }
    };
  });

  app.get("/trash/videos", async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(30)
      })
      .parse(request.query);

    const offset = (query.page - 1) * query.pageSize;

    const rows = db
      .select()
      .from(videos)
      .where(sql`${videos.deletedAt} IS NOT NULL`)
      .orderBy(sql`${videos.deletedAt} desc`)
      .limit(query.pageSize)
      .offset(offset)
      .all() as BaseVideoRow[];

    const totalRow = db
      .select({ value: count() })
      .from(videos)
      .where(sql`${videos.deletedAt} IS NOT NULL`)
      .get();

    return {
      items: normalizeVideoRows(rows),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: totalRow?.value ?? 0
      }
    };
  });

  app.post("/trash/videos/:id/restore", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const now = Date.now();

    const result = db
      .update(videos)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(videos.id, params.id), sql`${videos.deletedAt} IS NOT NULL`))
      .run();

    if (result.changes === 0) {
      return reply.notFound("Video not found in trash");
    }

    return { ok: true };
  });

  app.delete("/trash/videos/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const video = db.select().from(videos).where(eq(videos.id, params.id)).get();
    if (!video || video.deletedAt === null) {
      return reply.notFound("Video not found in trash");
    }

    db.delete(videos).where(eq(videos.id, params.id)).run();
    return reply.code(204).send();
  });
};

