import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db, sqlite } from "../db/client.js";
import { folderItems, folders, videos } from "../db/schema.js";

const createFolderSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional()
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional()
});

const reorderFoldersSchema = z.object({
  folderIds: z.array(z.number().int().positive()).min(1)
});

const restoreFolderSchema = z.object({
  restoreVideos: z.boolean().default(true)
});

const listFolderVideosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

function isFolderNameConflict(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const sqliteCode = (error as Error & { code?: string }).code;
  if (sqliteCode === "SQLITE_CONSTRAINT_UNIQUE" || sqliteCode === "SQLITE_CONSTRAINT") {
    return error.message.includes("folders.name") || error.message.includes("folders_name_unique");
  }

  return false;
}

export const folderRoutes: FastifyPluginAsync = async (app) => {
  app.get("/folders", async () => {
    const rows = db
      .select({
        id: folders.id,
        name: folders.name,
        description: folders.description,
        sortOrder: folders.sortOrder,
        deletedAt: folders.deletedAt,
        createdAt: folders.createdAt,
        updatedAt: folders.updatedAt,
        itemCount: count(videos.id)
      })
      .from(folders)
      .leftJoin(folderItems, eq(folderItems.folderId, folders.id))
      .leftJoin(videos, and(eq(videos.id, folderItems.videoId), isNull(videos.deletedAt)))
      .where(isNull(folders.deletedAt))
      .groupBy(folders.id)
      .orderBy(sql`${folders.sortOrder} asc, ${folders.updatedAt} desc`)
      .all();

    return { items: rows };
  });

  app.post("/folders", async (request, reply) => {
    const body = createFolderSchema.parse(request.body);
    const now = Date.now();
    const normalizedName = body.name.trim();

    try {
      const sameNameFolder = db.select().from(folders).where(eq(folders.name, normalizedName)).get();
      if (sameNameFolder) {
        if (sameNameFolder.deletedAt === null) {
          return reply.conflict("Folder name already exists");
        }

        const activeFolderCount = db.select({ value: count() }).from(folders).where(isNull(folders.deletedAt)).get()?.value ?? 0;

        db.update(folders)
          .set({
            description: body.description?.trim() ?? sameNameFolder.description,
            sortOrder: activeFolderCount,
            deletedAt: null,
            updatedAt: now
          })
          .where(eq(folders.id, sameNameFolder.id))
          .run();

        const folderVideoIds = db
          .select({ videoId: folderItems.videoId })
          .from(folderItems)
          .where(eq(folderItems.folderId, sameNameFolder.id))
          .all()
          .map((item) => item.videoId);

        if (folderVideoIds.length > 0) {
          db.update(videos)
            .set({ deletedAt: null, updatedAt: now })
            .where(inArray(videos.id, folderVideoIds))
            .run();
        }

        const restored = db.select().from(folders).where(eq(folders.id, sameNameFolder.id)).get();
        if (!restored) {
          return reply.internalServerError("Create folder failed");
        }

        return reply.code(201).send(restored);
      }

      const result = db
        .insert(folders)
        .values({
          name: normalizedName,
          description: body.description?.trim() ?? null,
          sortOrder: db.select({ value: count() }).from(folders).where(isNull(folders.deletedAt)).get()?.value ?? 0,
          createdAt: now,
          updatedAt: now
        })
        .run();

      const insertedId = Number(result.lastInsertRowid);
      const inserted = db.select().from(folders).where(eq(folders.id, insertedId)).get();

      if (!inserted) {
        return reply.internalServerError("Create folder failed");
      }

      return reply.code(201).send(inserted);
    } catch (error) {
      request.log.error(
        {
          err: error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: error instanceof Error ? (error as Error & { code?: string }).code : undefined
        },
        "Create folder failed"
      );

      if (isFolderNameConflict(error)) {
        return reply.conflict("Folder name already exists");
      }

      return reply.internalServerError("Create folder failed");
    }
  });

  app.patch("/folders/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = updateFolderSchema.parse(request.body);

    if (!body.name && body.description === undefined) {
      return reply.badRequest("At least one field is required");
    }

    const payload: { name?: string; description?: string | null; updatedAt: number } = {
      updatedAt: Date.now()
    };

    if (body.name) payload.name = body.name.trim();
    if (body.description !== undefined) payload.description = body.description?.trim() ?? null;

    try {
      const result = db.update(folders).set(payload).where(eq(folders.id, params.id)).run();

      if (result.changes === 0) {
        return reply.notFound("Folder not found");
      }

      const updated = db.select().from(folders).where(eq(folders.id, params.id)).get();

      if (!updated) {
        return reply.internalServerError("Update folder failed");
      }

      return updated;
    } catch (error) {
      request.log.error(
        {
          err: error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: error instanceof Error ? (error as Error & { code?: string }).code : undefined
        },
        "Update folder failed"
      );

      if (isFolderNameConflict(error)) {
        return reply.conflict("Folder name already exists");
      }

      return reply.internalServerError("Update folder failed");
    }
  });

  app.patch("/folders/order", async (request, reply) => {
    const body = reorderFoldersSchema.parse(request.body);
    const uniqueFolderIds = [...new Set(body.folderIds)];

    const allFolders = db.select({ id: folders.id }).from(folders).where(isNull(folders.deletedAt)).all();
    if (allFolders.length === 0) {
      return { ok: true, orderedIds: [] };
    }

    const existingFolders = db
      .select({ id: folders.id })
      .from(folders)
      .where(and(inArray(folders.id, uniqueFolderIds), isNull(folders.deletedAt)))
      .all();

    if (existingFolders.length !== uniqueFolderIds.length) {
      return reply.badRequest("One or more folders do not exist");
    }

    const existingIdSet = new Set(existingFolders.map((folder) => folder.id));
    const missingFolders = allFolders.filter((folder) => !existingIdSet.has(folder.id)).map((folder) => folder.id);

    const finalOrder = [...uniqueFolderIds, ...missingFolders];
    const now = Date.now();

    const updateSortStmt = sqlite.prepare("UPDATE folders SET sort_order = ?, updated_at = ? WHERE id = ?");
    const tx = sqlite.transaction((ids: number[], timestamp: number) => {
      ids.forEach((folderId, index) => {
        updateSortStmt.run(index, timestamp, folderId);
      });
    });

    tx(finalOrder, now);

    return { ok: true, orderedIds: finalOrder };
  });

  app.delete("/folders/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const now = Date.now();

    try {
      const folder = db.select({ id: folders.id }).from(folders).where(eq(folders.id, params.id)).get();
      if (!folder) {
        return reply.notFound("Folder not found");
      }

      const folderVideoIds = db
        .select({ videoId: folderItems.videoId })
        .from(folderItems)
        .where(eq(folderItems.folderId, params.id))
        .all()
        .map((row) => row.videoId);

      const result = db
        .update(folders)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(folders.id, params.id))
        .run();

      if (result.changes === 0) {
        return reply.notFound("Folder not found");
      }

      if (folderVideoIds.length > 0) {
        db.update(videos)
          .set({ deletedAt: now, updatedAt: now })
          .where(inArray(videos.id, folderVideoIds))
          .run();
      }

      return reply.code(204).send();
    } catch (error) {
      request.log.error(
        {
          err: error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: error instanceof Error ? (error as Error & { code?: string }).code : undefined
        },
        "Delete folder failed"
      );

      return reply.internalServerError("Delete folder failed");
    }
  });

  app.get("/folders/:id/videos", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const query = listFolderVideosQuerySchema.parse(request.query);

    const folder = db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, params.id), isNull(folders.deletedAt)))
      .get();
    if (!folder) {
      return reply.notFound("Folder not found");
    }

    const offset = (query.page - 1) * query.pageSize;

    const rows = sqlite
      .prepare(
        `
        SELECT
          v.id,
          v.bvid,
          v.title,
          v.cover_url AS coverUrl,
          v.uploader,
          v.description,
          v.partition,
          v.publish_at AS publishAt,
          v.bvid_url AS bvidUrl,
          v.is_invalid AS isInvalid,
          fi.added_at AS addedAt,
          group_concat(DISTINCT t.name) AS tagNames
        FROM folder_items fi
        INNER JOIN videos v ON fi.video_id = v.id
        LEFT JOIN video_tags vt ON vt.video_id = v.id
        LEFT JOIN tags t ON t.id = vt.tag_id
        WHERE fi.folder_id = ?
          AND v.deleted_at IS NULL
        GROUP BY v.id, fi.added_at
        ORDER BY fi.added_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(params.id, query.pageSize, offset) as Array<{
      id: number;
      bvid: string;
      title: string;
      coverUrl: string;
      uploader: string;
      description: string;
      partition: string;
      publishAt: number | null;
      bvidUrl: string;
      isInvalid: number;
      addedAt: number;
      tagNames: string | null;
    }>;

    const totalRow = db
      .select({ value: count() })
      .from(folderItems)
      .innerJoin(videos, eq(videos.id, folderItems.videoId))
      .where(and(eq(folderItems.folderId, params.id), isNull(videos.deletedAt)))
      .get();

    return {
      items: rows.map((item) => ({
        ...item,
        isInvalid: Boolean(item.isInvalid),
        tags: item.tagNames ? item.tagNames.split(",") : []
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: totalRow?.value ?? 0
      }
    };
  });

  app.get("/trash/folders", async () => {
    const rows = db
      .select({
        id: folders.id,
        name: folders.name,
        description: folders.description,
        sortOrder: folders.sortOrder,
        deletedAt: folders.deletedAt,
        createdAt: folders.createdAt,
        updatedAt: folders.updatedAt,
        itemCount: count(folderItems.id)
      })
      .from(folders)
      .leftJoin(folderItems, eq(folderItems.folderId, folders.id))
      .where(sql`${folders.deletedAt} IS NOT NULL`)
      .groupBy(folders.id)
      .orderBy(sql`${folders.deletedAt} desc`)
      .all();

    return { items: rows };
  });

  app.post("/trash/folders/:id/restore", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const body = restoreFolderSchema.parse(request.body ?? {});
    const now = Date.now();

    const folder = db.select().from(folders).where(eq(folders.id, params.id)).get();
    if (!folder || folder.deletedAt === null) {
      return reply.notFound("Folder not found in trash");
    }

    const result = db
      .update(folders)
      .set({ deletedAt: null, updatedAt: now })
      .where(eq(folders.id, params.id))
      .run();

    if (result.changes === 0) {
      return reply.notFound("Folder not found in trash");
    }

    if (body.restoreVideos) {
      const folderVideoIds = db
        .select({ videoId: folderItems.videoId })
        .from(folderItems)
        .where(eq(folderItems.folderId, params.id))
        .all()
        .map((row) => row.videoId);

      if (folderVideoIds.length > 0) {
        db.update(videos)
          .set({ deletedAt: null, updatedAt: now })
          .where(inArray(videos.id, folderVideoIds))
          .run();
      }
    }

    return { ok: true };
  });

  app.delete("/trash/folders/:id", async (request, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);

    const folder = db.select().from(folders).where(eq(folders.id, params.id)).get();
    if (!folder || folder.deletedAt === null) {
      return reply.notFound("Folder not found in trash");
    }

    db.delete(folders).where(eq(folders.id, params.id)).run();
    return reply.code(204).send();
  });
};
